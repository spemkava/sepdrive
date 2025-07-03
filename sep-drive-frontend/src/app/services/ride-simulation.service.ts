import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';


import { RideData } from '../models/ride-data.model';

@Injectable({
  providedIn: 'root'
})

export class RideSimulationService {
  private apiUrl = 'http://localhost:8080/api/ride-simulation';

  constructor(private http: HttpClient) {}

  getProgress(rideId: number): Observable<RideData> {
    return this.http.get<RideData>(`${this.apiUrl}/${rideId}/progress`);
  }
  pause(rideId: number): Observable<any> {
    return this.http.post<void>(`${this.apiUrl}/${rideId}/pause`, {});
  }

  resume(rideId: number): Observable<any> {
    return this.http.post<void>(`${this.apiUrl}/${rideId}/resume`, {});
  }

  setSpeed(rideId: number, speed: number): Observable<any> {
    return this.http.post<void>(`${this.apiUrl}/${rideId}/speed/${speed}`, {});
  }
}
