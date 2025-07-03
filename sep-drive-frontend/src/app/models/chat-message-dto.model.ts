export type MessageStatus = 'SENT' | 'DELIVERED' | 'READ';

export interface ChatMessageDto {
  id?: number;
  chatId?: string;
  senderId: number;
  recipientId: number;
  content: string;
  status: MessageStatus;
  edited: boolean;
  deleted: boolean;
  timestamp: string; // ISO string
}

/**
 * Factory function to create a new chat message
 */
export function createChatMessage(
  chatId: string,
  senderId: number,
  recipientId: number,
  content: string
): ChatMessageDto {
  return {
    chatId,
    senderId,
    recipientId,
    content,
    status: 'SENT',
    edited: false,
    deleted: false,
    timestamp: new Date().toISOString()
  };
}

/**
 * Helper function to check if message belongs to current user
 */
export function isMessageFromUser(message: ChatMessageDto, userId: number): boolean {
  return message.senderId === userId;
}

/**
 * Helper function to format timestamp for display
 */
export function formatMessageTime(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

  if (diffInHours < 24) {
    // Show time if today
    return date.toLocaleTimeString('de-DE', {
      hour: '2-digit',
      minute: '2-digit'
    });
  } else if (diffInHours < 24 * 7) {
    // Show day and time if this week
    return date.toLocaleDateString('de-DE', {
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  } else {
    // Show full date if older
    return date.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}
