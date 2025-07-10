import {
  Component, Input, Output, EventEmitter, OnDestroy, OnChanges, SimpleChanges, OnInit
} from '@angular/core';
import { LeafletModule } from '@bluehalo/ngx-leaflet';
import { HttpClient } from '@angular/common/http';
import { LatLngBounds, LatLngExpression } from 'leaflet';
declare let L: any;
import 'leaflet-routing-machine';
import {BehaviorSubject, combineLatest, Observable, Subject} from 'rxjs';
import { SimulationSocketService } from '../../services/simulation-socket.service';

interface OverpassMarker extends L.Marker {
  source?: string;
}

@Component({
  standalone: true,
  selector: 'app-MapVisualizer',
  imports: [LeafletModule],
  templateUrl: './MapVisualizer.component.html',
  styleUrls: ['./MapVisualizer.component.scss']
})
export class MapVisualizerComponent implements OnDestroy, OnChanges, OnInit {
  @Input() startCoords$?: Observable<LatLngExpression | undefined>;
  @Input() destinationCoords$?: Observable<LatLngExpression | undefined>;
  @Input() poiTypes: string[] = ['restaurant', 'museum', 'theatre'];
  @Input() set stops$(obs: Observable<LatLngExpression[]>) {
    obs.subscribe((stops) => {
      this.stops = stops;
      this.calculateRoute();
      this.renderStopMarkers();
    });
  }
  @Input() rideId: number | null = null;

  @Output() totalDistanceChanged = new EventEmitter<number>();
  @Output() totalTimeChanged = new EventEmitter<number>();
  @Output() poisChanged = new EventEmitter<any[]>();
  @Output() simulationRunning = new EventEmitter<boolean>();
  @Output() simulationDone = new EventEmitter<boolean>();



  map!: L.Map;
  private destroy$ = new Subject<void>();
  private debounceTimeout: any;
  private lastBounds?: LatLngBounds;
  private routeControl?: any;

  private routeCoordinates: L.LatLng[] = [];
  private currentIndex = 0;
  private simulationInterval: any = null;
  private simulationDuration = 10;
  private stepIntervalMs = 100;
  private updateIntervalMs = 100;
  private elapsedMs = 0;

  startMarker: L.Marker | null = null;
  destMarker: L.Marker | null = null;
  private stopMarkers: L.Marker[] = [];
  private allPOIs: any[] = [];
  private simulationMarker: L.Marker | null = null;

  private stops: LatLngExpression[] = [];


  private simulationStatus$ = new BehaviorSubject<boolean>(false); // false = nicht laufend

  totalDistance: number = 0;
  totalTime: number = 0;

  private startIcon = L.icon({
    iconUrl: 'assets/markers/start-marker.png',
    iconSize: [30, 40],
    iconAnchor: [15, 40],
    popupAnchor: [0, -40]
  });
  private endIcon = L.icon({
    iconUrl: 'assets/markers/end-marker.png',
    iconSize: [30, 40],
    iconAnchor: [15, 40],
    popupAnchor: [0, -40]
  });
  private stopIcon = L.icon({
    iconUrl: 'assets/markers/stop-marker.png',
    iconSize: [30, 40],
    iconAnchor: [15, 40],
    popupAnchor: [0, -40]
  });
  private defaultIcon = L.icon({
    iconUrl: 'assets/markers/default-marker.png',
    iconSize: [30, 40],
    iconAnchor: [15, 40],
    popupAnchor: [0, -40]
  });

