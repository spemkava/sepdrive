import { Component, Input, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';

import { ChatService } from '../../services/chat.service';
import { AuthService } from '../../services/auth.service';
import { UserService } from '../../services/user.service';
import { ChatMessageDto } from '../../models/chat-message-dto.model';
import { UserProfile } from '../../models/user-profile.model';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.scss']
})
export class ChatComponent implements OnInit, OnDestroy, AfterViewChecked {
  @Input() rideRequestId!: number;
  @ViewChild('messageContainer') private messageContainer!: ElementRef;

  messages: ChatMessageDto[] = [];
  newMessage: string = '';
  currentUser: UserProfile | null = null;
  otherUser: UserProfile | null = null;
  isLoading: boolean = false;
  isConnected: boolean = false;

  private subscriptions = new Subscription();
  private shouldScrollToBottom = false;

  constructor(
    private chatService: ChatService,
    private authService: AuthService,
    private userService: UserService
  ) {}

  ngOnInit(): void {
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
      },
      error: (error) => {
        console.error('Error loading current user:', error);
      }
    });
  }

  private initializeChat(): void {
    if (!this.rideRequestId) {
      console.error('No ride request ID provided for chat');
      return;
    }

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
        console.error('Error receiving messages:', error);
      }
    });

    this.subscriptions.add(messageSubscription);

    // Chat-Verlauf laden
    this.loadChatHistory();

    // Verbindungsstatus überwachen
    const connectionSubscription = this.chatService.getConnectionStatus().subscribe({
      next: (connected) => {
        this.isConnected = connected;
      }
    });

    this.subscriptions.add(connectionSubscription);
  }

  private loadChatHistory(): void {
    this.isLoading = true;

    this.chatService.getChatHistory(this.rideRequestId).subscribe({
      next: (messages) => {
        this.messages = messages;
        this.shouldScrollToBottom = true;
        this.isLoading = false;

        // Andere User-Informationen laden (falls noch nicht geladen)
        this.loadOtherUserInfo();
      },
      error: (error) => {
        console.error('Error loading chat history:', error);
        this.isLoading = false;
      }
    });
  }

  private loadOtherUserInfo(): void {
    if (this.messages.length > 0 && this.currentUser) {
      // Finde den anderen User aus den Nachrichten
      const otherUserId = this.messages.find(m =>
        m.senderId !== this.currentUser!.id
      )?.senderId || this.messages.find(m =>
        m.recipientId !== this.currentUser!.id
      )?.recipientId;

      if (otherUserId) {
        // TODO: Load user by ID - this would need a new service method
        console.log('Other user ID:', otherUserId);
      }
    }
  }

  sendMessage(): void {
    if (!this.newMessage.trim() || !this.currentUser || !this.rideRequestId) {
      return;
    }

    // Empfänger-ID ermitteln (vereinfacht - würde normalerweise aus dem Kontext kommen)
    const recipientId = this.getRecipientId();
    if (!recipientId) {
      console.error('Cannot determine recipient ID');
      return;
    }

    const messageDto: ChatMessageDto = {
      chatId: `ride_${this.rideRequestId}`,
      senderId: this.currentUser.id,
      recipientId: recipientId,
      content: this.newMessage.trim(),
      status: 'SENT',
      edited: false,
      deleted: false,
      timestamp: new Date().toISOString()
    };

    this.chatService.sendMessage(messageDto).subscribe({
      next: (sentMessage) => {
        this.addOrUpdateMessage(sentMessage);
        this.newMessage = '';
        this.shouldScrollToBottom = true;
      },
      error: (error) => {
        console.error('Error sending message:', error);
      }
    });
  }

  private getRecipientId(): number | undefined {
    // In einer echten Implementierung würde die Empfänger-ID aus dem
    // Kontext der Fahranfrage kommen (Kunde vs. Fahrer)
    if (this.messages.length > 0 && this.currentUser) {
      return this.messages.find(m =>
        m.senderId !== this.currentUser!.id
      )?.senderId || this.messages.find(m =>
        m.recipientId !== this.currentUser!.id
      )?.recipientId;
    }
    return undefined;
  }

  private addOrUpdateMessage(message: ChatMessageDto): void {
    const existingIndex = this.messages.findIndex(m => m.id === message.id);

    if (existingIndex !== -1) {
      // Update existing message
      this.messages[existingIndex] = message;
    } else {
      // Add new message
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
          console.error('Error marking message as read:', error);
        }
      });
    }
  }

  isMyMessage(message: ChatMessageDto): boolean {
    return message.senderId === this.currentUser?.id;
  }

  private scrollToBottom(): void {
    try {
      if (this.messageContainer) {
        this.messageContainer.nativeElement.scrollTop =
          this.messageContainer.nativeElement.scrollHeight;
      }
    } catch (err) {
      console.error('Error scrolling to bottom:', err);
    }
  }

  onKeyPress(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  /**
   * TrackBy function for ngFor to improve performance
   */
  trackByMessageId(index: number, message: ChatMessageDto): any {
    return message.id || index;
  }
}
