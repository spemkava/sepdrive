import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { UserService } from '../../services/user.service';
import { AuthService } from '../../services/auth.service';
import { Verify2FARequestDto } from '../../models/verify-2fa-request-dto.model';
import { Verify2FAResponseDto } from '../../models/verify-2fa-response-dto.model';


@Component({
  selector: 'app-verify-2fa',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
  ],
  templateUrl: './verify-2fa.component.html',
  styleUrl: './verify-2fa.component.scss'
})
export class Verify2faComponent implements OnInit {

  verifyForm!: FormGroup;
  errorMessage: string | null = null;
  username: string | null = null;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private userService: UserService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {

    this.username = this.route.snapshot.queryParamMap.get('username');


    this.verifyForm = this.fb.group({

      code: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(6), Validators.pattern("^[0-9]*$")]]
    });
  }

  onSubmit(): void {
    this.errorMessage = null;

    if (this.verifyForm.invalid || !this.username) {
      this.errorMessage = 'Bitte gib einen gültigen 6-stelligen Code ein.';
      this.verifyForm.markAllAsTouched();
      return;
    }

    //Baut Data Transfer Object aus username und 2fa code für Backend
    const verifyData: Verify2FARequestDto = {
      username: this.username,          //aus URL-Parametern
      code: this.verifyForm.value.code  //formfeld
    };

    //HTTP Post Request ausführen
    this.authService.verify2fa(verifyData).subscribe({ //.subscribe starter Observer
      next: (response: Verify2FAResponseDto) => { //führe Block aus, wenn erfolgreich

        console.log('2FA Verification successful', response);

        // Token speichern
        localStorage.setItem('authToken', response.accessToken);
        localStorage.setItem('tokenType', response.tokenType);

        //alert('Login erfolgreich! Token erhalten:\n' + response.accessToken);


        this.userService.getMyProfile().subscribe( {
          next: (profile) => {
            this.router.navigate(['/home']); //TODO Path öndern! Homeseite?
          },
          error:(err) => {
            alert('Fehler beim Laden des Profils. Bitte erneut einloggen.');
            this.router.navigate(['/login']);

          }
        });


      },
      error: (errorResponse) => {

        console.error('2FA Verification failed', errorResponse);
        if (errorResponse && errorResponse.error && typeof errorResponse.error === 'string') {

          this.errorMessage = errorResponse.error;
        } else if (errorResponse.status === 401) {
          this.errorMessage = 'Ungültiger oder abgelaufener Code.';
        } else {
          this.errorMessage = 'Code-Überprüfung fehlgeschlagen.';
        }
      }
    });
  }
}