  options = {
    layers: [
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18,
        minZoom: 3,
        attribution: '&copy; OpenStreetMap contributors'
      })
    ],
    zoom: 15,
    center: L.latLng(51.464, 7.0055)
  };
  constructor(private http: HttpClient, private simulationSocket: SimulationSocketService) {}

  ngOnInit(): void {

    this.subscribeToSocket();
    if (!this.startCoords$ || !this.destinationCoords$ || !this.stops$) return;

    combineLatest(
      this.startCoords$!,
      this.destinationCoords$!,
      this.stops$!
    ).subscribe(([start, dest, stops]) => {
      if (this.map && start && dest) {
        this.startMarker?.remove();
        this.destMarker?.remove();

        this.startMarker = L.marker(start, { icon: this.startIcon }).addTo(this.map);
        this.destMarker = L.marker(dest, { icon: this.endIcon }).addTo(this.map);
        this.stops = stops;

        this.fitMapToMarkers();
        this.calculateRoute();
        this.renderStopMarkers();
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['poiTypes'] && !changes['poiTypes'].firstChange) {
      this.reloadPOIsManually();
    }
    if (changes['stops'] && !changes['stops'].firstChange) {
      this.calculateRoute();
      this.renderStopMarkers();
    }
  }

  onMapReady(map: L.Map): void {
    if (this.map) return;
    this.map = map;
    if (this.startMarker) this.startMarker.addTo(this.map);
    if (this.destMarker) this.destMarker.addTo(this.map);
    if (this.stops?.length) this.renderStopMarkers();

    // Route ggf. berechnen
    if (this.startMarker && this.destMarker) {
      this.fitMapToMarkers();
      this.calculateRoute();
    }

    this.updateMap();
    setTimeout(() => this.map.invalidateSize(), 0);
  }

  private updateMap(): void {
    this.startCoords$?.subscribe(coords => {
      if (coords && this.map) {
        this.startMarker?.remove();
        this.startMarker = L.marker(coords, { icon: this.startIcon }).addTo(this.map);
        this.fitMapToMarkers();
        this.calculateRoute();
        this.renderStopMarkers();
      }
    });

    this.destinationCoords$?.subscribe(coords => {
      if (coords && this.map) {
        this.destMarker?.remove();
        this.destMarker = L.marker(coords, { icon: this.endIcon }).addTo(this.map);
        this.fitMapToMarkers();
        this.calculateRoute();
        this.renderStopMarkers();
      }
    });

    setTimeout(() => {
      this.map.invalidateSize();
      window.dispatchEvent(new Event('resize'));
    }, 250);

    this.loadPOIsFromOverpass();
    this.setupPOILoader(this.map);
  }

  private calculateRoute(): void {
    if (!this.map || !this.startMarker || !this.destMarker) return;

    const start = this.startMarker.getLatLng();
    const end = this.destMarker.getLatLng();
    const filteredStops = this.stops
      .map(s => L.latLng(s))
      .filter(p => !(p.lat === start.lat && p.lng === start.lng))
      .filter(p => !(p.lat === end.lat && p.lng === end.lng));
    const waypoints = [start, ...filteredStops, end];

    if (this.routeControl) this.map.removeControl(this.routeControl);

    this.routeControl = L.Routing.control({
      plan: new L.Routing.Plan(waypoints, { draggableWaypoints: false }),
      addWaypoints: false,
      show: false
    }).addTo(this.map);

    this.routeControl.on('routesfound', (e: any) => {
      this.routeCoordinates = e.routes[0].coordinates.map((coord: any) =>
        L.latLng(coord.lat, coord.lng)
      );
      const summary = e.routes[0].summary;
      this.totalDistance = summary.totalDistance;
      this.totalTime = summary.totalTime;
      this.totalDistanceChanged.emit(this.totalDistance);
      this.totalTimeChanged.emit(this.totalTime);
    });

    this.routeControl.on('routingerror', (err: any) => {
      console.error("Routing error:", err);
    });
  }

  private fitMapToMarkers(): void {
    if (!this.map) return;
    if (this.startMarker && this.destMarker) {
      const bounds = L.latLngBounds(
        this.startMarker.getLatLng(),
        this.destMarker.getLatLng()
      );
      this.map.fitBounds(bounds, { padding: [50, 50] });
    } else if (this.startMarker) {
      this.map.setView(this.startMarker.getLatLng(), 15);
    } else if (this.destMarker) {
      this.map.setView(this.destMarker.getLatLng(), 15);
    }
  }

  private setupPOILoader(map: L.Map): void {
    map.on('moveend', () => {
      clearTimeout(this.debounceTimeout);
      this.debounceTimeout = setTimeout(() => {
        if (map.getZoom() < 14) return;
        const bounds = map.getBounds();
        if (!this.hasMovedSignificantly(bounds)) return;
        this.loadPOIsFromOverpass(bounds);
        this.lastBounds = bounds;
      }, 500);
    });
  }

  private hasMovedSignificantly(newBounds: LatLngBounds): boolean {
    if (!this.lastBounds) return true;
    return (
      !this.lastBounds.contains(newBounds) ||
      this.lastBounds.getCenter().distanceTo(newBounds.getCenter()) > 100
    );
  }

  private loadPOIsFromOverpass(bounds?: LatLngBounds): void {
    if (!this.map) return;
    const b = bounds || this.map.getBounds();

    const query = `
    [out:json][timeout:30];
    (
      node["amenity"](${b.getSouth()},${b.getWest()},${b.getNorth()},${b.getEast()});
      node["tourism"="museum"](${b.getSouth()},${b.getWest()},${b.getNorth()},${b.getEast()});
    );
    out body;
    `;

    const overPassUrl = 'https://overpass-api.de/api/interpreter';

    this.http.post(overPassUrl, `data=${encodeURIComponent(query)}`, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    }).subscribe({
      next: (data: any) => {
        this.allPOIs = data.elements || [];
        const filtered = this.renderPOIMarkers();
        this.poisChanged.emit(filtered);
      },
      error: (err: any) => {
        console.error('Overpass-API Fehler', err);
      }
    });
  }

  private renderPOIMarkers(): any[] {
    if (!this.map) return [];

    this.map.eachLayer(layer => {
      if ((layer as OverpassMarker).source === 'overpass') {
        this.map.removeLayer(layer);
      }
    });

    const validPOIs = this.allPOIs.filter(e => {
      const tags = e.tags || {};
      return (
        e.lat || (e.center && e.center.lat)
      ) && this.poiTypes.some(type =>
        tags.amenity === type || tags.shop === type || tags.tourism === type
      );
    });

    for (const el of validPOIs) {
      const lat = el.lat || el.center?.lat;
      const lon = el.lon || el.center?.lon;

      if (lat != null && lon != null) {
        const marker = L.marker([lat, lon], { icon: this.defaultIcon }) as OverpassMarker;
        marker.source = 'overpass';
        marker.bindPopup(`<b>${el.tags?.name || 'Unbenannter Ort'}</b><br>${el.tags?.cuisine || el.tags?.shop || el.tags?.tourism || ''}`);
        marker.addTo(this.map);
      }
    }
    return validPOIs;
  }

  public reloadPOIsManually(): void {
    if (this.map) {
      this.renderPOIMarkers();
    }
  }


  private renderStopMarkers(): void {
    for (const marker of this.stopMarkers) {
      this.map.removeLayer(marker);
    }
    this.stopMarkers = [];

    if (!this.map) return;

    this.stops.forEach((coord, index) => {
      const marker = L.marker(coord, { icon: this.stopIcon }).addTo(this.map);
      marker.bindTooltip(`Stopp ${index + 1}`);
      this.stopMarkers.push(marker);
    });
  }

  //Marker Position für Aktualisierung in Simulation
  public getCurrentMarkerPosition(): L.LatLng | null {
    if (this.simulationMarker) {
      return this.simulationMarker.getLatLng()
    }
    return null;
  }

  public updateSimulationMarker(position: LatLngExpression): void {
    if (!this.map) {
      console.warn('⚠️ Kein Zugriff auf Leaflet Map');
      return;
    }

    const latLng = L.latLng(position);

    console.log('📍 updateSimulationMarker aufgerufen mit:', position);
    if (!this.map) return;
    if (!this.simulationMarker) {
      console.log('🆕 Neuen Marker erstellen bei', latLng);
      this.simulationMarker = L.marker(latLng, {
        icon: this.defaultIcon
      }).addTo(this.map);
    } else {
      this.simulationMarker.setLatLng(latLng);
    }
  }

  private subscribeToSocket(): void {
    console.log('Subscribe to Socket Aufruf');


    this.simulationSocket.onProgress().subscribe(progress => {
      console.log('📥 Fortschritt vom Socket empfangen:', progress);

      if (!progress || progress.lat == null || progress.lon == null) {
        console.warn('⚠️ Ungültiger progress empfangen:', progress);
        return;
      }
      console.log('🎯 Marker update:', [progress.lat, progress.lon]);
      // 💡 Immer Marker aktualisieren – auch passiv
      this.updateSimulationMarker([progress.lat, progress.lon]);

      if (progress.isRunning !== this.simulationStatus$.value) {
        this.simulationStatus$.next(progress.isRunning);
      }

      if (progress.isFinished) {
        this.simulationDone.emit(true);
      }
    });
  }

  public startSimulationExternally(): void {
    if (!this.routeCoordinates.length || this.simulationInterval) return;

    this.stepIntervalMs = (this.simulationDuration * 1000) / this.routeCoordinates.length;

    if (!this.stepIntervalMs || !isFinite(this.stepIntervalMs)) {
      console.error("❌ Ungültiges stepIntervalMs:", this.stepIntervalMs);
      return;
    }

    this.simulationInterval = setInterval(() => {
      this.elapsedMs += this.updateIntervalMs;

      const newIndex = Math.floor(this.elapsedMs / this.stepIntervalMs);

      if (newIndex >= this.routeCoordinates.length) {
        this.stopSimulation();
        return;
      }

      if (newIndex !== this.currentIndex) {
        this.currentIndex = newIndex;
        const pos = this.routeCoordinates[this.currentIndex];

        if (!pos) {
          console.warn("⚠️ Position an Index", this.currentIndex, "nicht vorhanden – Simulation pausiert.");
          this.pauseSimulation();
          return;
        }

        this.updateSimulationMarker(pos);
      }
    }, this.updateIntervalMs);
  }

  public startSimulation(duration: number): void {
    if (!this.routeCoordinates.length) return;

    // Bestehende Simulation abbrechen (safety)
    if (this.simulationInterval) {
      clearInterval(this.simulationInterval);
      this.simulationInterval = null;
    }

    // 💥 Reset State (essentiell!)
    this.elapsedMs = 0;
    this.currentIndex = 0;

    this.simulationDuration = duration;
    this.stepIntervalMs = (this.simulationDuration * 1000) / this.routeCoordinates.length;

    if (!this.stepIntervalMs || !isFinite(this.stepIntervalMs)) {
      console.error('❌ Ungültiges stepIntervalMs:', this.stepIntervalMs);
      return;
    }

    console.log('🔁 Simulation gestartet:', {
      routeLen: this.routeCoordinates.length,
      stepIntervalMs: this.stepIntervalMs,
      updateIntervalMs: this.updateIntervalMs
    });

    this.simulationInterval = setInterval(() => {
      this.elapsedMs += this.updateIntervalMs;

      const newIndex = Math.floor(this.elapsedMs / this.stepIntervalMs);
      console.log('⏱ elapsedMs:', this.elapsedMs, '→ newIndex:', newIndex);

      if (newIndex >= this.routeCoordinates.length) {
        this.stopSimulation();
        return;
      }

      if (newIndex !== this.currentIndex) {
        this.currentIndex = newIndex;
        const pos = this.routeCoordinates[this.currentIndex];

        if (!pos || typeof pos.lat !== 'number' || typeof pos.lng !== 'number') {
          console.warn('⚠️ Ungültige Position – Simulation wird pausiert.', pos);
          this.pauseSimulation();
          return;
        }

        this.updateSimulationMarker(pos);

        this.simulationSocket.sendProgress({
          rideId: this.rideId ?? -1,
          currentIndex: this.currentIndex,
          lat: pos.lat,
          lon: pos.lng,
          isRunning: true,
          isFinished: false,
          elapsedMs: this.elapsedMs
        });
      }
    }, this.updateIntervalMs);

    this.simulationRunning.emit(true);
    this.simulationDone.emit(false);
  }


  public pauseSimulation(): void {
    if (this.simulationInterval) {
      clearInterval(this.simulationInterval);
      this.simulationInterval = null;
      this.simulationRunning.emit(false);
      const pos = this.routeCoordinates[this.currentIndex];
      this.simulationSocket.sendProgress({
        rideId: this.rideId ?? -1,
        currentIndex: this.currentIndex,
        lat: pos.lat,
        lon: pos.lng,
        isFinished: false,
        isRunning: false,
        elapsedMs: this.elapsedMs
      });
    }
  }

  public stopSimulation(): void {
    this.pauseSimulation();
    const pos = this.routeCoordinates[this.routeCoordinates.length - 1];
    this.updateSimulationMarker(pos);
    this.simulationSocket.sendProgress({
      rideId: this.rideId ?? -1,
      currentIndex: this.routeCoordinates.length - 1,
      lat: pos.lat,
      lon: pos.lng,
      isFinished: true,
      isRunning: false,
      elapsedMs: this.elapsedMs
    });
    this.simulationDone.emit(true);
  }
}


