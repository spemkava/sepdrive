import {Component, OnInit, ViewChild, AfterViewInit} from '@angular/core';
import {Router} from "@angular/router";
import {ReactiveFormsModule, FormBuilder, FormGroup, FormsModule} from '@angular/forms';
import {CommonModule} from '@angular/common';
import {CreateRideRequestDto} from "../../models/create-ride-request-dto.model";
import {RideRequestService } from '../../services/RideRequest.service';
import {GeocodingService } from '../../services/Geocoding.service';
import {CarClass } from '../../models/enums.model';
import {MapVisualizerComponent} from '../MapVisualizer/MapVisualizer.component';
import {BehaviorSubject, Subscription} from 'rxjs';
import {PoiFilterPipe } from '../../pipes/poi-filter.pipe'



@Component({
  selector: 'app-RideRequestForm',
  standalone : true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MapVisualizerComponent,
    PoiFilterPipe
  ],
  templateUrl: './RideRequestForm.component.html',
  styleUrls: ['./RideRequestForm.component.scss']
})
export class RideRequestFormComponent implements OnInit, AfterViewInit {
  @ViewChild(MapVisualizerComponent) mapVisualizerComponent!: MapVisualizerComponent;
  //Variables
  totalDistance?: number;
  totalTime?: number;
  price?: number;
  startMode: any ="Coordinates";
  destinationMode: any ="Coordinates";
  ride: CreateRideRequestDto;
  carClass: CarClass;
  carClasses = Object.values(CarClass); //ngfor in html nimmt nur arrays und keine enums an

  //Behavior Subjekts für Änderungsverfolgung
  private _startCoords$ = new BehaviorSubject<[number, number] | undefined>(undefined);
  startCoords$ = this._startCoords$.asObservable();
  private _destinationCoords$ = new BehaviorSubject<[number, number] | undefined>(undefined);
  destinationCoords$ = this._destinationCoords$.asObservable();

  requestForm!: FormGroup;
  loadedPOIs: any[]= [];
  startPoiId?: number;
  endPoiId?: number;
  //Addresssuche
  StartAdressSearchQuery = "";
  StartAdressSearchResults : Array<{ lat: number; lon: number; label: string }> = [];

  DestinationAdressSearchQuery = "";
  DestinationAdressSearchResults: Array<{ lat: number; lon: number; label: string }> = [];


  private poisChangedSubscription?: Subscription;
  poiSearchStart: string = '';
  poiSearchEnd: string = '';
  //^Subscription für die POI-Änderungen
  poiSelectionMap: { [key: string]: boolean } = {
    restaurant: true,
    museum: true,
    theatre: true
  };

  get selectedPOITypes(): string[] {
    return Object.entries(this.poiSelectionMap)
      .filter(([_, isSelected]) => isSelected)
      .map(([type]) => type);
  }






  constructor(
    private rideService: RideRequestService,
    private geocode: GeocodingService,
    private router: Router,
    private fb: FormBuilder
  ) {this.ride = {}; this.carClass = CarClass.MEDIUM}

  searchStartAddress(): void {
    this.geocode.search(this.StartAdressSearchQuery).subscribe((data: any) => {
      this.StartAdressSearchResults = data.map((item : {lat:number,lon:number,display_name:string}) =>
      {
        return {lat: item.lat,lon : item.lon, label: item.display_name};
      })
    });
  }

  searchDestinationAddress(): void {
    this.geocode.search(this.DestinationAdressSearchQuery).subscribe((data: any) => {
      this.DestinationAdressSearchResults = data.map((item : {lat:number,lon:number,display_name:string}) =>
      {
        return {lat: item.lat,lon : item.lon, label: item.display_name};
      })
    });
  }

  chooseStartAddress(address : {lat:number,lon:number,label:string}) {
    this.ride.startLatitude = address.lat;
    this.ride.startLongitude = address.lon;
    this.updatePreview();
  }

  chooseDestinationAddress(address : {lat:number,lon:number,label:string}) {
    this.ride.destinationLatitude = address.lat;
    this.ride.destinationLongitude = address.lon;
    this.updatePreview();
  }

  updatePreview(): void {
    if (this.startMode === 'POI') {
      this.chooseStartPOI(); // ruft intern _startCoords$.next()
    } else if (this.startMode === 'Address') {
      if (this.ride.startLatitude && this.ride.startLongitude) {
        this._startCoords$.next([this.ride.startLatitude, this.ride.startLongitude]);
      }
    } else if (this.startMode === 'Coordinates') {
      if(this.ride.startLatitude && this.ride.startLongitude) {
        this._startCoords$.next([this.ride.startLatitude, this.ride.startLongitude])
      }
    } else {
      console.warn('Start-Modus nicht unterstützt:', this.startMode);
    }
    if (this.destinationMode === 'POI') {
      this.chooseEndPOI();
    } else if (this.destinationMode === 'Address') {
      if (this.ride.destinationLatitude && this.ride.destinationLongitude) {
        this._destinationCoords$.next([this.ride.destinationLatitude, this.ride.destinationLongitude]);
      }
    } else if (this.destinationMode === 'Coordinates') {
      if (this.ride.destinationLatitude && this.ride.destinationLongitude) {
        this._destinationCoords$.next([this.ride.destinationLatitude, this.ride.destinationLongitude]);
      }
    } else {
      console.warn('Ziel-Modus nicht unterstützt:', this.destinationMode);
    }

  }

