package com.example.sepdrivebackend.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

@Entity
@Table(name = "chat_messages")
@Getter
@Setter
@NoArgsConstructor
public class ChatMessage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * Chat-ID zur Gruppierung von Nachrichten (z.B. "ride_123" für Fahranfrage 123)
     */
    @Column(nullable = false)
    private String chatId;

    /**
     * Sender der Nachricht
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sender_id", nullable = false)
    private User sender;

    /**
     * Empfänger der Nachricht
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "recipient_id", nullable = false)
    private User recipient;

    /**
     * Nachrichteninhalt
     */
    @Column(length = 2000, nullable = false)
    private String content;

    /**
     * Status der Nachricht (SENT, DELIVERED, READ)
     */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private MessageStatus status = MessageStatus.SENT;

    /**
     * Zeitstempel der Nachricht
     */
    @Column(nullable = false)
    private Instant timestamp = Instant.now();

    /**
     * Markiert, ob die Nachricht bearbeitet wurde
     */
    @Column(nullable = false)
    private boolean edited = false;

    /**
     * Markiert, ob die Nachricht gelöscht wurde
     */
    @Column(nullable = false)
    private boolean deleted = false;

    /**
     * Konstruktor für neue Nachrichten
     */
    public ChatMessage(String chatId, User sender, User recipient, String content) {
        this.chatId = chatId;
        this.sender = sender;
        this.recipient = recipient;
        this.content = content;
        this.status = MessageStatus.SENT;
        this.timestamp = Instant.now();
        this.edited = false;
        this.deleted = false;
    }
}