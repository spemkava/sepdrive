import {Component, OnDestroy, OnInit, ViewChild, TemplateRef} from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import * as L from 'leaflet';
import {Subscription, interval, BehaviorSubject} from 'rxjs';
import { RouteUpdate } from '../../models/route-update.model';
import { RideService } from '../../services/Ride.service';
import { RideRequestService } from '../../services/RideRequest.service';
import { SimulationSocketService } from '../../services/simulation-socket.service';
import { WorkingChatComponent } from '../working-chat/working-chat.component';
import {LatLng, LatLngExpression, LatLngLiteral} from 'leaflet';
import {MapVisualizerComponent} from '../MapVisualizer/MapVisualizer.component';
import {GeocodingService} from "../../services/Geocoding.service";
import {CoordinateDto} from "../../models/coordinate.model"; // GEÄNDERT

interface WaypointWithMode {
  lat: number;
  lon: number;
  inputMode: 'Coordinates' | 'Address';
  searchQuery?: string;
  searchResults?: any[];
  originalAddress?: string;
}

// Leaflet Icon Fix
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'assets/markers/default_marker.png',
  iconUrl: 'assets/markers/default_marker.png',
  shadowUrl: 'assets/markers/marker-shadow.png'
});

@Component({
  selector: 'app-ride-execution',
  standalone: true,
  imports: [CommonModule, FormsModule, WorkingChatComponent, MapVisualizerComponent], // GEÄNDERT
  templateUrl: './ride-execution.component.html',
  styleUrls: ['./ride-execution.component.scss']
})
export class RideExecutionComponent implements OnInit, OnDestroy {

  @ViewChild(MapVisualizerComponent) mapVisualizer!: MapVisualizerComponent;
  @ViewChild('noRequest') noRequest!: TemplateRef<any>;

  private map: L.Map | undefined;
  private route: L.LatLng[] = [];
  private marker: L.Marker | undefined;

  public rideId: number | null = null;
  public isRunning = false;
  public simulationFinished = false;
  public noActiveRequestError = false;

  public simulationDurationSec = 10;
  public elapsedMs = 0;
  private currentIndex = 0;
  private stepIntervalMs = 0;
  private readonly updateIntervalMs = 100;

  private subscriptions = new Subscription();

  private startIcon = L.icon({
    iconUrl: 'assets/markers/start-marker.png', iconSize: [25, 41], iconAnchor: [12, 41]
  });
  private endIcon = L.icon({
    iconUrl: 'assets/markers/end-marker.png', iconSize: [25, 41], iconAnchor: [12, 41]
  });
  private defaultIcon = L.icon({
    iconUrl: 'assets/markers/default-marker.png', iconSize: [25, 41], iconAnchor: [12, 41]
  });

  private startCoordsSubject = new BehaviorSubject<LatLngExpression | undefined>(undefined);
  private destinationCoordsSubject = new BehaviorSubject<LatLngExpression | undefined>(undefined);
  private stopsSubject = new BehaviorSubject<LatLngExpression[]>([]); // optional, falls Zwischenstopps kommen

  public startCoords$ = this.startCoordsSubject.asObservable();
  public destinationCoords$ = this.destinationCoordsSubject.asObservable();
  public stops$ = this.stopsSubject.asObservable(); // optional

// Modus für die Zieleingabe ('Coordinates', 'Address')
  public destinationMode: 'Coordinates' | 'Address' = 'Coordinates';
  // Suchanfrage und Ergebnisse für die Adresssuche
  public destinationSearchQuery = "";
  public destinationSearchResults: Array<{ lat: number; lon: number; label: string }> = [];

  // Temporäre Speicherung für das neue Ziel und Wegpunkte
  public updatedDestination: { lat: number; lon: number } | null = null;
  public updatedStops: WaypointWithMode[] = [];

  //Eigenschaft zum Speichern der Marker-Position
  private currentMarkerPosition: LatLng | null = null;

  // Modal Sichtbarkeit
  public isPauseModalVisible = false;
  //private activeRequest: RideRequest | null = null;


