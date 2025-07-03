// src/main/java/.../repository/ChatMessageRepository.java
package com.example.sepdrivebackend.repository;

import com.example.sepdrivebackend.model.ChatMessage;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {}
