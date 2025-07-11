import { Component, Input, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';

import { ChatService } from '../../services/chat.service';
import { AuthService } from '../../services/auth.service';
import { UserService } from '../../services/user.service';
import { RideRequestService } from '../../services/RideRequest.service';
import { ChatMessageDto } from '../../models/chat-message-dto.model';
import { UserProfile } from '../../models/user-profile.model';
import { RideRequestDto } from '../../models/ride-request-dto.model';

@Component({
  selector: 'app-working-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="chat-container">
      <!-- Chat Header -->
      <div class="chat-header">
        <h4>Chat für Fahrt #{{ rideRequestId }}</h4>
        <div class="connection-status" [class.connected]="isConnected">
          <span class="status-indicator"></span>
          {{ isConnected ? 'Verbunden' : 'Getrennt' }}
        </div>
      </div>

      <!-- Debug Info -->
      <div class="debug-info" *ngIf="showDebug">
        <small>Ich: {{ currentUser?.username }} ({{ currentUser?.role }})</small><br>
        <small>Andere Person: {{ otherUser?.username || 'Wird ermittelt...' }}</small><br>
        <small>Nachrichten: {{ messages.length }}</small>
        <button (click)="loadChatHistory()" class="debug-btn">🔄 Neu laden</button>
      </div>

      <!-- Loading Indicator -->
      <div *ngIf="isLoading" class="loading-container">
        <div class="loading-spinner"></div>
        <span>Chat wird geladen...</span>
      </div>

      <!-- Messages Container -->
      <div class="messages-container" #messageContainer>
        <div *ngIf="messages.length === 0 && !isLoading" class="no-messages">
          <p>Noch keine Nachrichten. Schreibt euch eine Nachricht!</p>
        </div>

        <div *ngFor="let message of messages; trackBy: trackByMessageId"
             class="message-wrapper"
             [class.my-message]="isMyMessage(message)"
             [class.other-message]="!isMyMessage(message)">

          <div class="message" [class.deleted]="message.deleted">
            <div class="message-content">
              <strong>{{ getMessageSender(message) }}:</strong>
              <span *ngIf="!message.deleted">{{ message.content }}</span>
              <span *ngIf="message.deleted" class="deleted-message">
                <em>Nachricht wurde gelöscht</em>
              </span>
              <span *ngIf="message.edited && !message.deleted" class="edited-indicator">
                (bearbeitet)
              </span>
            </div>

            <div class="message-meta">
              <span class="timestamp">
                {{ message.timestamp | date:'short' }}
              </span>
              <span *ngIf="isMyMessage(message)" class="message-status" [class]="message.status.toLowerCase()">
                <span *ngIf="message.status === 'SENT'">✓</span>
                <span *ngIf="message.status === 'DELIVERED'">✓✓</span>
                <span *ngIf="message.status === 'READ'" class="read-status">✓✓</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Message Input -->
      <div class="message-input-container">
        <div class="input-wrapper">
          <textarea
            [(ngModel)]="newMessage"
            (keydown)="onKeyPress($event)"
            placeholder="Nachricht eingeben... (Enter zum Senden, Shift+Enter für neue Zeile)"
            class="message-input"
            rows="1"
            maxlength="2000">
          </textarea>

          <button
            (click)="sendMessage()"
            [disabled]="!newMessage.trim() || !otherUser"
            class="send-button"
            [title]="!otherUser ? 'Empfänger wird ermittelt...' : 'Nachricht senden'"
            type="button">
            <span class="send-icon">➤</span>
          </button>
        </div>

        <div class="input-info">
          <span class="character-count">
            {{ newMessage.length }}/2000
          </span>
          <span *ngIf="!otherUser" class="warning">
            ⚠️ Empfänger wird ermittelt...
          </span>
        </div>
      </div>

      <!-- Error Display -->
      <div *ngIf="errorMessage" class="error-message">
        ❌ {{ errorMessage }}
        <button (click)="errorMessage = ''" class="close-error">✕</button>
      </div>
    </div>
  `,
  styleUrls: ['./chat.component.scss']
})
export class WorkingChatComponent implements OnInit, OnDestroy, AfterViewChecked {
  @Input() rideRequestId!: number;
  @ViewChild('messageContainer') private messageContainer!: ElementRef;

  messages: ChatMessageDto[] = [];
  newMessage: string = '';
  currentUser: UserProfile | null = null;
  otherUser: UserProfile | null = null;
  rideRequest: RideRequestDto | null = null;
  isLoading: boolean = false;
  isConnected: boolean = false;
  errorMessage: string = '';
  showDebug: boolean = true; // Für Entwicklung

  private subscriptions = new Subscription();
  private shouldScrollToBottom = false;

  constructor(
    private chatService: ChatService,
    private authService: AuthService,
    private userService: UserService,
    private rideRequestService: RideRequestService
  ) {}

  ngOnInit(): void {
    console.log('🎯 Working Chat initialized for ride:', this.rideRequestId);
    this.loadCurrentUser();
    this.initializeChat();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    this.chatService.disconnect();
  }

  ngAfterViewChecked(): void {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
  }

  private loadCurrentUser(): void {
    this.userService.getMyProfile().subscribe({
      next: (user) => {
        this.currentUser = user;
        console.log('✅ Current user loaded:', user.username, user.role);
        this.loadRideRequestAndOtherUser();
      },
      error: (error) => {
        console.error('❌ Error loading current user:', error);
        this.errorMessage = 'Fehler beim Laden der Benutzerdaten';
      }
    });
  }

  private loadRideRequestAndOtherUser(): void {
    // Lade die Fahranfrage, um Kunde und Fahrer zu identifizieren
    this.rideRequestService.getAcceptedRequest().subscribe({
      next: (rideRequest) => {
        if (rideRequest && rideRequest.id === this.rideRequestId) {
          this.rideRequest = rideRequest;
          console.log('✅ Ride request loaded:', rideRequest);
          this.determineOtherUser();
        } else {
          console.log('🔍 Trying alternative method to load ride request...');
          // Fallback: Versuche über aktive Anfrage
          this.rideRequestService.getActiveRequest().subscribe({
            next: (activeRequest) => {
              if (activeRequest) {
                this.rideRequest = activeRequest;
                this.determineOtherUser();
              } else {
                this.handleNoRideRequest();
              }
            },
            error: () => this.handleNoRideRequest()
          });
        }
      },
      error: (error) => {
        console.error('❌ Error loading ride request:', error);
        this.handleNoRideRequest();
      }
    });
  }

  private determineOtherUser(): void {
    if (!this.rideRequest || !this.currentUser) {
      console.error('❌ Cannot determine other user: missing data');
      return;
    }

    if (this.currentUser.role === 'CUSTOMER') {
      // Ich bin Kunde, der andere ist der Fahrer
      if (this.rideRequest.offers && this.rideRequest.offers.length > 0) {
        const driverName = this.rideRequest.offers[0].driverName;
        this.loadUserByUsername(driverName);
      } else {
        this.errorMessage = 'Kein Fahrer gefunden für diese Fahrt';
      }
    } else if (this.currentUser.role === 'DRIVER') {
      // Ich bin Fahrer, der andere ist der Kunde
      this.loadUserByUsername(this.rideRequest.customerUsername);
    }
  }

  private loadUserByUsername(username: string): void {
    this.userService.getUserProfile(username).subscribe({
      next: (user) => {
        this.otherUser = user;
        console.log('✅ Other user loaded:', user.username, user.role);
        this.loadChatHistory();
      },
      error: (error) => {
        console.error('❌ Error loading other user:', error);
        this.errorMessage = `Fehler beim Laden des anderen Benutzers: ${username}`;
      }
    });
  }

  private handleNoRideRequest(): void {
    this.errorMessage = 'Fahranfrage nicht gefunden. Chat-Partner kann nicht ermittelt werden.';
    // Fallback: Erlaube Chat mit sich selbst für Tests
    if (this.currentUser) {
      this.otherUser = this.currentUser;
      console.log('⚠️ Fallback: Using self as other user for testing');
      this.loadChatHistory();
    }
  }

  private initializeChat(): void {
    // WebSocket-Verbindung aufbauen
    this.chatService.connect();

    // Auf neue Nachrichten hören
    const messageSubscription = this.chatService.getMessages().subscribe({
      next: (message) => {
        if (message && message.chatId === `ride_${this.rideRequestId}`) {
          this.addOrUpdateMessage(message);
          this.shouldScrollToBottom = true;
        }
      },
      error: (error) => {
        console.error('❌ Error receiving messages:', error);
      }
    });

    this.subscriptions.add(messageSubscription);

    // Verbindungsstatus überwachen
    const connectionSubscription = this.chatService.getConnectionStatus().subscribe({
      next: (connected) => {
        this.isConnected = connected;
      }
    });

    this.subscriptions.add(connectionSubscription);
  }

  loadChatHistory(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.chatService.getChatHistory(this.rideRequestId).subscribe({
      next: (messages) => {
        this.messages = messages.sort((a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
        this.shouldScrollToBottom = true;
        this.isLoading = false;
        console.log('✅ Chat history loaded:', messages.length, 'messages');
      },
      error: (error) => {
        console.error('❌ Error loading chat history:', error);
        this.isLoading = false;
        if (error.status === 404) {
          console.log('ℹ️ No chat history found - this is normal for new chats');
          this.messages = [];
        } else {
          this.errorMessage = `Fehler beim Laden der Nachrichten: ${error.status}`;
        }
      }
    });
  }

  sendMessage(): void {
    if (!this.newMessage.trim() || !this.currentUser || !this.otherUser) {
      console.log('❌ Cannot send message: missing data');
      return;
    }

    const messageDto: ChatMessageDto = {
      chatId: `ride_${this.rideRequestId}`,
      senderId: this.currentUser.id,
      recipientId: this.otherUser.id,
      content: this.newMessage.trim(),
      status: 'SENT',
      edited: false,
      deleted: false,
      timestamp: new Date().toISOString()
    };

    console.log('📤 Sending message:', messageDto);

    this.chatService.sendMessage(messageDto).subscribe({
      next: (sentMessage) => {
        console.log('✅ Message sent successfully:', sentMessage);
        this.addOrUpdateMessage(sentMessage);
        this.newMessage = '';
        this.shouldScrollToBottom = true;
        this.errorMessage = '';
      },
      error: (error) => {
        console.error('❌ Error sending message:', error);
        this.errorMessage = `Fehler beim Senden: ${error.error?.message || error.message}`;
      }
    });
  }

  private addOrUpdateMessage(message: ChatMessageDto): void {
    const existingIndex = this.messages.findIndex(m => m.id === message.id);

    if (existingIndex !== -1) {
      this.messages[existingIndex] = message;
    } else {
      this.messages.push(message);
      this.messages.sort((a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
    }

    // Mark message as read if it's for current user
    if (message.recipientId === this.currentUser?.id && message.status !== 'READ') {
      this.markAsRead(message);
    }
  }

  markAsRead(message: ChatMessageDto): void {
    if (message.id && message.recipientId === this.currentUser?.id) {
      this.chatService.markAsRead(message.id).subscribe({
        error: (error) => {
          console.error('❌ Error marking message as read:', error);
        }
      });
    }
  }

  isMyMessage(message: ChatMessageDto): boolean {
    return message.senderId === this.currentUser?.id;
  }

  getMessageSender(message: ChatMessageDto): string {
    if (this.isMyMessage(message)) {
      return 'Ich';
    }
    return this.otherUser?.username || `User ${message.senderId}`;
  }

  private scrollToBottom(): void {
    try {
      if (this.messageContainer) {
        this.messageContainer.nativeElement.scrollTop =
          this.messageContainer.nativeElement.scrollHeight;
      }
    } catch (err) {
      console.error('❌ Error scrolling to bottom:', err);
    }
  }

  onKeyPress(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  trackByMessageId(index: number, message: ChatMessageDto): any {
    return message.id || index;
  }
}
