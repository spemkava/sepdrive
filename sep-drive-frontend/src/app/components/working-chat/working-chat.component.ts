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
        <label class="auto-refresh-toggle">
          <input type="checkbox" [(ngModel)]="autoRefreshEnabled" (change)="toggleAutoRefresh()">
          Auto-Update
        </label>
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
            <div class="message-header" *ngIf="isMyMessage(message) && !message.deleted && message.status !== 'READ'">
              <div class="message-actions">
                <button class="action-btn edit-btn" (click)="startEditMessage(message)" title="Bearbeiten">
                  ✏️
                </button>
                <button class="action-btn delete-btn" (click)="deleteMessage(message)" title="Löschen">
                  🗑️
                </button>
              </div>
            </div>

            <div class="message-content">
              <strong>{{ getMessageSender(message) }}:</strong>

              <!-- Normal message display -->
              <span *ngIf="!message.deleted && editingMessageId !== message.id">
                {{ message.content }}
              </span>

              <!-- Edit mode -->
              <div *ngIf="!message.deleted && editingMessageId === message.id" class="edit-mode">
                <textarea
                  [(ngModel)]="editMessageContent"
                  class="edit-textarea"
                  rows="2"
                  maxlength="2000">
                </textarea>
                <div class="edit-actions">
                  <button class="save-btn" (click)="saveEditMessage(message)">💾 Speichern</button>
                  <button class="cancel-btn" (click)="cancelEditMessage()">❌ Abbrechen</button>
                </div>
              </div>

              <!-- Deleted message -->
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
  styles: [`
    .chat-container {
      display: flex;
      flex-direction: column;
      height: 400px;
      max-width: 100%;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      background: #fff;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      overflow: hidden;
    }

    .chat-header {
      padding: 12px 16px;
      background: linear-gradient(90deg, #c72290, #ee46c5);
      color: white;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #ddd;
    }

    .chat-header h4 {
      margin: 0;
      font-size: 1.1rem;
      font-weight: 600;
    }

    .connection-status {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 0.85rem;
    }

    .status-indicator {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #ccc;
    }

    .connection-status.connected .status-indicator {
      background: #4CAF50;
      animation: pulse 2s infinite;
    }

    @keyframes pulse {
      0% { opacity: 1; }
      50% { opacity: 0.5; }
      100% { opacity: 1; }
    }

    .debug-info {
      background: #f8f9fa;
      padding: 8px 12px;
      font-size: 0.8rem;
      border-bottom: 1px solid #e0e0e0;
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
    }

    .debug-btn {
      background: #007bff;
      color: white;
      border: none;
      padding: 2px 6px;
      border-radius: 3px;
      font-size: 0.7rem;
      cursor: pointer;
    }

    .auto-refresh-toggle {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 0.75rem;
      cursor: pointer;
    }

    .auto-refresh-toggle input[type="checkbox"] {
      margin: 0;
      width: auto;
      height: auto;
    }

    .loading-container {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      padding: 40px;
      color: #666;
    }

    .loading-spinner {
      width: 20px;
      height: 20px;
      border: 2px solid #f3f3f3;
      border-top: 2px solid #c72290;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .messages-container {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      background: #fafafa;
      scroll-behavior: smooth;
    }

    .no-messages {
      text-align: center;
      color: #666;
      margin-top: 40px;
      font-style: italic;
    }

    .message-wrapper {
      margin-bottom: 16px;
      display: flex;
    }

    .message-wrapper.my-message {
      justify-content: flex-end;
    }

    .message-wrapper.my-message .message {
      background: linear-gradient(135deg, #c72290, #ee46c5);
      color: white;
      margin-left: 60px;
      position: relative;
    }

    .message-wrapper.other-message {
      justify-content: flex-start;
    }

    .message-wrapper.other-message .message {
      background: #fff;
      color: #333;
      border: 1px solid #e0e0e0;
      margin-right: 60px;
    }

    .message {
      max-width: 70%;
      padding: 12px 16px;
      border-radius: 18px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      word-wrap: break-word;
      position: relative;
    }

    .message.deleted {
      opacity: 0.6;
      background: #f5f5f5 !important;
      color: #999 !important;
    }

    .message-header {
      position: absolute;
      top: -8px;
      right: -8px;
      display: flex;
      gap: 4px;
    }

    .message-actions {
      display: flex;
      gap: 4px;
    }

    .action-btn {
      background: rgba(255, 255, 255, 0.9);
      border: none;
      border-radius: 50%;
      width: 24px;
      height: 24px;
      cursor: pointer;
      font-size: 0.8rem;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
      transition: all 0.2s;
    }

    .action-btn:hover {
      transform: scale(1.1);
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
    }

    .edit-btn:hover {
      background: #fff3cd;
    }

    .delete-btn:hover {
      background: #f8d7da;
    }

    .message-content {
      margin-bottom: 4px;
      line-height: 1.4;
    }

    .edit-mode {
      margin-top: 8px;
    }

    .edit-textarea {
      width: 100%;
      padding: 8px;
      border: 1px solid #ddd;
      border-radius: 4px;
      resize: vertical;
      font-family: inherit;
      font-size: 0.9rem;
      background: rgba(255, 255, 255, 0.9);
      color: #333;
    }

    .edit-actions {
      display: flex;
      gap: 8px;
      margin-top: 8px;
    }

    .save-btn, .cancel-btn {
      padding: 4px 8px;
      border: none;
      border-radius: 4px;
      font-size: 0.8rem;
      cursor: pointer;
      transition: all 0.2s;
    }

    .save-btn {
      background: #28a745;
      color: white;
    }

    .save-btn:hover {
      background: #218838;
    }

    .cancel-btn {
      background: #6c757d;
      color: white;
    }

    .cancel-btn:hover {
      background: #5a6268;
    }

    .deleted-message {
      font-style: italic;
    }

    .edited-indicator {
      font-size: 0.8rem;
      opacity: 0.7;
      margin-left: 8px;
    }

    .message-meta {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.75rem;
      opacity: 0.7;
      margin-top: 4px;
    }

    .timestamp {
      font-size: 0.7rem;
    }

    .message-status {
      margin-left: 8px;
    }

    .message-status.read .read-status {
      color: #4CAF50;
    }

    .message-input-container {
      border-top: 1px solid #e0e0e0;
      background: white;
      padding: 12px 16px;
    }

    .input-wrapper {
      display: flex;
      align-items: flex-end;
      gap: 8px;
    }

    .message-input {
      flex: 1;
      min-height: 40px;
      max-height: 120px;
      padding: 10px 14px;
      border: 1px solid #ddd;
      border-radius: 20px;
      resize: none;
      font-family: inherit;
      font-size: 0.9rem;
      outline: none;
      transition: border-color 0.2s;
    }

    .message-input:focus {
      border-color: #c72290;
      box-shadow: 0 0 0 2px rgba(199, 34, 144, 0.1);
    }

    .send-button {
      min-width: 40px;
      height: 40px;
      border: none;
      border-radius: 50%;
      background: linear-gradient(135deg, #c72290, #ee46c5);
      color: white;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
      box-shadow: 0 2px 8px rgba(199, 34, 144, 0.3);
    }

    .send-button:hover:not(:disabled) {
      transform: scale(1.05);
      box-shadow: 0 4px 12px rgba(199, 34, 144, 0.4);
    }

    .send-button:disabled {
      background: #ccc;
      cursor: not-allowed;
      transform: none;
      box-shadow: none;
    }

    .send-icon {
      font-size: 1.2rem;
      transform: rotate(-45deg);
    }

    .input-info {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 4px;
      font-size: 0.7rem;
      color: #999;
    }

    .warning {
      color: #ff9800;
      font-weight: 500;
    }

    .error-message {
      background: #ffebee;
      color: #c62828;
      padding: 8px 12px;
      margin: 8px 16px;
      border-radius: 4px;
      border-left: 4px solid #f44336;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .close-error {
      background: none;
      border: none;
      color: #c62828;
      cursor: pointer;
      font-size: 1.2rem;
      padding: 0;
      margin-left: 8px;
    }

    /* Responsive Design */
    @media (max-width: 768px) {
      .chat-container {
        height: 350px;
      }

      .message-wrapper.my-message .message {
        margin-left: 20px;
      }

      .message-wrapper.other-message .message {
        margin-right: 20px;
      }

      .message {
        max-width: 85%;
        padding: 10px 14px;
      }

      .messages-container {
        padding: 12px;
      }

      .message-input-container {
        padding: 10px 12px;
      }
    }
  `]
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
  showDebug: boolean = true;

  // Edit functionality
  editingMessageId: number | null = null;
  editMessageContent: string = '';

  // Auto-refresh functionality
  autoRefreshEnabled: boolean = true;
  private autoRefreshInterval: any;
  private readonly REFRESH_INTERVAL_MS = 5000; // 5 seconds

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
    this.startAutoRefresh();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    this.chatService.disconnect();
    this.stopAutoRefresh();
  }

  ngAfterViewChecked(): void {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
  }

  private startAutoRefresh(): void {
    if (this.autoRefreshEnabled) {
      this.autoRefreshInterval = setInterval(() => {
        if (!this.isLoading && this.currentUser && this.otherUser) {
          this.loadChatHistory(true); // silent reload
        }
      }, this.REFRESH_INTERVAL_MS);
    }
  }

  private stopAutoRefresh(): void {
    if (this.autoRefreshInterval) {
      clearInterval(this.autoRefreshInterval);
      this.autoRefreshInterval = null;
    }
  }

  toggleAutoRefresh(): void {
    if (this.autoRefreshEnabled) {
      this.startAutoRefresh();
    } else {
      this.stopAutoRefresh();
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
    this.rideRequestService.getAcceptedRequest().subscribe({
      next: (rideRequest) => {
        if (rideRequest && rideRequest.id === this.rideRequestId) {
          this.rideRequest = rideRequest;
          console.log('✅ Ride request loaded:', rideRequest);
          this.determineOtherUser();
        } else {
          console.log('🔍 Trying alternative method to load ride request...');
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
      if (this.rideRequest.offers && this.rideRequest.offers.length > 0) {
        const driverName = this.rideRequest.offers[0].driverName;
        this.loadUserByUsername(driverName);
      } else {
        this.errorMessage = 'Kein Fahrer gefunden für diese Fahrt';
      }
    } else if (this.currentUser.role === 'DRIVER') {
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
    if (this.currentUser) {
      this.otherUser = this.currentUser;
      console.log('⚠️ Fallback: Using self as other user for testing');
      this.loadChatHistory();
    }
  }

  private initializeChat(): void {
    this.chatService.connect();

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

    const connectionSubscription = this.chatService.getConnectionStatus().subscribe({
      next: (connected) => {
        this.isConnected = connected;
      }
    });

    this.subscriptions.add(connectionSubscription);
  }

  loadChatHistory(silent: boolean = false): void {
    if (!silent) {
      this.isLoading = true;
      this.errorMessage = '';
    }

    this.chatService.getChatHistory(this.rideRequestId).subscribe({
      next: (messages) => {
        this.messages = messages.sort((a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );

        // Auto-mark messages as read when user is on the page
        this.markAllUnreadMessagesAsRead();

        if (!silent) {
          this.shouldScrollToBottom = true;
        }
        this.isLoading = false;
        console.log('✅ Chat history loaded:', messages.length, 'messages');
      },
      error: (error) => {
        console.error('❌ Error loading chat history:', error);
        this.isLoading = false;
        if (error.status === 404) {
          console.log('ℹ️ No chat history found - this is normal for new chats');
          this.messages = [];
        } else if (!silent) {
          this.errorMessage = `Fehler beim Laden der Nachrichten: ${error.status}`;
        }
      }
    });
  }

  private markAllUnreadMessagesAsRead(): void {
    this.messages.forEach(message => {
      if (message.recipientId === this.currentUser?.id && message.status !== 'READ') {
        this.markAsRead(message);
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

  // Edit functionality
  startEditMessage(message: ChatMessageDto): void {
    this.editingMessageId = message.id || null;
    this.editMessageContent = message.content;
  }

  saveEditMessage(message: ChatMessageDto): void {
    if (!message.id || !this.editMessageContent.trim()) {
      return;
    }

    this.chatService.editMessage(message.id, this.editMessageContent.trim()).subscribe({
      next: (updatedMessage) => {
        console.log('✅ Message edited successfully:', updatedMessage);
        this.addOrUpdateMessage(updatedMessage);
        this.cancelEditMessage();
        this.errorMessage = '';
      },
      error: (error) => {
        console.error('❌ Error editing message:', error);
        this.errorMessage = `Fehler beim Bearbeiten: ${error.error?.message || error.message}`;
      }
    });
  }

  cancelEditMessage(): void {
    this.editingMessageId = null;
    this.editMessageContent = '';
  }

  deleteMessage(message: ChatMessageDto): void {
    if (!message.id || !confirm('Möchten Sie diese Nachricht wirklich löschen?')) {
      return;
    }

    this.chatService.deleteMessage(message.id).subscribe({
      next: () => {
        console.log('✅ Message deleted successfully');
        // Mark message as deleted locally
        message.deleted = true;
        message.content = '';
        this.errorMessage = '';
      },
      error: (error) => {
        console.error('❌ Error deleting message:', error);
        this.errorMessage = `Fehler beim Löschen: ${error.error?.message || error.message}`;
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

    // Auto-mark as read if message is for current user
    if (message.recipientId === this.currentUser?.id && message.status !== 'READ') {
      this.markAsRead(message);
    }
  }

  markAsRead(message: ChatMessageDto): void {
    if (message.id && message.recipientId === this.currentUser?.id) {
      this.chatService.markAsRead(message.id).subscribe({
        next: () => {
          // Update local message status
          message.status = 'READ';
        },
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
