package com.example.sepdrivebackend.dto;

import lombok.*;

@Getter
@Setter
@Data
@NoArgsConstructor
public class SimulationProgressDto {
    private String rideId;
    private int currentIndex;
    private double lat;
    private double lon;
    private boolean isFinished;


}