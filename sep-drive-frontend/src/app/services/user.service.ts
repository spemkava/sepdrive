import { Injectable } from '@angular/core';
import {HttpClient, HttpParams} from '@angular/common/http';
import { UserProfile } from '../models/user-profile.model';
// Importiere 'throwError' direkt aus 'rxjs'
import { Observable, BehaviorSubject, tap, catchError, throwError } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private apiUrl = 'http://localhost:8080/api/users';

  private currentUserProfileSubject = new BehaviorSubject<UserProfile | null>(null);
  public currentUserProfile$ = this.currentUserProfileSubject.asObservable();

  constructor(private http: HttpClient) { }

  getMyProfile(): Observable<UserProfile> {
    console.log('UserService: getMyProfile aufgerufen');
    return this.http.get<UserProfile>(`${this.apiUrl}/me`).pipe(
      tap(profile => {
        console.log('UserService: getMyProfile - Profil vom Backend empfangen:', profile);
        this.currentUserProfileSubject.next(profile);
        if (profile) {
          localStorage.setItem('userRole', profile.role);
          localStorage.setItem('username', profile.username);
        }
        if (profile && profile.profilePictureUrl) {
          localStorage.setItem('profileImageUrl', profile.profilePictureUrl);
        } else {
          localStorage.removeItem('profileImageUrl');
        }
      }),
      catchError(err => {
        console.error('UserService: Fehler beim Laden des Profils in getMyProfile:', err);
        this.currentUserProfileSubject.next(null);
        localStorage.removeItem('profileImageUrl');
        localStorage.removeItem('userRole');
        localStorage.removeItem('username');
        return throwError(() => new Error('Fehler beim Laden des Profils in UserService.'));
      })
    );
  }

  public loadInitialProfile(): void {
    console.log('UserService: loadInitialProfile aufgerufen');
    if (localStorage.getItem('authToken')) {
      this.getMyProfile().subscribe({
        next: profile => console.log('UserService: loadInitialProfile - Profil erfolgreich geladen:', profile),
        error: err => console.error('UserService: Fehler beim initialen Laden des Profils in loadInitialProfile:', err)
      });
    } else {
      console.log('UserService: loadInitialProfile - Kein AuthToken gefunden, Profil wird nicht geladen.');
    }
  }

  public getCurrentUserProfile(): UserProfile | null {
    return this.currentUserProfileSubject.getValue();
  }

  getUserProfile(username: any): Observable<UserProfile> {
    return this.http.get<UserProfile>(`${this.apiUrl}/${username}`);
  }

  uploadProfilePicture(userId: number, formData: FormData): Observable<any> {
    return this.http.post(`${this.apiUrl}/${userId}/upload-profileImage`, formData, {
      responseType: 'text'
    });
  }

  clearUserProfile(): void {
    this.currentUserProfileSubject.next(null);
    localStorage.removeItem('profileImageUrl');
  }
  searchUsers(query: string): Observable<UserProfile[]> {
    const params = new HttpParams().set('q', query);
    return this.http.get<UserProfile[]>(`${this.apiUrl}/search`, { params });
  }
  refreshProfile(): void {
    this.getMyProfile().subscribe();
  }

   addFunds(userId: number, amount: number): Observable<UserProfile> {
    const depositRequest = { amount: amount };
    console.log(`UserService: addFunds aufgerufen für User ${userId} mit Betrag ${amount}`);
    return this.http.post<UserProfile>(`${this.apiUrl}/${userId}/account/deposit`, depositRequest).pipe(
      tap(updatedProfile => {
        console.log('UserService: addFunds - Aktualisiertes Profil nach Einzahlung:', updatedProfile);
        const currentUser = this.currentUserProfileSubject.getValue();
        if (currentUser && currentUser.id === userId) {
          this.currentUserProfileSubject.next(updatedProfile);
        }
      }),
      catchError(err => {
        console.error(`UserService: Fehler in addFunds für User ${userId}:`, err);
        return throwError(() => new Error('Fehler beim Aufladen des Guthabens.'));
      })
    );
  }

  getAccountBalance(userId: number): Observable<{ userId: number, balance: number }> {
    console.log(`UserService: getAccountBalance aufgerufen für User ${userId}`);
    return this.http.get<{ userId: number, balance: number }>(`${this.apiUrl}/${userId}/account/balance`).pipe(
      tap(response => console.log(`UserService: getAccountBalance - Antwort für User ${userId}:`, response)),
      catchError(err => {
        console.error(`UserService: Fehler in getAccountBalance für User ${userId}:`, err);
        return throwError(() => new Error('Fehler beim Abrufen des Kontostands.'));
      })
    );
  }
}
