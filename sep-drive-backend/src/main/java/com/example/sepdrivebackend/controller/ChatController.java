package com.example.sepdrivebackend.controller;

import com.example.sepdrivebackend.dto.ChatMessageDto;
import com.example.sepdrivebackend.model.ChatMessage;
import com.example.sepdrivebackend.model.User;
import com.example.sepdrivebackend.repository.ChatMessageRepository;
import com.example.sepdrivebackend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

import java.util.List;
import java.util.stream.Collectors;

@Controller
@RequiredArgsConstructor
public class ChatController {

    private final SimpMessagingTemplate messagingTemplate;
    private final ChatMessageRepository chatMessageRepository;
    private final UserRepository userRepository;

    /**
     * Verarbeitet eingehende Chat-Nachrichten.
     * Wird aufgerufen, wenn ein Client eine Nachricht an "/app/chat.sendMessage" sendet.
     *
     * @param chatMessageDto Die empfangene Nachricht vom Frontend.
     */
    @MessageMapping("/chat.sendMessage")
    public void sendMessage(@Payload ChatMessageDto chatMessageDto) {
        // Benutzer-Entitäten aus der Datenbank laden
        User sender = userRepository.findById(chatMessageDto.getSenderId())
                .orElseThrow(() -> new UsernameNotFoundException("Sender nicht gefunden"));
        User recipient = userRepository.findById(chatMessageDto.getRecipientId())
                .orElseThrow(() -> new UsernameNotFoundException("Empfänger nicht gefunden"));

        // ChatMessage-Entität für die Speicherung in der DB erstellen
        ChatMessage messageToSave = new ChatMessage();
        messageToSave.setChatId(chatMessageDto.getChatId());
        messageToSave.setSender(sender);
        messageToSave.setRecipient(recipient);
        messageToSave.setContent(chatMessageDto.getContent());
        messageToSave.setStatus(ChatMessage.MessageStatus.SENT); // Status initial auf "Gesendet"

        // Nachricht in der Datenbank speichern
        ChatMessage savedMessage = chatMessageRepository.save(messageToSave);

        // Die gespeicherte Nachricht (inkl. generierter ID und Zeitstempel) an den Empfänger senden.
        // Der Empfänger muss das Topic "/user/{username}/queue/messages" abonniert haben.
        messagingTemplate.convertAndSendToUser(
                recipient.getUsername(), // Zielbenutzername
                "/queue/messages",       // Ziel-Queue
                ChatMessageDto.fromEntity(savedMessage) // Die zu sendende Nachricht
        );
    }
    
    /**
     * HTTP-Endpunkt, um den Chat-Verlauf für einen bestimmten Chat-Raum abzurufen.
     *
     * @param chatId Die ID des Chat-Raums (z.B. die ID der Fahranfrage).
     * @return Eine Liste aller Nachrichten für diesen Chat.
     */
    @GetMapping("/api/messages/{chatId}")
    public ResponseEntity<List<ChatMessageDto>> getChatHistory(@PathVariable String chatId) {
        List<ChatMessageDto> chatHistory = chatMessageRepository.findByChatIdOrderByTimestampAsc(chatId)
                .stream()
                .map(ChatMessageDto::fromEntity)
                .collect(Collectors.toList());
        return ResponseEntity.ok(chatHistory);
    }

    // Hier könnten später Methoden für das Bearbeiten und Löschen von Nachrichten folgen.
    // z.B. @MessageMapping("/chat.editMessage"), @MessageMapping("/chat.deleteMessage")
}