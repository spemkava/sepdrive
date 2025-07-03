package com.example.sepdrivebackend.dto;

import com.example.sepdrivebackend.model.MessageStatus;

import java.time.Instant;

/**
 * Daten-Transfer-Objekt für Chat-Nachrichten.
 */
public class ChatMessageDto {

    private Long id;
    private Long senderId;
    private Long recipientId;
    private String content;
    private MessageStatus status;   // SENT | DELIVERED | READ
    private boolean edited;
    private boolean deleted;
    private Instant timestamp;

    /* ---------- Konstruktoren ---------- */

    public ChatMessageDto() {
        // nötig für Jackson / Deserialisierung
    }

    public ChatMessageDto(Long id,
                          Long senderId,
                          Long recipientId,
                          String content,
                          MessageStatus status,
                          boolean edited,
                          boolean deleted,
                          Instant timestamp) {
        this.id          = id;
        this.senderId    = senderId;
        this.recipientId = recipientId;
        this.content     = content;
        this.status      = status;
        this.edited      = edited;
        this.deleted     = deleted;
        this.timestamp   = timestamp;
    }

    /* ---------- Getter ---------- */

    public Long getId()                { return id; }
    public Long getSenderId()          { return senderId; }
    public Long getRecipientId()       { return recipientId; }
    public String getContent()         { return content; }
    public MessageStatus getStatus()   { return status; }
    public boolean isEdited()          { return edited; }
    public boolean isDeleted()         { return deleted; }
    public Instant getTimestamp()      { return timestamp; }

    /* ---------- Setter ---------- */

    public void setId(Long id)                           { this.id = id; }
    public void setSenderId(Long senderId)               { this.senderId = senderId; }
    public void setRecipientId(Long recipientId)         { this.recipientId = recipientId; }
    public void setContent(String content)               { this.content = content; }
    public void setStatus(MessageStatus status)          { this.status = status; }
    public void setEdited(boolean edited)                { this.edited = edited; }
    public void setDeleted(boolean deleted)              { this.deleted = deleted; }
    public void setTimestamp(Instant timestamp)          { this.timestamp = timestamp; }
}
