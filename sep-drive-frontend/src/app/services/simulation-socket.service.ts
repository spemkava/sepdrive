import { Injectable } from '@angular/core';
import { Client, IMessage, Stomp } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import {BehaviorSubject, filter, Observable, Subject} from 'rxjs';
import { SimulationProgress } from '../models/simulation-progress.model';
import { RouteUpdate } from '../models/route-update.model';

@Injectable({
  providedIn: 'root'
})
export class SimulationSocketService {
  private stompClient: Client;
  private progressSubject = new BehaviorSubject<SimulationProgress | null>(null);
  private routeUpdateSubject = new Subject<RouteUpdate>();
  private isConnected = false;
  private pendingSubscriptions: Array<() => void> = [];

  constructor() {
    this.stompClient = new Client({
      webSocketFactory: () => new SockJS('http://localhost:8080/ws'), // <- passt zu Spring Boot WebSocketConfig
      reconnectDelay: 5000,
      debug: str => console.log(str)
    });

    this.stompClient.onConnect = () => {
      console.log('[✔] STOMP verbunden');
      this.isConnected = true;
      this.stompClient.subscribe('/topic/simulation-progress', (message: IMessage) => {
        const progress: SimulationProgress = JSON.parse(message.body);
        this.progressSubject.next(progress);
      });

      this.pendingSubscriptions.forEach(subscription => subscription());
      this.pendingSubscriptions = [];
};

    this.stompClient.onStompError = (frame) => {
      console.error('[❌] STOMP Fehler', frame);
      this.isConnected = false;
    };

    this.stompClient.activate(); // Verbindung aufbauen
  }

  sendProgress(progress: SimulationProgress): void {
    if (!this.stompClient || !this.stompClient.connected) {
      console.warn('❌ STOMP-Verbindung nicht aktiv – Progress nicht gesendet');
      return;
    }

    this.stompClient.publish({
      destination: `/app/simulation/progress`,
      body: JSON.stringify(progress)
    });
  }
  onProgress(): Observable<SimulationProgress> {
    return this.progressSubject.asObservable().pipe(
      filter((val): val is SimulationProgress => val !== null)
    );
  }

  sendRouteUpdate(update: RouteUpdate): void {
    if (!this.isConnected) {
      console.warn('❌ STOMP-Verbindung nicht aktiv – Route-Update nicht gesendet');
      return;
    }
    console.log('Sende Route-Update:', update);
    this.stompClient.publish({
      destination: `/app/simulation/route-update`,
      body: JSON.stringify(update)
    });
  }

  subscribeToGlobalRouteUpdates(): void {
    const subscribeFunction = () => {
      const topic = `/topic/route-update/global`;
      console.log(`Abonniere globales Topic: ${topic}`);

      this.stompClient.subscribe(topic, (message: IMessage) => {
        const update: RouteUpdate = JSON.parse(message.body);
        console.log('Globales Route-Update empfangen:', update);
        this.routeUpdateSubject.next(update);
      });
    };

    if (this.isConnected) {
      subscribeFunction();
    } else {
      this.pendingSubscriptions.push(subscribeFunction);
    }
  }

  subscribeToRouteUpdates(rideId: number): void {
    const subscribeFunction = () => {
      const topic = `/topic/route-update/${rideId}`;
      console.log(`Abonniere Topic: ${topic}`);

      this.stompClient.subscribe(topic, (message: IMessage) => {
        const update: RouteUpdate = JSON.parse(message.body);
        console.log('Route-Update empfangen:', update);
        this.routeUpdateSubject.next(update);
      });
    };

    if (this.isConnected) {
      subscribeFunction();
    } else {
      // Wenn nicht verbunden, Abonnement in Warteschlange einreihen
      this.pendingSubscriptions.push(subscribeFunction);
    }
  }

  onRouteUpdate(): Observable<RouteUpdate> {
    return this.routeUpdateSubject.asObservable();
  }

  isConnectedtoServer(): boolean {
    return this.isConnected
  }

  disconnect(): void {
    if (this.stompClient) {
      this.stompClient.deactivate();
    }
  }

}
