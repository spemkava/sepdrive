import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { RideRequestService } from '../../services/RideRequest.service';
import { UserService } from '../../services/user.service';
import { RideRequestDto } from '../../models/ride-request-dto.model';

@Component({
  selector: 'app-my-offers',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatSnackBarModule
  ],
  templateUrl: './my-offers.component.html',
  styleUrls: ['./my-offers.component.scss']
})
export class MyOffersComponent implements OnInit {
  myOffers: RideRequestDto[] = [];
  isLoading = false;
  errorMessage: string | null = null;

  displayedColumns: string[] = [
    'createdAt',
    'customerUsername',
    'start',
    'destination',
    'carClass',
    'price',
    'actions'
  ];

  constructor(
    private rideRequestService: RideRequestService,
    private userService: UserService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadMyOffers();
  }

  loadMyOffers(): void {
    this.isLoading = true;
    this.errorMessage = null;

    this.rideRequestService.getMyActiveOffers().subscribe({
      next: (offers) => {
        this.myOffers = offers;
        this.isLoading = false;
        console.log('Meine Angebote geladen:', offers);
      },
      error: (error) => {
        console.error('Fehler beim Laden der eigenen Angebote:', error);
        this.errorMessage = 'Fehler beim Laden der Angebote.';
        this.isLoading = false;
        this.snackBar.open('Fehler beim Laden der Angebote', 'OK', { duration: 3000 });
      }
    });
  }

  cancelOffer(rideRequestId: number): void {
    if (!confirm('Möchten Sie Ihr Angebot wirklich stornieren?')) {
      return;
    }

    this.rideRequestService.cancelOwnOffer(rideRequestId).subscribe({
      next: () => {
        this.snackBar.open('Angebot erfolgreich storniert!', 'OK', { duration: 3000 });

        // Entferne das stornierte Angebot aus der Liste
        this.myOffers = this.myOffers.filter(offer => offer.id !== rideRequestId);

        // Aktualisiere den hasSentOffer Status im UserService
        this.userService.refreshProfile();
      },
      error: (error) => {
        console.error('Fehler beim Stornieren des Angebots:', error);
        let errorMessage = 'Fehler beim Stornieren des Angebots.';

        if (error.status === 404) {
          errorMessage = 'Angebot nicht gefunden oder bereits entfernt.';
        } else if (error.status === 409) {
          errorMessage = 'Angebot kann nicht storniert werden - Fahranfrage ist nicht mehr aktiv.';
        } else if (error.error && typeof error.error === 'string') {
          errorMessage = error.error;
        }

        this.snackBar.open(errorMessage, 'OK', { duration: 5000 });
      }
    });
  }

  formatCoords(lat: number, lng: number): string {
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  }

  goToPendingRequests(): void {
    this.router.navigate(['/pending']);
  }

  goHome(): void {
    this.router.navigate(['/home']);
  }
}
