import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

interface UserRegistrationData {
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  birthDate: string;
  password: string;
  role: string;
}

@Component({
  selector: 'app-register',
  templateUrl: './registration.component.html',
  styleUrls: ['./registration.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule
  ]
})
export class RegisterComponent implements OnInit {
  registerForm: FormGroup;
  selectedFile: File | null = null;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {
    this.registerForm = this.fb.group({
      username: ['', [Validators.required]],
      firstName: ['', [Validators.required]],
      lastName: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      birthDate: ['', [Validators.required]],
      role: ['CUSTOMER', [Validators.required]],
      vehicleClass: [''],
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]]
    }, { validators: this.passwordMatchValidator });
  }

  ngOnInit(): void {
    this.registerForm.get('role')?.valueChanges.subscribe((role: string) => {
      const vehicleClassControl = this.registerForm.get('vehicleClass');
      if (vehicleClassControl) {
        if (role === 'DRIVER') {
          vehicleClassControl.setValidators([Validators.required]);
        } else {
          vehicleClassControl.clearValidators();
          vehicleClassControl.setValue('');
        }
        vehicleClassControl.updateValueAndValidity();
      }
    });
  }

  passwordMatchValidator(control: AbstractControl): { [key: string]: boolean } | null {
    const password = control.get('password')?.value;
    const confirmPassword = control.get('confirmPassword')?.value;

    if (password !== confirmPassword) {
      control.get('confirmPassword')?.setErrors({ passwordMismatch: true });
      return { passwordMismatch: true };
    } else {
      const errors = control.get('confirmPassword')?.errors;
      if (errors && errors['passwordMismatch']) {
        delete errors['passwordMismatch'];
        if (Object.keys(errors).length === 0) {
          control.get('confirmPassword')?.setErrors(null);
        } else {
          control.get('confirmPassword')?.setErrors(errors);
        }
      }
      return null;
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length) {
      this.selectedFile = input.files[0];
    } else {
      this.selectedFile = null;
    }
  }

  onSubmit(): void {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      this.snackBar.open('Bitte korrigieren Sie die Fehler im Formular.', 'OK', { duration: 3000 });
      return;
    }

    const formValue = this.registerForm.value;

    const userRegistrationData: UserRegistrationData = {
      username: formValue.username,
      firstName: formValue.firstName,
      lastName: formValue.lastName,
      email: formValue.email,
      birthDate: formValue.birthDate instanceof Date ? formValue.birthDate.toISOString().split('T')[0] : formValue.birthDate,
      password: formValue.password,
      role: formValue.role
    };

    const formData = new FormData();
    formData.append('userData', JSON.stringify(userRegistrationData));

    if (this.selectedFile) {
      formData.append('profilePicture', this.selectedFile, this.selectedFile.name);
    }

    this.authService.register(formData).subscribe({
      next: () => {
        this.snackBar.open('Registrierung erfolgreich! Bitte logge dich ein.', 'OK', {
          duration: 3000
        });
        this.router.navigate(['/login']);
      },
      error: (error: HttpErrorResponse) => {
        let errorMessage = 'Registrierung fehlgeschlagen. Unbekannter Fehler.';

        if (error.error && typeof error.error.message === 'string') {
          errorMessage = error.error.message;
        } else if (error.error && typeof error.error === 'string') {
          errorMessage = error.error;
        } else if (error.message) {
          errorMessage = error.message;
        } else if (error.statusText) {
          errorMessage = `Fehler: ${error.statusText} (Status ${error.status})`;
        }

        this.snackBar.open(errorMessage, 'OK', {
          duration: 5000
        });
        console.error('Registration error details:', error);
      }
  });
  }
}
