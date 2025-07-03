package com.example.sepdrivebackend.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import lombok.*;

@Entity
@Getter
@Setter
@NoArgsConstructor
public class Offer {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull
    private Long driverId;

    @NotNull
    private String driverName;

    @NotNull
    private double driverRating;

    @NotNull
    private int driverTotalRides;

    //Beziehung zur Faranfrage, für die ein Fahrangebot erstell wurde
    @NotNull
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn (name="rideRequest_id",referencedColumnName="id",nullable=false)
    private RideRequest rideRequest;
}