  constructor(
      private rideService: RideService,
      private rideRequestService: RideRequestService,
      private simulationSocket: SimulationSocketService,
      private router: Router,
      private geocode: GeocodingService
  ) {}

  ngOnInit(): void {
    console.log('🚗 RideExecutionComponent initialized');

    const activeRequestSub = this.rideRequestService.getAcceptedRequest().subscribe(activeRequest => {
      if (activeRequest) {
        this.rideId = activeRequest.id;
        console.log('✅ Active request found, ride ID:', this.rideId);
        this.startCoordsSubject.next([activeRequest.startLatitude, activeRequest.startLongitude]);
        this.destinationCoordsSubject.next([activeRequest.destinationLatitude, activeRequest.destinationLongitude]);

        if (activeRequest.stops && activeRequest.stops.length > 0) {
          const stops: LatLngExpression[] = activeRequest.stops.map(s => [s.latitude, s.longitude]);
          this.stopsSubject.next(stops);
        }
        this.setupRouteUpdateSubscription();
        // Globales Topic abonnieren, da Ride-Id verbugged ist noch
        this.simulationSocket.subscribeToGlobalRouteUpdates();

      } else {
        console.log('❌ No active request found');
        this.noActiveRequestError = true;
      }
    });


    this.subscriptions.add(activeRequestSub);
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    this.simulationSocket.disconnect();
  }

  private setupRouteUpdateSubscription(): void {
    if (!this.rideId) {
      console.error('Keine rideId verfügbar für Route-Update-Abonnement');
      return;
    }

    // 1. Route-Updates für diese Fahrt abonnieren
    this.simulationSocket.subscribeToRouteUpdates(this.rideId);

    // 2. Auf eingehende Route-Updates reagieren
    const routeUpdateSub = this.simulationSocket.onRouteUpdate().subscribe(
        (update: RouteUpdate) => {
          console.log('📍 Route-Update vom WebSocket empfangen:', update);
          this.handleIncomingRouteUpdate(update);
        },
        (error) => {
          console.error('❌ Fehler beim Empfangen von Route-Updates:', error);
        }
    );

    this.subscriptions.add(routeUpdateSub);
  }

  /**
   * NEUE METHODE: Behandlung eingehender Route-Updates
   */
  private handleIncomingRouteUpdate(update: RouteUpdate): void {
    // Nur Updates von anderen Personen verarbeiten (nicht eigene Updates)
    if (update.rideId !== this.rideId) {
      console.log('Route-Update gehört zu einer anderen Fahrt, ignoriere es');
      return;
    }

    // Benutzer über die Änderung informieren
    this.showRouteUpdateNotification();

    // Lokale Karte mit neuen Daten aktualisieren
    this.updateLocalMapWithRouteUpdate(update);
  }

  /**
   * NEUE METHODE: Benachrichtigung über Route-Update anzeigen
   */
  private showRouteUpdateNotification(): void {
    // Hier kannst du eine schönere Benachrichtigung implementieren
    // z.B. mit einem Toast-Service oder einer eigenen Notification-Komponente
    alert('📍 Die Route wurde von der anderen Person geändert!');

    // Alternativ: Console-Nachricht für weniger störende Benachrichtigung
    console.log('📍 Route wurde extern aktualisiert');
  }

  /**
   * NEUE METHODE: Lokale Karte mit Route-Update aktualisieren
   */
  private updateLocalMapWithRouteUpdate(update: RouteUpdate): void {
    console.log('🗺️ Aktualisiere lokale Karte mit neuen Route-Daten');

    // Subjects mit neuen Daten aktualisieren
    this.startCoordsSubject.next({ lat: update.start.lat, lng: update.start.lon });
    this.destinationCoordsSubject.next({ lat: update.destination.lat, lng: update.destination.lon });
    this.stopsSubject.next(update.stops.map(stop => ({ lat: stop.lat, lng: stop.lon })));

    // Wenn die Simulation läuft, pausiere sie für die Route-Aktualisierung
    if (this.isRunning) {
      this.pauseSimulation();
      console.log('⏸️ Simulation pausiert für Route-Update');
    }
  }


