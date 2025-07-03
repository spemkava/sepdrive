import { Component, OnInit, OnDestroy } from '@angular/core'; // OnDestroy hinzugefügt
import { CommonModule, CurrencyPipe } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { map, takeUntil, finalize } from 'rxjs/operators'; // takeUntil, finalize hinzugefügt

import { UserService } from '../../services/user.service';
import { AuthService } from '../../services/auth.service';
import { UserProfile } from '../../models/user-profile.model';

@Component({
  selector: 'app-account',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    CurrencyPipe
  ],
  templateUrl: './account.component.html',
  styleUrls: ['./account.component.scss']
})
export class AccountComponent implements OnInit, OnDestroy {

  private destroy$ = new Subject<void>();

  userProfile: UserProfile | null = null;
  accountBalance: number | null = null;

  depositForm: FormGroup;
  withdrawForm: FormGroup;
  errorMessage: string | null = null;
  successMessage: string | null = null;
  isLoadingProfile: boolean = true;
  isLoadingBalanceManual: boolean = false;
  isDepositing: boolean = false;
  isWithdrawing: boolean = false;
  currentUserId: number | null = null;

  constructor(
    private userService: UserService,
    private authService: AuthService,
    private fb: FormBuilder
  ) {
    this.depositForm = this.fb.group({
      amount: [null, [Validators.required, Validators.min(0.01)]]
    });
    this.withdrawForm = this.fb.group({
      amount: [null, [Validators.required, Validators.min(0.01)]]
    });
  }

  ngOnInit(): void {
    console.log('AccountComponent ngOnInit aufgerufen');
    this.isLoadingProfile = true;
    this.errorMessage = null;

    this.userService.currentUserProfile$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(profile => {
      console.log('currentUserProfile$ in AccountComponent empfangen:', profile);
      this.userProfile = profile;
      if (profile && profile.id) {
        this.currentUserId = profile.id;
        if (profile.accountBalance !== undefined && profile.accountBalance !== null) {
          console.log('Kontostand aus UserProfile-Stream genommen:', profile.accountBalance);
          this.accountBalance = profile.accountBalance;
          this.isLoadingProfile = false;
        } else {
          console.log('accountBalance nicht im Profil vorhanden, lade manuell...');
          this.loadAccountBalanceManually(profile.id);
        }
      } else if (this.authService.isLoggedIn() && !profile) {
        console.log('BehaviorSubject ist null, aber User eingeloggt. Lade Profil via getMyProfile...');
        this.userService.getMyProfile().pipe(takeUntil(this.destroy$)).subscribe({
          next: freshProfile => {
            if (!freshProfile || !freshProfile.id) {
                 this.errorMessage = "Profil konnte nicht vollständig geladen werden.";
                 this.isLoadingProfile = false;
            }
          },
          error: err => {
            this.errorMessage = 'Fehler beim initialen Laden des Profils.';
            this.isLoadingProfile = false;
            console.error(err);
          }
        });
      } else if (!this.authService.isLoggedIn()){
        this.errorMessage = 'Bitte einloggen, um Kontoinformationen anzuzeigen.';
        this.isLoadingProfile = false;
      } else {
        this.isLoadingProfile = false;
         if (!this.errorMessage) this.errorMessage = 'Kontoinformationen nicht verfügbar.';
        console.log('Profil ist null oder keine User ID, isLoadingProfile auf false.');
      }
    });
  }

  loadAccountBalanceManually(userId: number): void {
    if (!userId) return;
    console.log('loadAccountBalanceManually aufgerufen für User ID:', userId);
    this.isLoadingBalanceManual = true;
    this.errorMessage = null;
    this.userService.getAccountBalance(userId).pipe(
      map(response => {
        console.log('Antwort von getAccountBalance Service (manuell):', response);
        if (typeof response?.balance === 'number') {
          return response.balance;
        }
        throw new Error('Ungültige Kontostandsdaten empfangen');
      }),
      finalize(() => {
        this.isLoadingBalanceManual = false;
        console.log('loadAccountBalanceManually abgeschlossen.');
      })
    ).subscribe({
      next: balance => {
        this.accountBalance = balance;

        if(this.userProfile) {
            this.userProfile.accountBalance = balance;

        }
      },
      error: err => {
        this.errorMessage = 'Kontostand konnte nicht neu geladen werden.';
        console.error('Error in loadAccountBalanceManually:', err);
        this.accountBalance = null;
      }
    });
  }

  onDeposit(): void {
    if (this.depositForm.invalid) {
      this.errorMessage = 'Bitte geben Sie einen gültigen Betrag ein.';
      this.depositForm.markAllAsTouched();
      return;
    }
    if (!this.currentUserId) {
      this.errorMessage = 'Benutzer-ID nicht gefunden. Bitte neu einloggen.';
      return;
    }

    this.isDepositing = true;
    this.errorMessage = null;
    this.successMessage = null;
    const amount = this.depositForm.value.amount;

    this.userService.addFunds(this.currentUserId, amount).pipe(
      finalize(() => {
        this.isDepositing = false;
      })
    ).subscribe({
      next: (updatedProfile) => {
        this.successMessage = `Erfolgreich ${amount.toFixed(2)} € eingezahlt.`;

        this.depositForm.reset();
        setTimeout(() => this.successMessage = null, 5000);
      },
      error: (err) => {
        this.errorMessage = err.error?.message || err.message || 'Einzahlung fehlgeschlagen.';
        console.error('Error in onDeposit:', err);
        setTimeout(() => this.errorMessage = null, 7000);
      }
    });
  }
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
