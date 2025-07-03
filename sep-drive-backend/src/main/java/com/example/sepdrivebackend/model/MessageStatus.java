// src/main/java/.../model/MessageStatus.java
package com.example.sepdrivebackend.model;

public enum MessageStatus {
    SENT,     // abgesendet, Empfänger noch nicht zugestellt
    DELIVERED,// zugestellt, aber noch nicht gelesen
    READ      // vom Empfänger als gelesen bestätigt
}
