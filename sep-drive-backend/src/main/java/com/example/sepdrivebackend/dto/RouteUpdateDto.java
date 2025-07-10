package com.example.sepdrivebackend.dto;

import java.util.List;

// Haupt-DTO für das Routen-Update
public class RouteUpdateDto {
    private Long rideId;
    private CoordinateDto start;
    private CoordinateDto destination;
    private List<CoordinateDto> stops;

    // Getter und Setter...
    public Long getRideId() { return rideId; }
    public void setRideId(Long rideId) { this.rideId = rideId; }
    public CoordinateDto getStart() { return start; }
    public void setStart(CoordinateDto start) { this.start = start; }
    public CoordinateDto getDestination() { return destination; }
    public void setDestination(CoordinateDto destination) { this.destination = destination; }
    public List<CoordinateDto> getStops() { return stops; }
    public void setStops(List<CoordinateDto> stops) { this.stops = stops; }
}
