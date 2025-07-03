// src/main/java/.../controller/ChatWebSocketController.java
package com.example.sepdrivebackend.controller;

import com.example.sepdrivebackend.model.ChatMessage;
import com.example.sepdrivebackend.service.ChatMessageService;
import org.springframework.messaging.handler.annotation.*;
import org.springframework.stereotype.Controller;

@Controller
public class ChatWebSocketController {

    private final ChatMessageService service;

    public ChatWebSocketController(ChatMessageService service) {
        this.service = service;
    }

    @MessageMapping("/chat.send")
    public void send(@Payload ChatMessage msg,
                     @Header("simpUser") org.springframework.security.core.userdetails.User user) {
        msg.setSenderId(Long.parseLong(user.getUsername())); // Username = userId
        service.send(msg);
    }

    @MessageMapping("/chat.edit")
    public void edit(@Payload ChatMessage msg,
                     @Header("simpUser") org.springframework.security.core.userdetails.User user) {
        service.edit(msg.getId(), msg.getContent(),
                     Long.parseLong(user.getUsername()));
    }

    @MessageMapping("/chat.delete")
    public void delete(@Payload ChatMessage msg,
                       @Header("simpUser") org.springframework.security.core.userdetails.User user) {
        service.delete(msg.getId(), Long.parseLong(user.getUsername()));
    }

    @MessageMapping("/chat.readAck")
    public void readAck(@Payload ChatMessage msg,
                        @Header("simpUser") org.springframework.security.core.userdetails.User user) {
        service.markRead(msg.getId(), Long.parseLong(user.getUsername()));
    }
}
