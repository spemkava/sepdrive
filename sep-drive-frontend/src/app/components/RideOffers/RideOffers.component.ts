import {Component} from '@angular/core';
import {CommonModule} from '@angular/common';
import { RideRequestDto } from '../../models/ride-request-dto.model';
import { RideRequestService } from '../../services/RideRequest.service';
import { catchError, Observable, of, startWith, Subject, switchMap, tap } from 'rxjs';
import { Router } from '@angular/router';


@Component({
  selector: 'app-RideOffers',
  imports: [
    CommonModule,
  ],
  templateUrl: './RideOffers.component.html',
  styleUrls: ['./RideOffers.component.scss']
})
export class RideOffersComponent {
    //variables
    rideRequest: RideRequestDto | null=null;
    activeRequest$!: Observable<RideRequestDto | null>;
    errorMessage: string | null = null;

    //Sort Table Variables
    sortColumn: string = ''
    sortDirectionAsc: boolean = true

    // Ein Subject, um das Neuladen der Daten anzustoßen (z.B. nach Stornierung)
    private refreshSubject = new Subject<void>();

    constructor(
        private router: Router,
        private rideRequestService: RideRequestService
    ){}

    ngOnInit(): void {
    this.activeRequest$ = this.refreshSubject.pipe(
          startWith(undefined), // Löst den ersten Ladevorgang sofort aus
          tap(() => { // Vor dem Laden: Ladezustand setzen, Meldungen löschen
            this.errorMessage = null;
            console.log('Fetching active request...');
          }),
          // Wechsle zum eigentlichen HTTP-Aufruf im Service
          switchMap(() => this.rideRequestService.getActiveRequest()),
          tap((data) => {
            console.log('Active request data received:', data);
            this.rideRequest = data;
          }),
          catchError(err => { // Fehlerbehandlung für den Ladevorgang
            console.error('Error loading active ride request:', err);
            this.errorMessage = 'Aktive Fahranfrage konnte nicht geladen werden.';
            return of(null); // Gib null zurück, damit der Stream nicht abbricht
          })
        );
    }


  sortTable(column: string) {
    if (this.sortColumn === column) {
      this.sortDirectionAsc = !this.sortDirectionAsc
    } else {
      this.sortColumn = column
      this.sortDirectionAsc = true
    }
    if(this.rideRequest?.offers) {
    this.rideRequest?.offers.sort((a, b) => {
      const valA = this.getValue(a,column)
      const valB = this.getValue(b, column)

      if (valA == null) return 1
      if (valB == null) return -1

      if (typeof valA === 'string' && typeof valB === 'string') {
        return this.sortDirectionAsc ? valA.localeCompare(valB) : valB.localeCompare(valA)
      } else {
        return this.sortDirectionAsc ? valA - valB : valB - valA
      }
    })
    }
  }

  private getValue(obj: any, key: string): any {
    const value = obj[key]
    return value;
  }

    acceptOffer(offerId: number) {
        console.log('Annahme senden für Angebot:', this.rideRequest?.id,offerId);
        if (this.rideRequest) {
          this.rideRequestService.acceptOffer(this.rideRequest.id, offerId).subscribe({
          next:(updatedRequest) => {
            if (this.rideRequest) {
              this.rideRequest.offers = updatedRequest.offers;
            }
            alert('Angebot angenommen!');
            this.router.navigate(['/home']); // leitet weiter
          },
        })
      }
    }

    rejectOffer(offerId:number) {
        console.log('Ablehnung senden für Angebot:', this.rideRequest?.id,offerId);
        if (this.rideRequest) {
          this.rideRequestService.rejectOffer(this.rideRequest.id, offerId).subscribe({
          next:(updatedRequest) => {
            if (this.rideRequest) {
              this.rideRequest.offers = updatedRequest.offers;
            }
            alert('Angebot abgelehnt!');
          },
        })
      }
    }
}