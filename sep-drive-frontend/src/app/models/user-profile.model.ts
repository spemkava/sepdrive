/**
 * Schnittstelle für das Benutzerprofil, wie es vom Backend geliefert wird.
 */
export interface UserProfile {
  id: number;                      // Eindeutige Benutzer-ID
  username: string;                // Anmeldename
  firstName: string;               // Vorname
  lastName: string;                // Nachname
  email: string;                   // E-Mail-Adresse
  birthDate: string;               // Geburtsdatum als ISO-String
  createdAt: string;               // Erstellungszeitpunkt als ISO-String

  // --- Erweiterte Felder vom Backend ---
  profilePictureUrl?: string;      // Relativer Pfad oder vollständige URL zum Profilbild
  rating?: number;                 // Durchschnittliche Bewertung (0.0–5.0)
  totalRides?: number;             // Anzahl der absolvierten Fahrten
  vehicleClass?: string;           // Auto klasse des Fahrers
  role: 'CUSTOMER' | 'DRIVER';
  accountBalance?: number;
  hasSentOffer?: boolean;
}
