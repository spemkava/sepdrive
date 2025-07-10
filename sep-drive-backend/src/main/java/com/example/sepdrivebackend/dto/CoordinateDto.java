package com.example.sepdrivebackend.dto;

// Hilfs-DTO für Koordinaten
public class CoordinateDto {
    private double lat;
    private double lon; // Wichtig: Muss zum Frontend passen (hier 'lon')

    // Getter und Setter...
    public double getLat() { return lat; }
    public void setLat(double lat) { this.lat = lat; }
    public double getLon() { return lon; }
    public void setLon(double lon) { this.lon = lon; }
}