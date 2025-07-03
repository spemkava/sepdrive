import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

interface NominatimResult {
  lat: string;
  lon: string;
  display_name: string;
}

@Injectable({ providedIn: 'root' })
export class GeocodingService {
  private url = 'https://nominatim.openstreetmap.org/search';

  constructor(private http: HttpClient) {}

  /**
   * Sucht Adressen via OpenStreetMap Nominatim.
   * @param query Freitext-Adresse
   * @returns Observable mit bis zu 5 Treffern
   */
  search(query: string): Observable<NominatimResult[]> {
    const params = new HttpParams()
      .set('q', query)
      .set('format', 'json')
      .set('addressdetails', '1')
      .set('limit', '5');
    return this.http.get<NominatimResult[]>(this.url, { params });
  }
}
