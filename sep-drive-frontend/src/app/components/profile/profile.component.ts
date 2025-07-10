import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { Observable, of } from 'rxjs';
import {tap, catchError } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';
import { UserService } from '../../services/user.service';
import { UserProfile } from '../../models/user-profile.model';
import {ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule
  ],

  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss']
})
export class ProfileComponent implements OnInit {

  userProfile$!: Observable<UserProfile | null>;
  errorMessage: string | null = null;
  successMessage: string | null = null;

  // Für Templatezugriffe
  backendUrl = 'http://localhost:8080'; // Basis-URL Backend
  defaultProfilePic = 'assets/default-profile.png';
  currentUser: UserProfile | null = null;
  uploadForm: FormGroup;

  constructor(
    private userService: UserService,
    private http: HttpClient,
    private fb: FormBuilder,
    private route: ActivatedRoute
  ) {
    this.uploadForm = this.fb.group({
      profilePicture: [null]
    });
  }

  ngOnInit(): void {
    this.loadProfile();
    this.userService.getMyProfile().subscribe(user => {
      this.currentUser = user;
    });
  }

  private loadProfile(): void {
    this.errorMessage = null;
    this.userProfile$ = this.userService.getMyProfile().pipe(
      tap(profile => {
        // Optional: localStorage Logik - nutzt jetzt die neue URL-Funktion
      }),
      catchError(err => {
        console.error('Error loading profile:', err);
        this.errorMessage = err.error?.message || err.message || 'Profil konnte nicht geladen werden.';
        return of(null);
      })
    );
  }


  /**
   * Gibt die korrekte Bild-URL für das Template zurück.
   */
  getProfilePicUrl(profile: UserProfile | null): string {
  return profile?.profilePictureUrl ? profile.profilePictureUrl : 'assets/default-profile.png';
}

  /**
   * Wird aufgerufen, wenn der Benutzer eine neue Datei auswählt.
   * Validiert, lädt hoch und löst das Neuladen des Profils aus.
   */
  onFileSelected(event: Event): void {
    this.errorMessage = null;
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) {
      input.value = ''; // Zurücksetzen falls Auswahl abgebrochen
      return;
    }

    const file = input.files[0];
    console.log('FormData wird gesendet mit Datei:', file.name, file.type, file.size);
    // Typ-Check (jpeg UND jpg erlauben)
    if (!/^image\/(png|jpeg|jpg|gif)$/.test(file.type)) {
      this.errorMessage = 'Nur PNG, JPEG, JPG oder GIF Dateien erlaubt.';
      input.value = '';
      return;
    }

    // Größen-Check (Beispiel: max 5MB)
    const maxSizeInBytes = 5 * 1024 * 1024; // 5 MB
    if (file.size > maxSizeInBytes) {
      this.errorMessage = `Datei ist zu groß (max. ${maxSizeInBytes / 1024 / 1024} MB erlaubt).`;
      input.value = '';
      return;
    }

    const formData = new FormData();
    // Der Key 'profilePicture' muss zum @RequestParam im Backend-Controller passen
    formData.append('profileImage', file, file.name);

    if (!this.currentUser) {
      this.errorMessage = 'Benutzerinformationen nicht geladen.';
      return;
    }
    const userId = this.currentUser.id;


    input.value = ''; // Input leeren, damit gleiche Datei nochmal gewählt werden kann

    // Upload starten

    this.userService.uploadProfilePicture(userId, formData).subscribe({
      next: (response) => { // Idealerweise gibt Backend hier direkt neues Profil/URL zurück
        console.log('Upload erfolgreich, lade Profil neu...');
        this.errorMessage = null;

        this.loadProfile();
        this.userService.refreshProfile();
        window.location.reload(); // Lädt Profil neu -> getProfilePicUrl wird neu aufgerufen
      },
      error: err => {
        console.error('Upload fehlgeschlagen:', err);
        this.errorMessage = err.error?.message || err.message || 'Profilbild konnte nicht hochgeladen werden.';
      }
    });
  }
}
