package com.example.sepdrivebackend.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "rides")
@Getter
@Setter
@NoArgsConstructor
public class Ride {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    //Verweis auf ursprüngliche Fahrtanfrage
    @ManyToOne
    @JoinColumn(name = "ride_request_id")
    private RideRequest rideRequest;

    //Fahrer und Kunde
    @ManyToOne
    @JoinColumn(name = "driver_id")
    private User driver;

    @ManyToOne
    @JoinColumn(name = "customer_id")
    private User customer;

    @ManyToOne
    @JoinColumn(name = "passenger_id")
    private User passenger;

    //Zeitstempel
    private LocalDateTime startTime;
    private LocalDateTime endTime;

    @ElementCollection
    private List<Coordinate> route; // Liste von Koordinaten für die Route

    //Simulationsfortschritt
    private int currentStep;


    @NotNull
    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    private RideStatus status;

    //Preis und Bewertung
    private BigDecimal price;

    private Double driverRating;   // von Kunde für Fahrer (1-5)
    private Double customerRating; // von Fahrer für Kunde (1-5)

    //Streckeninformationen
    private BigDecimal totalDistance; // Gesamtdistanz der Fahrt in Kilometern
    private BigDecimal totalDuration; // Gesamtdauer der Fahrt in Minuten

    //Startpunkt
    @Column(precision = 10, scale = 7)
    private BigDecimal startLatitude;
    @Column(precision = 10, scale = 7)
    private BigDecimal startLongitude;

    @Column(length = 255)
    private String startAddress;

    //Zielpunkt
    @Column(precision = 10, scale = 7)
    private BigDecimal destinationLatitude;
    @Column(precision = 10, scale = 7)
    private BigDecimal destinationLongitude;
    @Column(length = 255)
    private String destinationAddress;

    // Fahrzeugklasse (aus dem User Enum)
    @Enumerated(EnumType.STRING)
    private User.CarClass carClass;

    // Zeitstempel
    private Instant startedAt;
    private Instant updatedAt;


    public String getStartLocation() {
        return this.startAddress;
    }

    public String getEndLocation() {
        return this.destinationAddress;
    }

}