  startSimulation(): void {
    this.mapVisualizer.startSimulation(this.simulationDurationSec);
  }

  pauseSimulation(): void {
    this.mapVisualizer.pauseSimulation();
    // Aktuelle Marker-Position speichern
    this.currentMarkerPosition = this.mapVisualizer.getCurrentMarkerPosition();
    if (this.currentMarkerPosition) {
      console.log('🚧 Simulation paused, current marker position:', this.currentMarkerPosition);
    }
  }



  addWaypoint(): void {
    // Beispiel: Füge einen neuen Wegpunkt bei (0,0) hinzu, Platzhalter
    this.updatedStops.push({lat: 0, lon: 0, inputMode: 'Coordinates', searchQuery: '', searchResults: []});
  }

  removeWaypoint(index: number): void {
   if (index > -1 && index < this.updatedStops.length) {
    this.updatedStops.splice(index, 1);
   }
  }

  //Waypoint Adresssuche
  searchWaypointAddress(index: number): void {
    const waypoint = this.updatedStops[index];
    if (!waypoint.searchQuery || waypoint.searchQuery.length < 3) {
      waypoint.searchResults = [];
      return;
    }

    this.geocode.search(waypoint.searchQuery).subscribe(
        (data: any) => {
          waypoint.searchResults = data.map((item: { lat: number; lon: number; display_name: string }) => {
            return { lat: item.lat, lon: item.lon, label: item.display_name };
          });
        },
        (error) => {
          console.error('Fehler bei der Adresssuche:', error);
          waypoint.searchResults = [];
        }
    );
  }

  chooseWaypointAddress(index: number, result: any): void {
    const waypoint = this.updatedStops[index];
    waypoint.lat = result.lat;
    waypoint.lon = result.lon;
    waypoint.originalAddress = result.label;
    waypoint.searchQuery = result.label;
    waypoint.searchResults = [];
  }


  openPauseModal(): void {
    if (this.isRunning) return;
    this.isPauseModalVisible = true;

    // Aktuelles Ziel laden
    const currentDestination = this.destinationCoordsSubject.getValue();
    if (Array.isArray(currentDestination)) {
      this.updatedDestination = { lat: currentDestination[0], lon: currentDestination[1] };
    }

    // Wegpunkte zu der erweiterten Struktur konvertieren
    const currentStops = this.stopsSubject.getValue();
    this.updatedStops = currentStops.map(stop => {
      if (Array.isArray(stop)) {
        return {
          lat: stop[0],
          lon: stop[1],
          inputMode: 'Coordinates' as const,
          searchQuery: '',
          searchResults: []
        };
      }
      const stopObject = stop as LatLng | LatLngLiteral;
      return {
        lat: stopObject.lat,
        lon: stopObject.lng,
        inputMode: 'Coordinates' as const,
        searchQuery: '',
        searchResults: []
      };
    });
  }

