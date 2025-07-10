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
  templateUrl: './working-chat.component.html',
  styleUrls: ['./working-chat.component.scss']
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
