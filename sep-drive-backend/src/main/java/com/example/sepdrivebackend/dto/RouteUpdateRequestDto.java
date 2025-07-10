// RouteUpdateRequestDto.java
package com.example.sepdrivebackend.dto;

import java.util.List;

public class RouteUpdateRequestDto {
    private double currentLat;
    private double currentLon;
    private List<Waypoint> waypoints;
    private Double newDestinationLat;
    private Double newDestinationLon;

    // Getter/Setter

    public static class Waypoint {
        private double lat;
        private double lon;
        // Getter/Setter
        public double getLat() { return lat; }
        public void setLat(double lat) { this.lat = lat; }
        public double getLon() { return lon; }
        public void setLon(double lon) { this.lon = lon; }
    }

    public double getCurrentLat() { return currentLat; }
    public void setCurrentLat(double currentLat) { this.currentLat = currentLat; }
    public double getCurrentLon() { return currentLon; }
    public void setCurrentLon(double currentLon) { this.currentLon = currentLon; }
    public List<Waypoint> getWaypoints() { return waypoints; }
    public void setWaypoints(List<Waypoint> waypoints) { this.waypoints = waypoints; }
    public Double getNewDestinationLat() { return newDestinationLat; }
    public void setNewDestinationLat(Double newDestinationLat) { this.newDestinationLat = newDestinationLat; }
    public Double getNewDestinationLon() { return newDestinationLon; }
    public void setNewDestinationLon(Double newDestinationLon) { this.newDestinationLon = newDestinationLon; }
}