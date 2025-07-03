package com.example.sepdrivebackend.dto;

import com.example.sepdrivebackend.model.User;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class CreateRideRequestDto {
    @NotNull
    private BigDecimal startLatitude;
    @NotNull
    private BigDecimal startLongitude;
    private String startAddress; // Adresse ist optional

    @NotNull
    private BigDecimal destinationLatitude;
    @NotNull
    private BigDecimal destinationLongitude;
    private String destinationAddress; // Adresse ist optional

    @NotNull
    private User.CarClass requestedCarClass;

    @NotNull
    private BigDecimal totalDistance;
    @NotNull
    private BigDecimal totalTime;
    @NotNull
    private BigDecimal price;



}