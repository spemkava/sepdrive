package com.example.sepdrivebackend.dto;

import com.example.sepdrivebackend.model.ChatMessage;
import com.example.sepdrivebackend.model.MessageStatus;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@NoArgsConstructor
public class ChatMessageDto {

    private Long id;
    private String chatId;
    private Long senderId;
    private Long recipientId;
    private String content;
    private MessageStatus status;
    private boolean edited;
    private boolean deleted;
    private Instant timestamp;

    /**
     * Konstruktor für neue Nachrichten
     */
    public ChatMessageDto(String chatId, Long senderId, Long recipientId, String content) {
        this.chatId = chatId;
        this.senderId = senderId;
        this.recipientId = recipientId;
        this.content = content;
        this.status = MessageStatus.SENT;
        this.edited = false;
        this.deleted = false;
        this.timestamp = Instant.now();
    }

    /**
     * Factory-Methode zum Erstellen eines DTOs aus einer Entity
     */
    public static ChatMessageDto fromEntity(ChatMessage message) {
        ChatMessageDto dto = new ChatMessageDto();
        dto.setId(message.getId());
        dto.setChatId(message.getChatId());
        dto.setSenderId(message.getSender().getId());
        dto.setRecipientId(message.getRecipient().getId());
        dto.setContent(message.getContent());
        dto.setStatus(message.getStatus());
        dto.setEdited(message.isEdited());
        dto.setDeleted(message.isDeleted());
        dto.setTimestamp(message.getTimestamp());
        return dto;
    }
}