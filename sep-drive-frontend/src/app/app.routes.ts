import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { authGuard } from './guards/authGuard';
import { Verify2faComponent } from './components/verify-2fa/verify-2fa.component';
import { RideRequestFormComponent } from './components/RideRequestForm/RideRequestForm.component';
import { MapVisualizerComponent } from './components/MapVisualizer/MapVisualizer.component';
import { ActiveRequestComponent } from './components/ActiveRequest/ActiveRequest.component';
import { RegisterComponent } from './components/registration/registration.component';
import { HomeComponent } from './components/home/home.component';
import { UserSearchComponent } from './components/user-search/user-search.component';
import { ProfileComponent } from './components/profile/profile.component';
import { PublicProfileComponent } from './components/public-profile/public-profile.component';
import { AccountComponent } from './components/account/account.component';
import {RideExecutionComponent} from './components/ride-execution/ride-execution.component';
import {RideSummaryComponent} from './components/RideSummary/ride-summary.component';
import { PendingComponent } from './components/pending/pending.component';
import { DrivingHistoryComponent } from './components/drivingHistory/drivingHistory.component';
import { RideOffersComponent } from './components/RideOffers/RideOffers.component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'verify-2fa', component: Verify2faComponent },
  { path: 'profile', component: ProfileComponent, canActivate: [authGuard], title: 'SEP-Drive - Mein Profil'},
  { path: 'route', component: MapVisualizerComponent },
  { path: 'active-request', component: ActiveRequestComponent, canActivate: [authGuard] },
  { path: 'home', component: HomeComponent, canActivate: [authGuard], title: 'SEP-Drive' },
  { path: 'request-ride', component: RideRequestFormComponent, canActivate: [authGuard] },
  { path: 'user-search', component: UserSearchComponent, canActivate: [authGuard], title: 'SEP-Drive - Benutzer suchen' },
  { path: 'profile/:username', component: PublicProfileComponent, canActivate: [authGuard] },
  { path: 'account', component: AccountComponent, canActivate: [authGuard], title: 'SEP-Drive - Mein Konto'},
  { path: 'ride-execution/:rideId', component: RideExecutionComponent},
  { path: 'ride-execution', component: RideExecutionComponent },
  { path: 'ride-summary/:rideId', component: RideSummaryComponent },

  { path: 'account', component: AccountComponent, canActivate: [authGuard], title: 'SEP-Drive - Mein Konto'},
  { path: 'pending', component: PendingComponent, canActivate: [authGuard], title: 'SEP-Drive - Pending' },
  { path: 'account', component: AccountComponent, canActivate: [authGuard], title: 'SEP-Drive - Mein Konto'},
  { path: 'driving-history', component: DrivingHistoryComponent, canActivate: [authGuard], title: 'SEP-Drive - Fahrhistorie'},
  { path: 'offers', component: RideOffersComponent, canActivate: [authGuard], title: 'SEP-Drive - Fahrangebote' },
];
