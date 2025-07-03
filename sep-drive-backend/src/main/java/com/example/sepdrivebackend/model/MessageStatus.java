package com.example.sepdrivebackend.model;

public enum MessageStatus {
    SENT,     // Nachricht gesendet, aber noch nicht zugestellt
    DELIVERED,// Nachricht zugestellt, aber noch nicht gelesen
    READ      // Nachricht vom Empfänger gelesen
}