import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink}  from '@angular/router';
import { UserService } from '../../services/user.service';
import { AuthService } from '../../services/auth.service';
import {RideSimulationService} from '../../services/ride-simulation.service';
import {RideService} from '../../services/Ride.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {
  isCustomer: boolean = false;
  isDriver: boolean = false;
  username: string = 'Benutzer';

  currentRideId: number | null = null;

  constructor(private router: Router, private userService: UserService, private authService: AuthService, private rideService: RideService) {}

  ngOnInit() {
    const role = localStorage.getItem('userRole');
    this.isDriver = role === 'DRIVER';
    this.isCustomer = role === 'CUSTOMER';
    this.username = localStorage.getItem('username') ?? 'Benutzer';
    this.rideService.getCurrentActiveRide().subscribe(ride => {
      this.currentRideId = ride?.id ?? null;
    });
  }

  createRideRequest() {
    this.router.navigate(['/ride-request']);
  }

  viewProfile() {
    this.router.navigate(['/profile']);
  }
   logout() {
    this.authService.logout(); // Call the comprehensive logout method
    window.location.reload(); // Force a full page reload for a clean state
  }
  searchUsers() {
    this.router.navigate(['/search'])
  }
  account() {
    this.router.navigate(['/account']);
  }
  pending() {
    this.router.navigate(['/pending']);
}
}
