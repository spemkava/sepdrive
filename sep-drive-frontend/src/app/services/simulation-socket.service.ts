import { Injectable } from '@angular/core';
import { webSocket, WebSocketSubject } from 'rxjs/webSocket';
import { Observable } from 'rxjs';

export interface SimulationProgress {
  rideId: number;
  currentIndex: number;
  lat: number;
  lon: number;
  isFinished: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class SimulationSocketService {
  private socket$: WebSocketSubject<SimulationProgress>;

  constructor() {
    // URL an dein Backend anpassen (z.B. ws://localhost:8080/ws/simulation)
    this.socket$ = webSocket<SimulationProgress>('ws://localhost:8080/ws/simulation');
  }

  // Fortschritts-Update an Server senden
  sendProgress(progress: SimulationProgress): void {
    this.socket$.next(progress);
  }

  // Updates vom Server empfangen (z.B. für Kundenansicht)
  onProgress(): Observable<SimulationProgress> {
    return this.socket$.asObservable();
  }

  // Optional: Verbindung schließen
  close(): void {
    this.socket$.complete();
  }
}
