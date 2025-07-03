// src/app/services/chat-socket.service.ts
import { Injectable } from '@angular/core';
import { Client, IMessage, Stomp } from '@stomp/stompjs';
import * as SockJS from 'sockjs-client';
import { BehaviorSubject } from 'rxjs';
import { ChatMessageDto } from '../models/chat-message-dto.model';

@Injectable({ providedIn: 'root' })
export class ChatSocketService {

  private stompClient!: Client;
  private messages$ = new BehaviorSubject<ChatMessageDto | null>(null);

  connect(token: string) {
    this.stompClient = new Client({
      webSocketFactory: () => new SockJS('/ws-chat'),
      connectHeaders: { Authorization: `Bearer ${token}` },
      debug: () => {}, // optional logging
      heartbeatIncoming: 20000,
      heartbeatOutgoing: 20000
    });

    this.stompClient.onConnect = () => {
      this.stompClient.subscribe('/user/queue/chat', msg =>
        this.messages$.next(JSON.parse(msg.body)));
    };

    this.stompClient.activate();
  }

  send(m: ChatMessageDto) {
    this.stompClient.publish({
      destination: '/app/chat.send',
      body: JSON.stringify(m)
    });
  }

  edit(id: number, newContent: string) {
    this.stompClient.publish({
      destination: '/app/chat.edit',
      body: JSON.stringify({ id, content: newContent })
    });
  }

  delete(id: number) {
    this.stompClient.publish({
      destination: '/app/chat.delete',
      body: JSON.stringify({ id })
    });
  }

  readAck(id: number) {
    this.stompClient.publish({
      destination: '/app/chat.readAck',
      body: JSON.stringify({ id })
    });
  }

  stream() {
    return this.messages$.asObservable();
  }
}
