package com.example.sepdrivebackend.model;

import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
public class RideSimulation {

    private Long rideId;
    private int currentStep;
    private String status; // Running, Paused, Finished
    private double speed;
    //Route hardcodiert zum Ausprobieren
    private List<Coordinate> route; // Liste von Koordinaten, die die Route repräsentieren


    public RideSimulation(Long rideId, List<Coordinate> route,double speed) {
        this.rideId = rideId;
        this.route = route;
        this.speed = speed;
        this.currentStep = 0; // Start bei Schritt 0
        this.status = "Running"; // Startstatus ist "Running"
    }
}
