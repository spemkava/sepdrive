import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, of, throwError } from 'rxjs';
import { RideRequestDto } from '../models/ride-request-dto.model';       // Import Response-DTO
import {CreateRideRequestDto} from '../models/create-ride-request-dto.model';
import {OfferDto} from '../models/offer-dto.model';

@Injectable({
  providedIn: 'root'
})
export class RideRequestService {

  // Basis-URL für die Fahranfrage-Endpunkte im Backend
  private apiUrl = 'http://localhost:8080/api/ride-requests';

  constructor(private http: HttpClient) { }

  /**
   * Sendet eine Anfrage zum Erstellen einer neuen Fahranfrage an das Backend.
   * @param data Die Daten für die neue Anfrage (Start, Ziel, Klasse).
   * @returns Ein Observable, das das DTO der erstellten Anfrage liefert.
   */
  createRequest(data: CreateRideRequestDto): Observable<RideRequestDto> {
    // Sendet POST an /api/ride-requests
    // Der AuthInterceptor sollte das JWT hinzufügen.
    return this.http.post<RideRequestDto>(this.apiUrl, data);
    // Die Fehlerbehandlung (z.B. für 409 Conflict) sollte in der Komponente erfolgen,
    // die diese Methode aufruft.
  }

  /**
   * Ruft die aktuell aktive Fahranfrage des eingeloggten Benutzers ab.
   * @returns Ein Observable, das das RideRequestDto liefert, falls eine aktive Anfrage existiert, sonst null.
   */
  getActiveRequest(): Observable<RideRequestDto | null> { //Observable = Objekt was subscribed wird, und bei state changes ein Event triggered
    // Sendet GET an /api/ride-requests/active
    return this.http.get<RideRequestDto>(`${this.apiUrl}/active`).pipe( //gibt RideRequest dto, pipes transformieren Daten automatisch
      catchError((error: HttpErrorResponse) => { //guckt ob Fehler
        if (error.status === 404) {
          // Nur als Info, keine aktive Anfrage gefunden
          return of(null); // Gibt null als "http response" (fake) zurück, damit die Komponente weiß, dass nichts da ist
        } else {
          // Andere Fehler (401, 500 etc.) an die Komponente weitergeben.
          console.error('Error fetching active ride request:', error);
          return throwError(() => error); // Wirft den Fehler weiter
        }
      })
    );
  }

  /**
   * Überschreibt die angegebene Fahranfrage
   * @param id die id der RideRequest, welche geändert werden soll
   * @param data die Daten, die geändert werden
   * @returns Ein Observable, das das DTO der geänderten Anfrage liefert.
   */
  updateRequest(id: number, data: Partial<RideRequestDto>): Observable<RideRequestDto> {
    const url = `${this.apiUrl}/${id}`;
    return this.http.put<RideRequestDto>(url, data).pipe(
      catchError((error: HttpErrorResponse) => {
        console.error('Fehler beim Aktualisieren der Fahranfrage:', error);
        return throwError(() => error);
      })
    );
  }

  getActiveRideRequests(): Observable<RideRequestDto[]> {
    return this.http.get<RideRequestDto[]>(`${this.apiUrl}/pending`);
  }


  /**
   * Sendet eine Anfrage zum Stornieren/Löschen der aktiven Fahranfrage.
   * @returns Ein Observable<void>, das bei Erfolg abschließt.
   */
  cancelActiveRequest(): Observable<void> {

    return this.http.delete<void>(`${this.apiUrl}/active`);

  }
   /**

   * @param rideId Die ID der Fahrt
   * @param customerId Die ID des Kunden
   * @param driverId Die ID des Fahrers
   * @param amount Der zu zahlende Betrag
   */
  executePayment(rideId: number, customerId: number, driverId: number, amount: number): Observable<any> {
    const url = `${this.apiUrl}/${rideId}/pay`;
    const payload = { customerId, driverId, amount };

    return this.http.post(url, payload).pipe(
      catchError(err => {
        console.error('Fehler beim Ausführen der Zahlung', err);
        throw err;
      })
    );
  }

  sendOffer(rideRequestId: number, offerData: OfferDto): Observable<RideRequestDto> {
    return this.http.post<RideRequestDto>(`${this.apiUrl}/${rideRequestId}/offers`, offerData);
  }

  acceptOffer(rideRequestId:number, offerId:number): Observable<RideRequestDto>  {
    return this.http.get<RideRequestDto>(`${this.apiUrl}/${rideRequestId}/${offerId}/accept`)
  }

  rejectOffer(rideRequestId:number, offerId:number): Observable<RideRequestDto>  {
    return this.http.get<RideRequestDto>(`${this.apiUrl}/${rideRequestId}/${offerId}/reject`)
  }

  getAcceptedRequest(): Observable<RideRequestDto | null> { //Observable = Objekt was subscribed wird, und bei state changes ein Event triggered
    // Sendet GET an /api/ride-requests/active
    return this.http.get<RideRequestDto>(`${this.apiUrl}/accepted`).pipe( //gibt RideRequest dto, pipes transformieren Daten automatisch
      catchError((error: HttpErrorResponse) => { //guckt ob Fehler
        if (error.status === 404) {
          // Nur als Info, keine aktive Anfrage gefunden
          return of(null); // Gibt null als "http response" (fake) zurück, damit die Komponente weiß, dass nichts da ist
        } else {
          // Andere Fehler (401, 500 etc.) an die Komponente weitergeben.
          console.error('Error fetching active ride request:', error);
          return throwError(() => error); // Wirft den Fehler weiter
        }
      })
    );
  }

  submitRating(rideRequestId: number, rating:number): Observable<RideRequestDto> {
    return this.http.get<RideRequestDto>(`${this.apiUrl}/${rideRequestId}/${rating}/rating`);
  }

  completeRequest(rideRequestId: number) {
    return this.http.get<RideRequestDto>(`${this.apiUrl}/${rideRequestId}/complete`);
  }

  /**
   * Storniert das eigene Angebot für eine Fahranfrage
   * @param rideRequestId ID der Fahranfrage
   * @returns Ein Observable mit der aktualisierten Fahranfrage
   */
  cancelOwnOffer(rideRequestId: number): Observable<RideRequestDto> {
    return this.http.delete<RideRequestDto>(`${this.apiUrl}/${rideRequestId}/offers/cancel`).pipe(
      catchError((error: HttpErrorResponse) => {
        console.error('Fehler beim Stornieren des eigenen Angebots:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Ruft alle aktiven Angebote des eingeloggten Fahrers ab
   * @returns Ein Observable mit der Liste der Fahranfragen mit eigenen Angeboten
   */
  getMyActiveOffers(): Observable<RideRequestDto[]> {
    return this.http.get<RideRequestDto[]>(`${this.apiUrl}/my-offers`).pipe(
      catchError((error: HttpErrorResponse) => {
        console.error('Fehler beim Laden der eigenen Angebote:', error);
        return throwError(() => error);
      })
    );
  }
}
