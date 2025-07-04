import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject, Subject } from 'rxjs';
import { Client, IMessage, IFrame } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

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
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3;

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  connect(): void {
    if (this.stompClient && this.stompClient.connected) {
      console.log('✅ Already connected to WebSocket');
      return;
    }

    console.log('🔄 Attempting WebSocket connection...');

    this.stompClient = new Client({
      webSocketFactory: () => {
        return new SockJS(this.wsUrl);
      },
      connectHeaders: {
        // Für jetzt ohne Authorization Header
      },
      debug: (str: string) => {
        if (str.includes('ERROR') || str.includes('CONNECT')) {
          console.log('🔍 STOMP:', str);
        }
      },
      heartbeatIncoming: 20000,
      heartbeatOutgoing: 20000,
      reconnectDelay: 3000,

      onConnect: (frame: IFrame) => {
        console.log('✅ WebSocket connected successfully');
        this.connectionStatusSubject.next(true);
        this.reconnectAttempts = 0;

        if (this.stompClient) {
          // Subscribe to user-specific message queue
          this.stompClient.subscribe('/user/queue/messages', (message: IMessage) => {
            try {
              const chatMessage: ChatMessageDto = JSON.parse(message.body);
              console.log('📨 Received message:', chatMessage);
              this.messagesSubject.next(chatMessage);
            } catch (error) {
              console.error('❌ Error parsing message:', error);
            }
          });

          // Subscribe to message status updates
          this.stompClient.subscribe('/user/queue/messages/status', (message: IMessage) => {
            try {
              const statusUpdate: ChatMessageDto = JSON.parse(message.body);
              console.log('📋 Status update:', statusUpdate);
              this.messagesSubject.next(statusUpdate);
            } catch (error) {
              console.error('❌ Error parsing status update:', error);
            }
          });

          // Subscribe to general topic
          this.stompClient.subscribe('/topic/chat', (message: IMessage) => {
            try {
              const chatMessage: ChatMessageDto = JSON.parse(message.body);
              console.log('📢 Broadcast message:', chatMessage);
              this.messagesSubject.next(chatMessage);
            } catch (error) {
              console.error('❌ Error parsing broadcast message:', error);
            }
          });
        }
      },

      onDisconnect: (frame: IFrame) => {
        console.log('❌ WebSocket disconnected');
        this.connectionStatusSubject.next(false);
      },

      onStompError: (frame: IFrame) => {
        // ✅ KORRIGIERT: Bracket-Notation für Index-Signatur
        const errorMessage = frame.headers['message'] || frame.headers['error'] || 'Unknown STOMP error';
        console.error('❌ STOMP Error:', errorMessage);
        this.connectionStatusSubject.next(false);

        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          console.log(`🔄 Reconnect attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in 3s...`);
          setTimeout(() => this.connect(), 3000);
        } else {
          console.error('❌ Max reconnection attempts reached. Using HTTP fallback only.');
        }
      },

      onWebSocketError: (error: any) => {
        console.error('❌ WebSocket Error:', error);
        this.connectionStatusSubject.next(false);
      }
    });

    try {
      this.stompClient.activate();
    } catch (error) {
      console.error('❌ Failed to activate STOMP client:', error);
      this.connectionStatusSubject.next(false);
    }
  }

  disconnect(): void {
    if (this.stompClient) {
      try {
        this.stompClient.deactivate();
        console.log('✅ WebSocket disconnected');
      } catch (error) {
        console.error('❌ Error during disconnect:', error);
      } finally {
        this.connectionStatusSubject.next(false);
        this.stompClient = null;
      }
    }
  }

  sendMessage(message: ChatMessageDto): Observable<ChatMessageDto> {
    const headers = this.getAuthHeaders();
    console.log('📤 Sending message via HTTP:', message);
    return this.http.post<ChatMessageDto>(`${this.apiUrl}/messages`, message, { headers });
  }

  getChatHistory(rideRequestId: number): Observable<ChatMessageDto[]> {
    const headers = this.getAuthHeaders();
    console.log('📚 Loading chat history for ride:', rideRequestId);
    return this.http.get<ChatMessageDto[]>(`${this.apiUrl}/messages/${rideRequestId}`, { headers });
  }

  markAsRead(messageId: number): Observable<void> {
    const headers = this.getAuthHeaders();
    return this.http.put<void>(`${this.apiUrl}/messages/${messageId}/read`, {}, { headers });
  }

  editMessage(messageId: number, newContent: string): Observable<ChatMessageDto> {
    const headers = this.getAuthHeaders();
    return this.http.put<ChatMessageDto>(`${this.apiUrl}/messages/${messageId}`, newContent, { headers });
  }

  deleteMessage(messageId: number): Observable<void> {
    const headers = this.getAuthHeaders();
    return this.http.delete<void>(`${this.apiUrl}/messages/${messageId}`, { headers });
  }

  getMessages(): Observable<ChatMessageDto> {
    return this.messagesSubject.asObservable();
  }

  getConnectionStatus(): Observable<boolean> {
    return this.connectionStatusSubject.asObservable();
  }

  isConnected(): boolean {
    return this.stompClient?.connected || false;
  }

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('authToken');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  reconnect(): void {
    console.log('🔄 Manual reconnection requested');
    this.disconnect();
    setTimeout(() => this.connect(), 1000);
  }
}
