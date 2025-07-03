import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { RideService } from '../../services/Ride.service';
import { RideDtoModel } from '../../models/ride-dto.model';
import {FormsModule} from '@angular/forms';
import {CommonModule} from '@angular/common';
import {Observable} from "rxjs";
import { RideRequestService} from "../../services/RideRequest.service";
import {RideRequestDto} from "../../models/ride-request-dto.model";
import { Router } from '@angular/router';

@Component({
  selector: 'app-ride-summary',
  templateUrl: './ride-summary.component.html',
  imports: [
    FormsModule, CommonModule
  ],
  styleUrls: ['./ride-summary.component.scss']
})
export class RideSummaryComponent implements OnInit {

  rideId!: number;
  rideData?: RideDtoModel;
  userRole: 'driver' | 'customer' = 'customer'; // z.B. aus Auth-Service ableiten

  rating: number | null = null;
  ratingSubmitted = false;
  activeRequest$!: Observable<RideRequestDto | null>;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private rideService: RideService,
    private rideRequestService: RideRequestService
  ) {}

  ngOnInit(): void {
    //this.rideId = Number(this.route.snapshot.paramMap.get('id'));
    this.loadRide();
    this.activeRequest$ = this.rideRequestService.getAcceptedRequest();
    this.rideRequestService.getAcceptedRequest().subscribe(activeRequest => {
      if (activeRequest) {
      this.rideId = activeRequest.id;
      }
    })
  }

  loadRide(): void {
    this.rideService.getRideById(this.rideId).subscribe(data => {
      this.rideData = data;
    });
  }

  submitRating(): void {
    if (this.rating === null) return;
    this.rideRequestService.submitRating(this.rideId, this.rating).subscribe(() => {
      this.ratingSubmitted = true;
    });
  }

  // Optional: Button zum Zahlungsvorgang, Integration z.B. per Event:
  requestPayment(): void {
    this.rideRequestService.completeRequest(this.rideId).subscribe({
          next:(updatedRequest) => {
            alert('Fahrt Abgeschloosen!');
            this.router.navigate(['/home']); // leitet weiter
          },
        })
  }
}
