import {Observable} from 'rxjs';
import {HttpClient} from '@angular/common/http';
import {Injectable} from '@angular/core';
import {RideRequestDto} from '../models/ride-request-dto.model';

@Injectable({
  providedIn: 'root'
})

export class RideHistoryService {

  private apiUrl = 'http://localhost:8080/api/ride-history';

  constructor(private http: HttpClient) { }

  getCompleted(): Observable<RideRequestDto[]> {
    return this.http.get<RideRequestDto[]>(`${this.apiUrl}/history`)
  }
}
