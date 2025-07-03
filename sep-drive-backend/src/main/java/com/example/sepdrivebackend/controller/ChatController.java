package com.example.sepdrivebackend.controller;

import com.example.sepdrivebackend.dto.ChatMessageDto;
import com.example.sepdrivebackend.service.ChatMessageService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/chat")
@RequiredArgsConstructor
public class ChatController {

    private final ChatMessageService chatMessageService;

    /**
     * Sendet eine neue Chat-Nachricht
     */
    @PostMapping("/messages")
    public ResponseEntity<ChatMessageDto> sendMessage(
            @RequestBody ChatMessageDto messageDto,
            Authentication authentication) {
        
        String username = authentication.getName();
        ChatMessageDto sentMessage = chatMessageService.sendMessage(messageDto, username);
        return ResponseEntity.ok(sentMessage);
    }

    /**
     * Ruft Chat-Verlauf für eine bestimmte Fahranfrage ab
     */
    @GetMapping("/messages/{rideRequestId}")
    public ResponseEntity<List<ChatMessageDto>> getChatHistory(
            @PathVariable Long rideRequestId,
            Authentication authentication) {
        
        String username = authentication.getName();
        List<ChatMessageDto> messages = chatMessageService.getChatHistory(rideRequestId, username);
        return ResponseEntity.ok(messages);
    }

    /**
     * Markiert Nachrichten als gelesen
     */
    @PutMapping("/messages/{messageId}/read")
    public ResponseEntity<Void> markAsRead(
            @PathVariable Long messageId,
            Authentication authentication) {
        
        String username = authentication.getName();
        chatMessageService.markAsRead(messageId, username);
        return ResponseEntity.ok().build();
    }

    /**
     * Bearbeitet eine Nachricht
     */
    @PutMapping("/messages/{messageId}")
    public ResponseEntity<ChatMessageDto> editMessage(
            @PathVariable Long messageId,
            @RequestBody String newContent,
            Authentication authentication) {
        
        String username = authentication.getName();
        ChatMessageDto editedMessage = chatMessageService.editMessage(messageId, newContent, username);
        return ResponseEntity.ok(editedMessage);
    }

    /**
     * Löscht eine Nachricht (markiert als gelöscht)
     */
    @DeleteMapping("/messages/{messageId}")
    public ResponseEntity<Void> deleteMessage(
            @PathVariable Long messageId,
            Authentication authentication) {
        
        String username = authentication.getName();
        chatMessageService.deleteMessage(messageId, username);
        return ResponseEntity.ok().build();
    }
}