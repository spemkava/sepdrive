package com.example.sepdrivebackend.controller;

import com.example.sepdrivebackend.dto.RouteUpdateDto;
import com.example.sepdrivebackend.dto.SimulationProgressDto;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

@Controller
@MessageMapping("/simulation")
public class SimulationWebSocketController {

    private final SimpMessagingTemplate messagingTemplate;

    public SimulationWebSocketController(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    @MessageMapping("/progress") // Pfad für empfangene Nachrichten (Client -> Server)
    @SendTo("/topic/simulation-progress") // Pfad, an den die Nachrichten an Clients gesendet werden
    public SimulationProgressDto sendProgress(SimulationProgressDto progress) {
        return progress; // Broadcast an alle Abonnenten
    }

    @MessageMapping("/route-update")
    public void handleRouteUpdate(@Payload RouteUpdateDto routeUpdate) {
        if (routeUpdate != null && routeUpdate.getRideId() != null) {
            // WICHTIG: Führender Slash für korrekte Topic-Pfadbildung
            String topic = "/topic/route-update/" + routeUpdate.getRideId();
            String globalTopic = "/topic/route-update/global";
            System.out.println("Sende Routenaktualisierung an: " + topic);
            System.out.println("Payload: " + routeUpdate);

            messagingTemplate.convertAndSend(topic, routeUpdate);
            messagingTemplate.convertAndSend(globalTopic, routeUpdate);
        } else {
            System.err.println("Ungültige Routenaktualisierung empfangen: " + routeUpdate);
        }
    }
}


