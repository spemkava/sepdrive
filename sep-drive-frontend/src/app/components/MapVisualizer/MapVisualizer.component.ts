import {
  Component, //UI, webpage (oder größerer Teil von einer)
  OnDestroy, //custom cleanup, wenn es nicht mehr benötigt wird
  EventEmitter, //Ereignisse (für components)
  Output,
  Input,
  OnChanges, SimpleChanges
} from '@angular/core';

import { LeafletModule } from '@bluehalo/ngx-leaflet'; //extra für angular
declare var L:any; //extra für routing machine
import 'leaflet';
import 'leaflet-routing-machine';
import { HttpClient } from '@angular/common/http';
import {LatLngBounds, LatLngExpression} from 'leaflet'; //für Koordinaten
import { Observable, Subject } from 'rxjs'; //für Änderungen, Submits etc

interface OverpassMarker extends L.Marker {
  source?: string;
}

@Component({ //Definiert UI, Struktur von der Karte
    standalone: true, //braucht keinen module
    selector: 'app-MapVisualizer', //basically die ID des components
    imports: [
      LeafletModule //MapVis benutzt Methoden/Variablen aus LeafletModule
    ],
    templateUrl: './MapVisualizer.component.html', //Aufbau der Webpage
    styleUrls: ['./MapVisualizer.component.scss'] //Stylesheet (Font, Layout etc)
  })
export class MapVisualizerComponent implements  OnDestroy, OnChanges  { //Implementiert OD, OC interface für Methoden (Check for structure)

  @Input() startCoords$?: Observable<LatLngExpression | undefined>; // '?' = Elvis Operator, signalisiert dass es den Wert noch nicht gibt
  @Input() destinationCoords$?: Observable<LatLngExpression | undefined>;
  @Input() poiTypes: string[] = ['restaurant', 'museum', 'theatre'];

  @Output() totalDistanceChanged = new EventEmitter<number>;
  @Output() totalTimeChanged = new EventEmitter<number>;
  @Output() poisChanged = new EventEmitter<any[]>();

  map!: L.Map; //LeafletModule import für Angular
  private destroy$ = new Subject<void>();
  private debounceTimeout: any;
  private lastBounds?: LatLngBounds;

  startMarker: L.Marker | null = null;
  destMarker: L.Marker | null = null;
  private allPOIs: any[] = [];


  totalDistance: number;

  totalTime: number;

  //Funktionieren aus irgendeinem grund nicht?
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

  private defaultIcon = L.icon({
    iconUrl: 'assets/markers/default-marker.png',
    iconSize: [30, 40],
    iconAnchor: [15, 40],
    popupAnchor: [0, -40]
  });

  options = { //bestimmt die Konfiguration der Map
    layers: [
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18,
        minZoom: 3,
        attribution: '&copy; OpenStreetMap contributors'
      })
    ],
    zoom: 15, // Initialer Zoom
    center: L.latLng(51.464, 7.0055) // //Startposision (Universität Essen)
  };

  constructor(private http: HttpClient) {this.totalDistance = 0; this.totalTime = 0;}

  ngOnDestroy(): void {

    this.destroy$.next();
    this.destroy$.complete();
  }
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['poiTypes'] && !changes['poiTypes'].firstChange) {
      this.reloadPOIsManually();
    }
  }


  onMapReady(map: L.Map): void {
    if (this.map) return;
    this.map = map;
    this.updateMap();
    //Container könnte noch nicht ready sein - leaflet rendert asynchron auf DOM-Basis - deswegen Timeout und Neuberechnung der Größe
    setTimeout(() => this.map.invalidateSize(), 0);
  }



  private updateMap() {
    this.startCoords$?.subscribe( coords => {
      if (coords && this.map) {
        this.startMarker?.remove();
        this.startMarker = L.marker(coords, {icon: this.startIcon}).addTo(this.map);

        this.fitMapToMarkers();
        this.calculateRoute();
      }
    });
    this.destinationCoords$?.subscribe( coords => {
      if (coords && this.map) {
        this.destMarker?.remove();
        this.destMarker = L.marker(coords, {icon: this.endIcon}).addTo(this.map);

        this.fitMapToMarkers();
        this.calculateRoute();
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
    if (this.destMarker && this.startMarker) {
      var routeControl = L.Routing.control({
        plan: new L.Routing.Plan([
          L.latLng(this.startMarker.getLatLng()),
          L.latLng(this.destMarker.getLatLng())
        ], {draggableWaypoints:false}),
        addWaypoints: false,
        show: false
      }).addTo(this.map);

      routeControl.on('routesfound', (e: any) => {
        var routes = e.routes;
        var summary = routes[0].summary;
        this.totalDistance = summary.totalDistance;
        this.totalTime = summary.totalTime;
        this.totalDistanceChanged.emit(this.totalDistance)
        this.totalTimeChanged.emit(this.totalTime)
      })
    }
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
        this.allPOIs = data.elements || [];  //falls data.elements null ist, gebe leeres Array
        const filtered = this.renderPOIMarkers(); // filter erfolgt dort
        this.poisChanged.emit(filtered);
      },
      error: (err: any) => {
        console.error('Overpass-API Fehler', err);
      }
    });
  }

  private renderPOIMarkers(): any[] {
    if (!this.map) return [];

    // Alte Overpass-Marker entfernen
    this.map.eachLayer(layer => {
      if ((layer as OverpassMarker).source === 'overpass') {
        this.map!.removeLayer(layer);
      }
    });

    // POIs nach ausgewählten Typen filtern
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
        const marker = L.marker([lat, lon], {icon:this.defaultIcon}) as OverpassMarker;
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
}
