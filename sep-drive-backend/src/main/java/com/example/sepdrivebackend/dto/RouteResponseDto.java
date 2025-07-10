// RouteResponseDto.java
package com.example.sepdrivebackend.dto;

public class RouteResponseDto {
    private String geoJson;
    private double distance;
    private double duration;
    private double price;

    // Getter/Setter
    public String getGeoJson() { return geoJson; }
    public void setGeoJson(String geoJson) { this.geoJson = geoJson; }
    public double getDistance() { return distance; }
    public void setDistance(double distance) { this.distance = distance; }
    public double getDuration() { return duration; }
    public void setDuration(double duration) { this.duration = duration; }
    public double getPrice() { return price; }
    public void setPrice(double price) { this.price = price; }
}