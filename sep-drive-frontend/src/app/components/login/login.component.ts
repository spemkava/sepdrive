import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../services/auth.service';
import { LoginRequestDto } from '../../models/login-request-dto.model';
import { LoginResponseDto } from '../../models/login-response-dto.model';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink
  ],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {


  loginForm!: FormGroup;
  errorMessage: string | null = null;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {}
  ngOnInit(): void {
    this.loginForm = this.fb.group({
      username: ['', [Validators.required]],
      password: ['', [Validators.required]]
    });
  }

  onSubmit(): void {
    this.errorMessage = null;

    if (this.loginForm.invalid) {
      this.errorMessage = 'Bitte gib Benutzernamen und Passwort ein.';
      this.loginForm.markAllAsTouched();
      return;
    }

    const credentials: LoginRequestDto = this.loginForm.value;
    this.authService.login(credentials).subscribe({
      next: (response: LoginResponseDto) => {
        console.log('Login attempt successful, checking 2FA', response);
        if (response.twoFactorRequired) {
          const username = this.loginForm.value.username;
          console.log('Navigating to verify-2fa for user:', username);
          this.router.navigate(['/verify-2fa'], { queryParams: { username: username } });
        }
      },
      error: (errorResponse: HttpErrorResponse) => {
        console.error('Login failed', errorResponse);
        if (errorResponse && errorResponse.error && typeof errorResponse.error === 'string') {
          this.errorMessage = errorResponse.error;
        } else if (errorResponse.status === 401) {
          this.errorMessage = 'Ungültiger Benutzername oder Passwort.';
        } else {
          this.errorMessage = 'Login fehlgeschlagen. Bitte versuche es später erneut.';
        }
      }
    });
  }
}
