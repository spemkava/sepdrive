import {Injectable} from '@angular/core'
import {HttpClient} from '@angular/common/http'
import {Observable} from 'rxjs'
import {UserProfile} from '../models/user-profile.model';

@Injectable({
  providedIn: 'root'
})

export class LeaderboardService {

  private apiUrl = 'http://localhost:8080/api/leaderboard'

  constructor(private http: HttpClient) { }

  getDrivers(): Observable<UserProfile[]> {
    return this.http.get<UserProfile[]>(`${this.apiUrl}/drivers`)
  }

  getTotalDistance(driverId: number): Observable<number> {
    return this.http.get<number>(`${this.apiUrl}/total-distance/${driverId}`);
  }

  getTotalAvgRating(driverId: number): Observable<number> {
    return this.http.get<number>(`${this.apiUrl}/total-avg-rating/${driverId}`);
  }

  getTotalDrivingTime(driverId: number): Observable<number> {
    return this.http.get<number>(`${this.apiUrl}/total-driving-time/${driverId}`);
  }

  getTotalRides(driverId: number): Observable<number> {
    return this.http.get<number>(`${this.apiUrl}/total-rides/${driverId}`);
  }

  getTotalMoney(driverId: number): Observable<number> {
    return this.http.get<number>(`${this.apiUrl}/total-money/${driverId}`);
  }
}
