// src/app/models/chat-message-dto.model.ts
export interface ChatMessageDto {
  id?: number;
  senderId: number;
  recipientId: number;
  content: string;
  status: 'SENT' | 'DELIVERED' | 'READ';
  edited: boolean;
  deleted: boolean;
  timestamp: string; // ISO
}
