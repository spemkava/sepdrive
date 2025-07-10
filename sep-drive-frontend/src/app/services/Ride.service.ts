import {Injectable} from '@angular/core';
import {catchError, Observable, of} from 'rxjs';
import {HttpClient} from '@angular/common/http';
import {RideDtoModel} from '../models/ride-dto.model';
import {map} from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class RideService {

  private apiUrl = 'http://localhost:8080/api/rides'; // ✅ Basis URL korrekt

  constructor(private http: HttpClient) {}

  /**
   * ✅ KORRIGIERT: Korrekte URL ohne zusätzliche Zeichen
   */
  getCurrentActiveRide(): Observable<RideDtoModel | null> {
    console.log('🔍 Fetching current active ride from:', `${this.apiUrl}/active`);

    return this.http.get<RideDtoModel>(`${this.apiUrl}/active`).pipe(
      catchError((error) => {
        console.error('❌ Error fetching active ride:', error);
        console.error('Error details:', {
          status: error.status,
          statusText: error.statusText,
          url: error.url,
          message: error.message
        });
        return of(null); // Wenn keine Fahrt vorhanden, liefere null
      })
    );
  }

  acceptRequest(rideRequestId: number, driverId: number): Observable<RideDtoModel> {
    const url = `${this.apiUrl}/from-request/${rideRequestId}/accept?driverId=${driverId}`;
    console.log('🎯 Accepting ride request:', url);

    return this.http.post<RideDtoModel>(url, {}).pipe(
      catchError((error) => {
        console.error('❌ Error accepting ride request:', error);
        throw error;
      })
    );
  }

  getAllRides(): Observable<RideDtoModel[]> {
    return this.http.get<RideDtoModel[]>(this.apiUrl);
  }

  getRideById(rideId: number): Observable<RideDtoModel> {
    return this.http.get<RideDtoModel>(`${this.apiUrl}/${rideId}`);
  }

  submitRating(rideId: number, rating: number): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/${rideId}/rate`, { rating });
  }

  getRoute(startLat: number, startLon: number, endLat: number, endLon: number): Observable<number[][]> {
    console.log('🗺️ Getting route from backend API');
    const url = `http://localhost:8080/api/route?startLat=${startLat}&startLon=${startLon}&endLat=${endLat}&endLon=${endLon}`;

    return this.http.get<any>(url).pipe(
      map(res => {
        console.log('✅ Route response received:', res);
        if (!res.features || res.features.length === 0) {
          console.error('❌ No route features found');
          return [];
        }

        const feature = res.features[0];
        if (!feature.geometry || feature.geometry.type !== 'LineString' || !feature.geometry.coordinates) {
          console.error('❌ Invalid route geometry');
          return [];
        }

        console.log('✅ Route coordinates extracted:', feature.geometry.coordinates.length, 'points');
        return feature.geometry.coordinates;
      }),
      catchError((error) => {
        console.error('❌ Route request failed:', error);
        return of([]);
      })
    );
  }
  // Weitere Methoden je nach Bedarf: Fahrt beenden, neue Fahrt anlegen (selten direkt), etc.
 //TODO: Implementiere die updateRoute-Methode

  updateRoute(body: {
    rideId: number;
    newDestinationLat: number | null;
    newDestinationLon: number | null;
    waypoints: { lat: number; lon: number }[];
    currentLat: number;
    currentLon: number;
  }): Observable<{
    geoJson: string;
    distance: number;
    duration: number;
    price: number;
  }> {
    return this.http.post<{
      geoJson: string;
      distance: number;
      duration: number;
      price: number;
    }>(`http://localhost:8080/api/route/rides/${body.rideId}/update-route`, body).pipe(
      catchError(err => {
        console.error('updateRoute fehlgeschlagen', err);
        return of({
          geoJson: '',
          distance: 0,
          duration: 0,
          price: 0
        });
      })
    );
  }
}
