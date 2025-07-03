import {Injectable} from '@angular/core';
import {catchError, Observable, of} from 'rxjs';
import {HttpClient} from '@angular/common/http';
import {RideDtoModel} from '../models/ride-dto.model';
import {map} from 'rxjs/operators';



@Injectable({
  providedIn: 'root'
})
export class RideService {

  private apiUrl = 'http://localhost:8080/api/rides'; // Passe ggf. den API-Pfad an!

  constructor(private http: HttpClient) {}

  /**
   * Holt die aktuell aktive Fahrt für den eingeloggten Nutzer.
   * (Der Endpoint muss so im Backend implementiert sein.)
   */
  getCurrentActiveRide(): Observable<RideDtoModel | null> {
    return this.http.get<RideDtoModel>(`${this.apiUrl}/active`).pipe(
      catchError(() => of(null)) // Wenn keine Fahrt vorhanden, liefere null
    );
  }
  acceptRequest(rideRequestId: number, driverId: number): Observable<RideDtoModel> {
    return this.http.post<RideDtoModel>(`/api/rides/from-request/${rideRequestId}/accept?driverId=${driverId}`, {});
  }

  /**
   * Holt alle abgeschlossenen oder laufenden Fahrten für den Nutzer.
   * (Kann als Array oder paginiert zurückgeliefert werden.)
   */
  getAllRides(): Observable<RideDtoModel[]> {
    return this.http.get<RideDtoModel[]>(this.apiUrl);
  }

  /**
   * Holt die Details einer bestimmten Fahrt (z.B. für Verlauf, Bewertung, etc.)
   */
  getRideById(rideId: number): Observable<RideDtoModel> {
    return this.http.get<RideDtoModel>(`${this.apiUrl}/${rideId}`);
  }

  /**
   * Optional: Bewertung abschicken
   */
  submitRating(rideId: number, rating: number): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/${rideId}/rate`, { rating });
  }

  getRoute(startLat: number, startLon: number, endLat: number, endLon: number): Observable<number[][]> {
    console.log('Start:', startLat, startLon, 'End:', endLat, endLon);
    return this.http.get<any>(`http://localhost:8080/api/route?startLat=${startLat}&startLon=${startLon}&endLat=${endLat}&endLon=${endLon}`).pipe(
      map(res => {
        console.log('Backend Response für getRoute:', res);
        if (!res.features || res.features.length === 0) {
          console.error('Keine Routen im Response vorhanden:', res);
          return [];
        }

        const coords = res.features[0]?.geometry?.coordinates;
        if (!coords || !Array.isArray(coords)) {
          console.error('Keine gültigen Koordinaten in der Route:', res);
          return [];
        }

        const feature = res.features[0];
        if (!feature.geometry || feature.geometry.type !== 'LineString' || !feature.geometry.coordinates) {
          console.error('Keine gültige LineString Geometrie in der Route:', feature);
          return [];
        }
        return feature.geometry.coordinates;
      })
    );
  }
  // Weitere Methoden je nach Bedarf: Fahrt beenden, neue Fahrt anlegen (selten direkt), etc.
}
