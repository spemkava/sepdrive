// src/main/java/.../config/WebSocketConfig.java
package com.example.sepdrivebackend.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.*;
import org.springframework.web.socket.config.annotation.*;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Override
    public void configureMessageBroker(MessageBrokerRegistry c) {
        c.enableSimpleBroker("/queue");
        c.setUserDestinationPrefix("/user");
        c.setApplicationDestinationPrefixes("/app");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry r) {
        r.addEndpoint("/ws-chat").setAllowedOriginPatterns("*").withSockJS();
    }
}
