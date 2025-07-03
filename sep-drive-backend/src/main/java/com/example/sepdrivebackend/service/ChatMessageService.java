// src/main/java/.../service/ChatMessageService.java
package com.example.sepdrivebackend.service;

import com.example.sepdrivebackend.model.*;
import com.example.sepdrivebackend.repository.ChatMessageRepository;
import org.springframework.stereotype.Service;
import org.springframework.messaging.simp.SimpMessagingTemplate;

@Service
public class ChatMessageService {

    private final ChatMessageRepository repo;
    private final SimpMessagingTemplate messaging;

    public ChatMessageService(ChatMessageRepository repo,
                              SimpMessagingTemplate messaging) {
        this.repo = repo;
        this.messaging = messaging;
    }

    public ChatMessage send(ChatMessage msg) {
        var saved = repo.save(msg);
        dispatch(saved);
        return saved;
    }

    public ChatMessage edit(Long id, String newContent, Long requesterId) {
        var msg = repo.findById(id).orElseThrow();
        ensureEditable(msg, requesterId);
        msg.setContent(newContent);
        msg.setEdited(true);
        var saved = repo.save(msg);
        dispatch(saved);
        return saved;
    }

    public ChatMessage delete(Long id, Long requesterId) {
        var msg = repo.findById(id).orElseThrow();
        ensureEditable(msg, requesterId);
        msg.setDeleted(true);
        var saved = repo.save(msg);
        dispatch(saved);
        return saved;
    }

    public void markRead(Long id, Long readerId) {
        var msg = repo.findById(id).orElseThrow();
        if (msg.getRecipientId().equals(readerId)) {
            msg.setStatus(MessageStatus.READ);
            repo.save(msg);
            dispatch(msg);
        }
    }

    /* ---------- Hilfsmethoden ---------- */

    private void ensureEditable(ChatMessage m, Long requester) {
        if (!m.getSenderId().equals(requester))
            throw new IllegalStateException("Nur Absender darf editieren/löschen");
        if (m.getStatus() == MessageStatus.READ)
            throw new IllegalStateException("Nachricht bereits gelesen");
    }

    private void dispatch(ChatMessage m) {
        messaging.convertAndSendToUser(
            m.getRecipientId().toString(), "/queue/chat", m);
        messaging.convertAndSendToUser(
            m.getSenderId().toString(), "/queue/chat", m);
    }
}
