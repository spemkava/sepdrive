package com.example.sepdrivebackend.dto;

import lombok.*;

@Data
@NoArgsConstructor
public class OfferDto {
    private long id;
    private long driverId;
    private String driverName;
    private double driverRating;
    private int driverTotalRides;
}
