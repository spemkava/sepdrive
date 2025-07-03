import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Router } from '@angular/router';

import { LoginRequestDto } from '../models/login-request-dto.model';
import { LoginResponseDto } from '../models/login-response-dto.model';
import { Verify2FARequestDto } from '../models/verify-2fa-request-dto.model';
import { Verify2FAResponseDto } from '../models/verify-2fa-response-dto.model';
import { UserService } from './user.service';
@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private apiUrl = 'http://localhost:8080/api/auth';

  constructor(private http: HttpClient, private router: Router, private userService: UserService) { }

  register(formData: FormData): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/register`, formData);
  }

  login(credentials: LoginRequestDto): Observable<LoginResponseDto> {
    const httpOptions = {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' })
    };
    return this.http.post<LoginResponseDto>(`${this.apiUrl}/login`, credentials, httpOptions);
  }

  verify2fa(data: Verify2FARequestDto): Observable<Verify2FAResponseDto> {
    const httpOptions = {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' })
    };
    return this.http.post<Verify2FAResponseDto>(`${this.apiUrl}/verify-2fa`, data, httpOptions);
  }

  isLoggedIn(): boolean {
    return localStorage.getItem('authToken') !== null;
  }

  logout(): void {
    localStorage.removeItem('authToken');
    localStorage.removeItem('tokenType');
    localStorage.removeItem('userRole');
    localStorage.removeItem('username');
    localStorage.removeItem('profileImageUrl');

    if (this.userService) {
      this.userService.clearUserProfile();
    }

    this.router.navigate(['/login']);

  }
}
