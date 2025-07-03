package com.example.sepdrivebackend.controller;

import com.example.sepdrivebackend.dto.SimulationProgressDto;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.SendTo;

public class SimulationWebSocketController {
    @MessageMapping("/simulation/progress") // Pfad für empfangene Nachrichten (Client -> Server)
    @SendTo("/topic/simulation-progress") // Pfad, an den die Nachrichten an Clients gesendet werden
    public SimulationProgressDto sendProgress(SimulationProgressDto progress) {
        // Hier kannst du evtl. Validierung, Logging oder weitere Logik einfügen
        return progress; // Broadcast an alle Abonnenten
    }
}


