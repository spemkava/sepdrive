import { Component, OnInit, ViewChild } from '@angular/core';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { CommonModule } from '@angular/common';
import { RideRequestService } from '../../services/RideRequest.service';
import { RideRequestDto } from '../../models/ride-request-dto.model';
import { OfferDto } from '../../models/offer-dto.model';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { GeocodingService } from '../../services/Geocoding.service';
import {MatButton} from '@angular/material/button';
import {UserService} from '../../services/user.service';
import {Router} from '@angular/router';

interface NominatimResult {
  lat: string;
  lon: string;
  display_name: string;
}


@Component({
  selector: 'app-pending',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatSortModule,
    MatIconModule,
    FormsModule,
    MatButton,
  ],
  templateUrl: './pending.component.html',
  styleUrls: ['./pending.component.scss']
})
export class PendingComponent implements OnInit {
  displayedColumns: string[] = [
    'createdAt',
    'id',
    'customerId',
    'customerUsername',
    'rating',
    'start',
    'destination',
    'distance',
    'requestedCarClass',
    'actions'
  ];
  dataSource = new MatTableDataSource<RideRequestDto>();
  driverLat: number | null = null;
  driverLng: number | null = null;
  hasDriverSentOffer: boolean = false;
  driverName!: string;
  driverRating?: number;
  driverTotalRides?: number ;
  addressQuery = '';
  suggestions: NominatimResult[] = [];


  @ViewChild(MatSort) sort!: MatSort;

  constructor(
    private rideRequestService: RideRequestService,
    private http: HttpClient,
    private geocodingService: GeocodingService,
    private userService: UserService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.userService.getMyProfile().subscribe(profile => {
      this.driverName = profile.username;
      this.driverRating = profile.rating;
      this.driverTotalRides = profile.totalRides;

      this.hasDriverSentOffer = profile.hasSentOffer || false;
    });
    this.rideRequestService.getActiveRideRequests().subscribe(data => {
      this.dataSource.data = data;
      this.dataSource.sort = this.sort;
    });
  }

  formatCoords(lat: number, lng: number): string {
    return `${lat}, ${lng}`;
  }

  updateDistances(): void {
    if (this.driverLat == null || this.driverLng == null) {
      console.warn('Fahrerkoordinaten fehlen!');
      return;
    }
    (this.dataSource.data as any[]).forEach(req => {
      this.calculateORS(
        this.driverLng!, this.driverLat!,
        req.startLongitude, req.startLatitude,
        dist => {
          (req as any).distance = dist;
          this.dataSource.data = [...this.dataSource.data];
        }
      );
    });
  }

  private calculateORS(
    fromLng: number, fromLat: number,
    toLng: number, toLat: number,
    callback: (distanceInKm: number) => void
  ): void {
    const url = 'https://api.openrouteservice.org/v2/directions/driving-car';
    const headers = new HttpHeaders({
      'Authorization': '5b3ce3597851110001cf62489ddae00d6d2d41ea9f27adc8f63be42a',
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    });

    const body = {
      coordinates: [
        [fromLng, fromLat],
        [toLng, toLat]
      ]
    };

    this.http.post<any>(url, body, { headers }).subscribe({
      next: res => {
        const meters = res.routes?.[0]?.summary?.distance ?? -1;
        const km = meters / 1000;
        callback(km);
        console.log('ORS response:', res);
      },

    });
  }

  searchAddress(): void {
    if (!this.addressQuery || this.addressQuery.length < 3) {
      this.suggestions = [];
      return;
    }

    this.geocodingService.search(this.addressQuery).subscribe({
      next: results => this.suggestions = results,
      error: err => {
        console.error('Geocoding-Fehler:', err);
        this.suggestions = [];
      }
    });
  }

  selectSuggestion(s: NominatimResult): void {
    this.driverLat = parseFloat(s.lat);
    this.driverLng = parseFloat(s.lon);
    this.addressQuery = s.display_name;
    this.suggestions = [];
  }

  useCurrentLocation(): void {
    if (!navigator.geolocation) {
      alert('Geolocation wird von diesem Browser nicht unterstützt.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      pos => {
        this.driverLat = pos.coords.latitude;
        this.driverLng = pos.coords.longitude;
        console.log('Aktueller Standort:', this.driverLat, this.driverLng);
      },
      err => {
        console.error('Geolocation-Fehler:', err);
        alert('Standort konnte nicht ermittelt werden.');
      },
      { enableHighAccuracy: true }
    );
  }






  sendOffer(req: RideRequestDto): void {
    if (this.hasDriverSentOffer) {
      alert('Sie haben bereits ein Angebot gesendet!');
      return;
    }

  const offer: OfferDto = {
    driverName: this.driverName,
    driverRating: this.driverRating ?? 0,
    driverTotalRides: this.driverTotalRides ?? 0
  };

  this.rideRequestService.sendOffer(req.id, offer).subscribe({
    next: (updatedRequest) => {
      req.offers = updatedRequest.offers;
      alert('Angebot erfolgreich gesendet!');
      this.router.navigate(['/home']);
    },
    error: (error) => {
      console.error('Fehler beim Senden des Angebots:', error);

      if (error.status === 403) {
        alert('Sie haben bereits ein Angebot gesendet. Sie können nur ein Angebot pro Fahranfrage senden.');
      } else {
        alert('Fehler beim Senden des Angebots. Bitte versuchen Sie es später erneut.');
      }
    }
  });
}
canSendOffer(): boolean {
    return !this.hasDriverSentOffer;
  }

}
