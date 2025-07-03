package com.example.sepdrivebackend.service;

import com.example.sepdrivebackend.dto.ChatMessageDto;
import com.example.sepdrivebackend.model.ChatMessage;
import com.example.sepdrivebackend.model.MessageStatus;
import com.example.sepdrivebackend.model.User;
import com.example.sepdrivebackend.repository.ChatMessageRepository;
import com.example.sepdrivebackend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ChatMessageService {

    private final ChatMessageRepository chatMessageRepository;
    private final UserRepository userRepository;
    private final SimpMessagingTemplate messagingTemplate;

    /**
     * Sendet eine neue Chat-Nachricht
     */
    @Transactional
    public ChatMessageDto sendMessage(ChatMessageDto messageDto, String senderUsername) {
        User sender = userRepository.findByUsername(senderUsername)
                .orElseThrow(() -> new UsernameNotFoundException("Sender not found: " + senderUsername));

        User recipient = userRepository.findById(messageDto.getRecipientId())
                .orElseThrow(() -> new UsernameNotFoundException("Recipient not found: " + messageDto.getRecipientId()));

        ChatMessage message = new ChatMessage();
        message.setChatId(messageDto.getChatId());
        message.setSender(sender);
        message.setRecipient(recipient);
        message.setContent(messageDto.getContent());
        message.setStatus(MessageStatus.SENT);
        message.setTimestamp(Instant.now());
        message.setEdited(false);
        message.setDeleted(false);

        ChatMessage savedMessage = chatMessageRepository.save(message);

        // WebSocket-Nachricht an Empfänger senden
        ChatMessageDto responseDto = convertToDto(savedMessage);
        messagingTemplate.convertAndSendToUser(
                recipient.getUsername(),
                "/queue/messages",
                responseDto
        );

        // Auch an Sender zur Bestätigung
        messagingTemplate.convertAndSendToUser(
                sender.getUsername(),
                "/queue/messages",
                responseDto
        );

        return responseDto;
    }

    /**
     * Ruft Chat-Verlauf für eine Fahranfrage ab
     */
    @Transactional(readOnly = true)
    public List<ChatMessageDto> getChatHistory(Long rideRequestId, String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + username));

        String chatId = "ride_" + rideRequestId;
        List<ChatMessage> messages = chatMessageRepository.findByChatIdAndUser(chatId, user.getId());

        return messages.stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
    }

    /**
     * Markiert eine Nachricht als gelesen
     */
    @Transactional
    public void markAsRead(Long messageId, String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + username));

        ChatMessage message = chatMessageRepository.findById(messageId)
                .orElseThrow(() -> new RuntimeException("Message not found: " + messageId));

        // Nur der Empfänger kann Nachrichten als gelesen markieren
        if (!message.getRecipient().getId().equals(user.getId())) {
            throw new RuntimeException("Not authorized to mark this message as read");
        }

        message.setStatus(MessageStatus.READ);
        chatMessageRepository.save(message);

        // WebSocket-Update senden
        ChatMessageDto dto = convertToDto(message);
        messagingTemplate.convertAndSendToUser(
                message.getSender().getUsername(),
                "/queue/messages/status",
                dto
        );
    }

    /**
     * Bearbeitet eine Nachricht
     */
    @Transactional
    public ChatMessageDto editMessage(Long messageId, String newContent, String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + username));

        ChatMessage message = chatMessageRepository.findById(messageId)
                .orElseThrow(() -> new RuntimeException("Message not found: " + messageId));

        // Nur der Sender kann seine Nachrichten bearbeiten
        if (!message.getSender().getId().equals(user.getId())) {
            throw new RuntimeException("Not authorized to edit this message");
        }

        // Nachrichten können nur bearbeitet werden, wenn sie noch nicht gelesen wurden
        if (message.getStatus() == MessageStatus.READ) {
            throw new RuntimeException("Cannot edit message that has been read");
        }

        message.setContent(newContent);
        message.setEdited(true);
        ChatMessage savedMessage = chatMessageRepository.save(message);

        // WebSocket-Update senden
        ChatMessageDto dto = convertToDto(savedMessage);
        messagingTemplate.convertAndSendToUser(
                message.getRecipient().getUsername(),
                "/queue/messages",
                dto
        );

        return dto;
    }

    /**
     * Löscht eine Nachricht (markiert als gelöscht)
     */
    @Transactional
    public void deleteMessage(Long messageId, String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + username));

        ChatMessage message = chatMessageRepository.findById(messageId)
                .orElseThrow(() -> new RuntimeException("Message not found: " + messageId));

        // Nur der Sender kann seine Nachrichten löschen
        if (!message.getSender().getId().equals(user.getId())) {
            throw new RuntimeException("Not authorized to delete this message");
        }

        // Nachrichten können nur gelöscht werden, wenn sie noch nicht gelesen wurden
        if (message.getStatus() == MessageStatus.READ) {
            throw new RuntimeException("Cannot delete message that has been read");
        }

        message.setDeleted(true);
        chatMessageRepository.save(message);

        // WebSocket-Update senden
        ChatMessageDto dto = convertToDto(message);
        messagingTemplate.convertAndSendToUser(
                message.getRecipient().getUsername(),
                "/queue/messages",
                dto
        );
    }

    /**
     * Konvertiert ChatMessage Entity zu DTO
     */
    private ChatMessageDto convertToDto(ChatMessage message) {
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