  totalDistanceChanged(value:number): void {
    this.totalDistance = Math.round(value/1000 * 100)/100; //meter zu km
    this.calculatePrice();
  }

  calculatePrice(): void {
    if(this.totalDistance) {
      switch (this.carClass) {
        default:
          console.log("error2");
          break;
        case CarClass.SMALL:
          this.price = this.totalDistance;
          break;
        case CarClass.MEDIUM:
          this.price = this.totalDistance * 2;
          break;
        case CarClass.DELUXE:
          this.price = this.totalDistance * 10;
          break;
      }
    }
  }

  totalTimeChanged(value:number): void {
    this.totalTime = Math.round(value/60);
  }

  onSubmit(): void {
    this.updatePreview();
    this.ride.requestedCarClass = this.carClass;
    this.ride.totalDistance = this.totalDistance;
    this.ride.totalTime = this.totalTime;
    this.ride.price = this.price;

    this.rideService.createRequest(this.ride).subscribe({
      next: (res) => {
        console.log('Ride request created successfully:', res);
        this.router.navigate(['/home']); // leitet weiter
      },
      error: (err) => {
        console.error('Error while creating ride request:', err);}})
  }

  onPOITypeToggle(type: string, checked: boolean): void {
    this.poiSelectionMap[type] = checked;
    if(this.mapVisualizerComponent?.map){
      this.mapVisualizerComponent.reloadPOIsManually();
    }
    this.poiSelectionMap[type] = checked;

  }

  onPOIsChanged(pois:any[]): void {

    const oldStartId = this.startPoiId;
    const oldEndId = this.endPoiId;

    this.loadedPOIs = [...pois];
    console.log("POIS changed", this.loadedPOIs);

    if (oldStartId && this.loadedPOIs.some(p => p.id === oldStartId)) {
      this.startPoiId = oldStartId;
    }

    if (oldEndId && this.loadedPOIs.some(p => p.id === oldEndId)) {
      this.endPoiId = oldEndId;
    }
  }


  chooseStartPOI(event?: Event): void {
    let selectedId: string | undefined;

    if (event) {
      selectedId = (event.target as HTMLSelectElement).value;
    } else if (this.startPoiId != null) {
      selectedId = this.startPoiId.toString();
    }
    //kein vollständiger Schutz, falls loadedPOIs = undefined
    if (!selectedId) return;

    const selected = this.loadedPOIs.find(p => p.id.toString() === selectedId);
    if (!selected) return;

    //Nullish Coalescing Operator. selected.center als fallback, manche POIs haben in OVerpass
    //keine lat/lon, sondern verschachteln das in center
    const lat = selected.lat ?? selected.center?.lat;
    const lon = selected.lon ?? selected.center?.lon;

    //Übertrage lat/lon in Koordinateneingabe
    if (lat != null && lon != null) {
      this.requestForm.patchValue({
        startLatitude: lat,
        startLongitude: lon
      });
      this.ride.startLatitude = lat;
      this.ride.startLongitude = lon;
      //Marker rendern
      if (this.startMode === 'POI') {
        this._startCoords$.next([lat, lon]);
      }

      console.log('Startpunkt gesetzt:', lat, lon);
    }
  }

  chooseEndPOI(event?: Event): void {
    let selectedId: string | undefined;

    if (event) {
      selectedId = (event.target as HTMLSelectElement).value;
    } else if (this.endPoiId != null) {
      selectedId = this.endPoiId.toString();
    }

    if (!selectedId) return;

    const selected = this.loadedPOIs.find(p => p.id.toString() === selectedId);
    if (!selected) return;

    const lat = selected.lat ?? selected.center?.lat;
    const lon = selected.lon ?? selected.center?.lon;

    if (lat != null && lon != null) {
      this.requestForm.patchValue({
        destinationLatitude: lat,
        destinationLongitude: lon
      });
      this.ride.destinationLatitude = lat;
      this.ride.destinationLongitude = lon;

      if (this.destinationMode === 'POI') {
        this._destinationCoords$.next([lat, lon]);
      }

      console.log('Zielpunkt gesetzt:', lat, lon);
    }
  }

  startGeolocation() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((position) => {
          if (position) {
            this.ride.startLatitude = position.coords.latitude;
            this.ride.startLongitude = position.coords.longitude;
          }
        },
        (error) => console.log(error));
    } else {
      alert("Geolocation is not supported by this browser.");
    }
  }

  destinationGeolocation () {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((position) => {
          if (position) {
            this.ride.destinationLatitude = position.coords.latitude;
            this.ride.destinationLongitude = position.coords.longitude;
          }
        },
        (error) => console.log(error));
    } else {
      alert("Geolocation is not supported by this browser.");
    }
  }


  trackByPoiId(index: number, poi: any): number {
    return poi.id;
  }

  ngOnInit(): void {
    this.requestForm = this.fb.group({
      startLatitude: [null],
      startLongitude: [null],
      destinationLatitude: [null],
      destinationLongitude: [null],

    });
  }

    ngAfterViewInit(): void {
    this.poisChangedSubscription = this.mapVisualizerComponent.poisChanged.subscribe(pois => {
      this.loadedPOIs = pois;
      console.log('RequestRideForm: POIs empfangen:', this.loadedPOIs)
    });
  }

}
