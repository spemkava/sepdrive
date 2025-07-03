import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject, Subject } from 'rxjs';
import { Client, IMessage } from '@stomp/stompjs';
import * as SockJS from 'sockjs-client';

import { ChatMessageDto } from '../models/chat-message-dto.model';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private apiUrl = 'http://localhost:8080/api/chat';
  private wsUrl = 'http://localhost:8080/ws-chat';

  private stompClient: Client | null = null;
  private messagesSubject = new Subject<ChatMessageDto>();
  private connectionStatusSubject = new BehaviorSubject<boolean>(false);

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  /**
   * Stellt WebSocket-Verbindung her
   */
  connect(): void {
    if (this.stompClient && this.stompClient.connected) {
      console.log('Already connected to WebSocket');
      return;
    }

    const token = localStorage.getItem('authToken');
    if (!token) {
      console.error('No auth token found for WebSocket connection');
      return;
    }

    this.stompClient = new Client({
      webSocketFactory: () => new SockJS(this.wsUrl),
      connectHeaders: {
        Authorization: `Bearer ${token}`
      },
      debug: (str) => {
        console.log('STOMP: ' + str);
      },
      heartbeatIncoming: 20000,
      heartbeatOutgoing: 20000,
      reconnectDelay: 5000
    });

    this.stompClient.onConnect = (frame) => {
      console.log('Connected to WebSocket:', frame);
      this.connectionStatusSubject.next(true);

      // Subscribe to user-specific message queue
      this.stompClient!.subscribe('/user/queue/messages', (message: IMessage) => {
        const chatMessage: ChatMessageDto = JSON.parse(message.body);
        this.messagesSubject.next(chatMessage);
      });

      // Subscribe to message status updates
      this.stompClient!.subscribe('/user/queue/messages/status', (message: IMessage) => {
        const statusUpdate: ChatMessageDto = JSON.parse(message.body);
        this.messagesSubject.next(statusUpdate);
      });
    };

    this.stompClient.onDisconnect = () => {
      console.log('Disconnected from WebSocket');
      this.connectionStatusSubject.next(false);
    };

    this.stompClient.onStompError = (frame) => {
      console.error('WebSocket error:', frame);
      this.connectionStatusSubject.next(false);
    };

    this.stompClient.activate();
  }

  /**
   * Trennt WebSocket-Verbindung
   */
  disconnect(): void {
    if (this.stompClient) {
      this.stompClient.deactivate();
      this.connectionStatusSubject.next(false);
    }
  }

  /**
   * Sendet eine Nachricht über HTTP
   */
  sendMessage(message: ChatMessageDto): Observable<ChatMessageDto> {
    const headers = this.getAuthHeaders();
    return this.http.post<ChatMessageDto>(`${this.apiUrl}/messages`, message, { headers });
  }

  /**
   * Lädt Chat-Verlauf für eine Fahranfrage
   */
  getChatHistory(rideRequestId: number): Observable<ChatMessageDto[]> {
    const headers = this.getAuthHeaders();
    return this.http.get<ChatMessageDto[]>(`${this.apiUrl}/messages/${rideRequestId}`, { headers });
  }

  /**
   * Markiert eine Nachricht als gelesen
   */
  markAsRead(messageId: number): Observable<void> {
    const headers = this.getAuthHeaders();
    return this.http.put<void>(`${this.apiUrl}/messages/${messageId}/read`, {}, { headers });
  }

  /**
   * Bearbeitet eine Nachricht
   */
  editMessage(messageId: number, newContent: string): Observable<ChatMessageDto> {
    const headers = this.getAuthHeaders();
    return this.http.put<ChatMessageDto>(`${this.apiUrl}/messages/${messageId}`, newContent, { headers });
  }

  /**
   * Löscht eine Nachricht
   */
  deleteMessage(messageId: number): Observable<void> {
    const headers = this.getAuthHeaders();
    return this.http.delete<void>(`${this.apiUrl}/messages/${messageId}`, { headers });
  }

  /**
   * Observable für eingehende Nachrichten
   */
  getMessages(): Observable<ChatMessageDto> {
    return this.messagesSubject.asObservable();
  }

  /**
   * Observable für Verbindungsstatus
   */
  getConnectionStatus(): Observable<boolean> {
    return this.connectionStatusSubject.asObservable();
  }

  /**
   * Prüft ob WebSocket verbunden ist
   */
  isConnected(): boolean {
    return this.stompClient?.connected || false;
  }

  /**
   * Hilfsmethode für Auth-Headers
   */
  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('authToken');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  /**
   * Sendet Nachricht über WebSocket (optional, für Echtzeit-Features)
   */
  sendMessageViaWebSocket(message: ChatMessageDto): void {
    if (this.stompClient && this.stompClient.connected) {
      this.stompClient.publish({
        destination: '/app/chat.sendMessage',
        body: JSON.stringify(message)
      });
    } else {
      console.error('WebSocket not connected. Cannot send message via WebSocket.');
    }
  }
}
