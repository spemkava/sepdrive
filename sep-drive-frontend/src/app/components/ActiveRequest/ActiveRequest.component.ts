import {Component, OnInit, ViewChild} from '@angular/core';
import { CommonModule } from '@angular/common'; // Für AsyncPipe, NgIf, DatePipe
import {Observable, Subject, of, BehaviorSubject} from 'rxjs'; // Subject für Refresh
import { catchError, switchMap, startWith, tap } from 'rxjs/operators'; // RxJS Operatoren

import { RideRequestService } from '../../services/RideRequest.service' ;  // Import RideRequestService
import { RideRequestDto } from '../../models/ride-request-dto.model'; // Import RideRequestDto
import {MapVisualizerComponent} from '../MapVisualizer/MapVisualizer.component';

@Component({
  selector: 'app-active-request',
  standalone: true,
  imports: [
    CommonModule,
    MapVisualizerComponent,
    // Stellt AsyncPipe, NgIf, DatePipe etc. bereit
  ],
  templateUrl: './ActiveRequest.component.html',
  styleUrl: './ActiveRequest.component.scss'
})
export class ActiveRequestComponent implements OnInit {

  //Für Map
  @ViewChild(MapVisualizerComponent) mapVisualizerComponent!: MapVisualizerComponent;
  private _startCoords$ = new BehaviorSubject<[number, number] | undefined>(undefined);
  startCoords$ = this._startCoords$.asObservable();
  private _destinationCoords$ = new BehaviorSubject<[number, number] | undefined>(undefined);
  destinationCoords$ = this._destinationCoords$.asObservable();

  // Observable, das die aktive Anfrage (oder null) hält
  activeRequest$!: Observable<RideRequestDto | null>;
  errorMessage: string | null = null;
  isLoading: boolean = false; // Für Ladeanzeige
  cancellationMessage: string | null = null; // Für Erfolgs-/Fehlermeldung beim Stornieren

  // Ein Subject, um das Neuladen der Daten anzustoßen (z.B. nach Stornierung)
  private refreshSubject = new Subject<void>();

  constructor(private rideRequestService: RideRequestService) {}

  ngOnInit(): void {
    // Definiere den Observable-Stream für die aktive Anfrage
    this.activeRequest$ = this.refreshSubject.pipe(
      startWith(undefined), // Löst den ersten Ladevorgang sofort aus
      tap(() => { // Vor dem Laden: Ladezustand setzen, Meldungen löschen
        this.isLoading = true;
        this.errorMessage = null;
        this.cancellationMessage = null;
        console.log('Fetching active request...');
      }),
      // Wechsle zum eigentlichen HTTP-Aufruf im Service
      switchMap(() => this.rideRequestService.getActiveRequest()),
      tap((data) => { // Nach dem Laden: Ladezustand zurücksetzen
        this.isLoading = false;
        console.log('Active request data received:', data);
        if(data) {
          this._startCoords$.next([data.startLatitude, data.startLongitude]);
          this._destinationCoords$.next([data.destinationLatitude, data.destinationLongitude]);
        }
      }),
      catchError(err => { // Fehlerbehandlung für den Ladevorgang
        console.error('Error loading active ride request:', err);
        this.errorMessage = 'Aktive Fahranfrage konnte nicht geladen werden.';
        this.isLoading = false;
        return of(null); // Gib null zurück, damit der Stream nicht abbricht
      })
    );
  }



  // Methode, die aufgerufen wird, wenn der Stornieren-Button geklickt wird
  cancelRequest(): void {
    this.isLoading = true; // Zeige Ladezustand
    this.errorMessage = null;
    this.cancellationMessage = null;
    console.log('Attempting to cancel active request...');

    this.rideRequestService.cancelActiveRequest().subscribe({
      next: () => {
        // Erfolg beim Stornieren
        console.log('Active request cancelled successfully.');
        this.isLoading = false;
        this.cancellationMessage = 'Fahranfrage erfolgreich storniert.';
        // Stoße das Neuladen der Daten an (sollte jetzt null oder Fehler sein)
        this.refreshSubject.next();
        // Blende Meldung nach 3 Sekunden aus
        setTimeout(() => this.cancellationMessage = null, 3000);
      },
      error: (err) => {
        // Fehler beim Stornieren
        console.error('Error cancelling active ride request:', err);
        this.isLoading = false;
        if (err.status === 404) {
          // Sollte nicht passieren, wenn der Button nur bei aktiver Anfrage da ist, aber sicher ist sicher
          this.errorMessage = 'Keine aktive Fahranfrage zum Stornieren gefunden.';
          this.refreshSubject.next(); // Lade neu, um "keine Anfrage" anzuzeigen
        } else {
          this.errorMessage = 'Fehler beim Stornieren der Fahranfrage.';
        }
      }
    });
  }
}
