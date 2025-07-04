import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import * as L from 'leaflet';
import { Subscription, interval } from 'rxjs';

import { RideService } from '../../services/Ride.service';
import { RideRequestService } from '../../services/RideRequest.service';
import { SimulationSocketService } from '../../services/simulation-socket.service';
import { WorkingChatComponent } from '../working-chat/working-chat.component'; // GEÄNDERT

// Leaflet Icon Fix
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'assets/markers/default_marker.png',
  iconUrl: 'assets/markers/default_marker.png',
  shadowUrl: 'assets/markers/marker-shadow.png'
});

@Component({
  selector: 'app-ride-execution',
  standalone: true,
  imports: [CommonModule, FormsModule, WorkingChatComponent], // GEÄNDERT
  templateUrl: './ride-execution.component.html',
  styleUrls: ['./ride-execution.component.scss']
})
export class RideExecutionComponent implements OnInit, OnDestroy {

  private map: L.Map | undefined;
  private route: L.LatLng[] = [];
  private marker: L.Marker | undefined;

  public rideId: number | null = null;
  public isRunning = false;
  public simulationFinished = false;
  public noActiveRequestError = false;

  public simulationDurationSec = 10;
  public elapsedMs = 0;
  private currentIndex = 0;
  private stepIntervalMs = 0;
  private readonly updateIntervalMs = 100;

  private subscriptions = new Subscription();

  private startIcon = L.icon({
    iconUrl: 'assets/markers/start-marker.png', iconSize: [25, 41], iconAnchor: [12, 41]
  });
  private endIcon = L.icon({
    iconUrl: 'assets/markers/end-marker.png', iconSize: [25, 41], iconAnchor: [12, 41]
  });
  private defaultIcon = L.icon({
    iconUrl: 'assets/markers/default-marker.png', iconSize: [25, 41], iconAnchor: [12, 41]
  });

  constructor(
    private rideService: RideService,
    private rideRequestService: RideRequestService,
    private simulationSocket: SimulationSocketService,
    private router: Router
  ) {}

  ngOnInit(): void {
    console.log('🚗 RideExecutionComponent initialized');

    const activeRequestSub = this.rideRequestService.getAcceptedRequest().subscribe(activeRequest => {
      if (activeRequest) {
        this.rideId = activeRequest.id;
        console.log('✅ Active request found, ride ID:', this.rideId);
        this.initMapAndRoute(
          activeRequest.startLatitude,
          activeRequest.startLongitude,
          activeRequest.destinationLatitude,
          activeRequest.destinationLongitude
        );
      } else {
        console.log('❌ No active request found');
        this.noActiveRequestError = true;
      }
    });
    this.subscriptions.add(activeRequestSub);
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  startSimulation(): void {
    if (!this.route.length || this.isRunning) return;
    this.isRunning = true;
    console.log('▶️ Starting simulation...');

    const timerSub = interval(this.updateIntervalMs).subscribe(() => {
      this.elapsedMs += this.updateIntervalMs;
      const newIndex = Math.floor(this.elapsedMs / this.stepIntervalMs);

      if (newIndex >= this.route.length) {
        this.stopSimulation(true);
        return;
      }

      if (newIndex !== this.currentIndex) {
        this.currentIndex = newIndex;
        this.marker?.setLatLng(this.route[this.currentIndex]);
        this.sendProgressUpdate(false);
      }
    });

    this.subscriptions.add(timerSub);
  }

  pauseSimulation(): void {
    this.isRunning = false;
    this.subscriptions.unsubscribe();
    this.subscriptions = new Subscription();
    console.log('⏸️ Simulation paused');
  }

  stopSimulation(isFinished: boolean): void {
    this.pauseSimulation();
    if (isFinished && this.route.length > 0) {
      this.simulationFinished = true;
      this.currentIndex = this.route.length - 1;
      this.marker?.setLatLng(this.route[this.currentIndex]);
      this.sendProgressUpdate(true);
      console.log('🏁 Simulation finished');
    }
  }

  onDurationChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.simulationDurationSec = input.valueAsNumber;
    if (this.route.length > 0) {
      this.stepIntervalMs = (this.simulationDurationSec * 1000) / this.route.length;
    }
  }

  goToRideSummary(): void {
    if (this.rideId) {
      this.router.navigate(['/ride-summary', this.rideId]);
    }
  }

  private initMapAndRoute(startLat: number, startLon: number, endLat: number, endLon: number): void {
    setTimeout(() => {
      this.map = L.map('map').setView([startLat, startLon], 13);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(this.map);

      L.marker([startLat, startLon], { icon: this.startIcon }).addTo(this.map).bindPopup('Startpunkt');
      L.marker([endLat, endLon], { icon: this.endIcon }).addTo(this.map).bindPopup('Zielpunkt');

      const routeSub = this.rideService.getRoute(startLat, startLon, endLat, endLon).subscribe((coords: number[][]) => {
        if (!coords || coords.length === 0) {
          console.warn('⚠️ No route coordinates received');
          return;
        }

        this.route = coords.map(c => new L.LatLng(c[1], c[0]));
        this.stepIntervalMs = (this.simulationDurationSec * 1000) / this.route.length;

        L.polyline(this.route, { color: 'blue' }).addTo(this.map!);
        this.marker = L.marker(this.route[0], { icon: this.defaultIcon }).addTo(this.map!);
        this.map!.fitBounds(L.latLngBounds(this.route));

        console.log('🗺️ Route initialized with', this.route.length, 'points');
      });
      this.subscriptions.add(routeSub);
    }, 0);
  }

  private sendProgressUpdate(isFinished: boolean): void {
    if (!this.rideId || this.currentIndex < 0 || this.currentIndex >= this.route.length) return;

    this.simulationSocket.sendProgress({
      rideId: this.rideId,
      currentIndex: this.currentIndex,
      lat: this.route[this.currentIndex].lat,
      lon: this.route[this.currentIndex].lng,
      isFinished: isFinished
    });
  }
}