  closePauseModal(): void {
    this.isPauseModalVisible = false;
    //Suchergebnisse zurücksetzen
    this.updatedStops.forEach(wp => {
      wp.searchResults = [];
    })
  }
// Adresssuche für das neue Ziel (wie im RideRequestFormComponent)
  searchDestinationAddress(): void {
    if (!this.destinationSearchQuery) return;
    this.geocode.search(this.destinationSearchQuery).subscribe((data: any) => {
      this.destinationSearchResults = data.map((item: { lat: number; lon: number; display_name: string }) => {
        return { lat: item.lat, lon: item.lon, label: item.display_name };
      });
    });
  }
  // Adresse als neues Ziel auswählen
  chooseDestinationAddress(address: { lat: number; lon: number; label: string }): void {
    this.updatedDestination = { lat: address.lat, lon: address.lon };
    this.destinationSearchQuery = address.label; // Zeigt die gewählte Adresse im Input an
    this.destinationSearchResults = []; // Verbirgt die Ergebnisliste
  }
  updateRoute(): void {
    if (!this.updatedDestination) {
      alert("Bitte geben Sie ein gültiges neues Ziel an.");
      return;
    }

    for (let i = 0; i < this.updatedStops.length; i++) {
      const wp = this.updatedStops[i];
      if (!wp.lat || !wp.lon) {
        alert(`Bitte geben Sie gültige Koordinaten für Wegpunkt ${i + 1} an.`);
        return;
      }
    }
    if (!this.currentMarkerPosition) {
      alert('Aktuelle Marker-Position ist nicht verfügbar. Simulation muss pausiert sein.');
        return;
    }
    if (!this.rideId){
      alert('Fahrt-Id nicht verfügbar. Update kann nicht gesendet werden.');
      return;
    }

    if (!this.simulationSocket.isConnectedtoServer()) {
      alert('Keine Verbindung zum Server. Bitte überprüfen Sie Ihre Internetverbindung.');
      return;
    }
    //Daten für Aktualisierung der Route vorbereiten
    const start: CoordinateDto = {
      lat: this.currentMarkerPosition.lat,
      lon: this.currentMarkerPosition.lng
    };
    const destination: CoordinateDto = {
      lat: this.updatedDestination.lat,
      lon: this.updatedDestination.lon
    };

    // Für lokale Karte
    const startForMap:[number, number] = [this.currentMarkerPosition.lat, this.currentMarkerPosition.lng];
    const destinationForMap: [number, number] = [this.updatedDestination.lat, this.updatedDestination.lon];
    const stops: [number, number][] = this.updatedStops.map(s => [s.lat, s.lon]);


    // Lokale Karte über die Subjects aktualisieren
    //
    this.updateLocalRoute(startForMap, destinationForMap, stops);
    //Payload für WebSocket-Update
    const routeUpdatePayload: RouteUpdate = {
      rideId: this.rideId,
      start: start,
      destination: destination,
      stops: stops.map(stop => this.convertToCoordinateDto(stop))
    };

    console.log("Sende Route-Update über WebSocket:", routeUpdatePayload);
    this.simulationSocket.sendRouteUpdate(routeUpdatePayload);

    //Startpunkt aus der aktuellen Marker-Position nehmen
    this.startCoordsSubject.next(this.currentMarkerPosition)

    // Die neuen Koordinaten an die Observables übergeben
    this.destinationCoordsSubject.next([this.updatedDestination.lat, this.updatedDestination.lon]);
    this.stopsSubject.next(this.updatedStops.map(s => [s.lat, s.lon]));

    // Modal schließen
    this.closePauseModal();
    console.log("Route aktualisiert mit neuem Start", this.currentMarkerPosition,)
    console.log("- Wegpunkte:", this.updatedStops);
    console.log("- Neues Ziel:", this.updatedDestination);

    console.log("Route wird mit neuem Ziel und Wegpunkten aktualisiert.");
  }

  // Hilfsfunktion für die Konvertierung
  private convertToCoordinateDto(latLng: LatLngExpression): CoordinateDto {
    if (Array.isArray(latLng)) {
      return { lat: latLng[0], lon: latLng[1] };
    } else if (typeof latLng === 'object' && 'lat' in latLng) {
      return { lat: latLng.lat, lon: latLng.lng };
    }
    throw new Error('Invalid LatLngExpression format');
  }
  private updateLocalRoute(start: [number, number], destination: [number, number], stops: [number, number][]): void {
    // Subjects mit neuen Daten aktualisieren
    this.startCoordsSubject.next(start);
    this.destinationCoordsSubject.next(destination);
    this.stopsSubject.next(stops);

    console.log('🗺️ Lokale Route aktualisiert');
  }

  stopSimulation(isFinished: boolean): void {
    this.pauseSimulation();
    if (isFinished && this.route.length > 0) {
      this.simulationFinished = true;
      this.currentIndex = this.route.length - 1;
      this.marker?.setLatLng(this.route[this.currentIndex]);
      // this.sendProgressUpdate(true);
    }
  }

  onDurationChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.simulationDurationSec = input.valueAsNumber;
    if (this.route.length > 0) {
      this.stepIntervalMs = (this.simulationDurationSec * 1000) / this.route.length;
    }
  }

  goToRideSummary(): void {
    if (this.rideId) {
      this.router.navigate(['/ride-summary', this.rideId]);
    }
  }



}
