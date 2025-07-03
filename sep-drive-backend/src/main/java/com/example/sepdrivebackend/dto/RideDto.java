package com.example.sepdrivebackend.dto;

import com.example.sepdrivebackend.model.Ride;
import lombok.Data;
import java.time.LocalDateTime;

@Data
public class RideDto {

    private Long id;
    private String status;
    private String startLocation;
    private String endLocation;
    private String driverName;
    private String passengerName;
    private LocalDateTime startTime;
    private LocalDateTime endTime;
    private double distance;
    private double totalDuration;
    private double price;
    private Double ratingCustomer;
    private Double ratingDriver;
    private String customerFirstName;
    private String customerLastName;
    private String customerUsername;
    private String driverFirstName;
    private String driverLastName;
    private String driverUsername;

    // Konvertiert Entity zu DTO (Factory-Methode)
    public static RideDto fromEntity(Ride ride) {
        RideDto dto = new RideDto();
        dto.setId(ride.getId());
        dto.setStatus(ride.getStatus().toString());
        dto.setStartLocation(ride.getStartLocation());
        dto.setEndLocation(ride.getEndLocation());
        dto.setStartTime(ride.getStartTime());
        dto.setEndTime(ride.getEndTime());
        dto.setDistance(ride.getTotalDistance());
        dto.setTotalDuration(ride.getTotalDuration());
        dto.setPrice(ride.getPrice());
        dto.setRatingCustomer(ride.getCustomerRating());
        dto.setRatingDriver(ride.getDriverRating());

        if (ride.getCustomer() != null) {
            dto.setCustomerFirstName(ride.getCustomer().getFirstName());
            dto.setCustomerLastName(ride.getCustomer().getLastName());
            dto.setCustomerUsername(ride.getCustomer().getUsername());
        }

        if (ride.getDriver() != null) {
            dto.setDriverFirstName(ride.getDriver().getFirstName());
            dto.setDriverLastName(ride.getDriver().getLastName());
            dto.setDriverUsername(ride.getDriver().getUsername());
        }

        return dto;
    }
}