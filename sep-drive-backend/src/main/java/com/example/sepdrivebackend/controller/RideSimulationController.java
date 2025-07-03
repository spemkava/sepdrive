package com.example.sepdrivebackend.controller;

import com.example.sepdrivebackend.model.Coordinate;
import com.example.sepdrivebackend.model.RideSimulation;
import com.example.sepdrivebackend.service.RideSimulationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Arrays;
import java.util.List;

@RestController
@RequestMapping("/api/ride-simulation")
public class RideSimulationController {

    @Autowired
    private RideSimulationService simulationService;

    /**
     * Startet die Simulation für die Fahrt
     */
    @PostMapping("/{rideId}/start")
    public ResponseEntity<Void> startSimulation(@PathVariable Long rideId) {
        simulationService.startSimulation(rideId);
        return ResponseEntity.ok().build();
    }

    /**
     * Gibt aktuellen Simulationsfortschritt für Fahrt zurück
     */
    @GetMapping("/{rideId}/progress")
    public ResponseEntity<RideSimulation> getProgress(@PathVariable Long rideId) {

            RideSimulation sim = simulationService.getSimulation(rideId);
            if (sim == null)
                return ResponseEntity.notFound().build();
            return ResponseEntity.ok(sim);

    }

    @PostMapping("/{rideId}/pause")
    public ResponseEntity<Void> pauseSimulation(@PathVariable Long rideId) {
        simulationService.pauseSimulation(rideId);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{rideId}/resume")
    public ResponseEntity<Void> resumeSimulation(@PathVariable Long rideId) {
        simulationService.resumeSimulation(rideId);
        return ResponseEntity.ok().build();
    }

    // Endpunkt für später: Geschwindigkeit ändern
    @PostMapping("/{rideId}/speed/{speed}")
    public ResponseEntity<Void> setSpeed(@PathVariable Long rideId, @PathVariable double speed) {
        simulationService.setSpeed(rideId, speed);
        return ResponseEntity.ok().build();
    }

    // DEMO-Simulation für eine Beispiel-Route
    @GetMapping("/123/progress")
    public ResponseEntity<RideSimulation> getDemoSimulation() {
        List<Coordinate> route = List.of(
                new Coordinate(52.520798, 13.404954),
                new Coordinate(52.520500, 13.405500),
                new Coordinate(52.521000, 13.406000),
                new Coordinate(52.521800, 13.407000),
                new Coordinate(52.522500, 13.407800),
                new Coordinate(52.523200, 13.408400)
        );
        RideSimulation sim = new RideSimulation(999L, route, 1.0);
        sim.setCurrentStep(0);
        sim.setStatus("RUNNING");
        return ResponseEntity.ok(sim);
    }
    @PostMapping("/123/start")
    public ResponseEntity<Void> startDemoSimulation() {
        // Hier kannst du das Starten einer Demo-Simulation vorsehen
        return ResponseEntity.ok().build();
    }

    @PostMapping("/123/pause")
    public ResponseEntity<Void> pauseDemoSimulation() {
        // Hier kannst du das Pausieren simulieren
        return ResponseEntity.ok().build();
    }
}

