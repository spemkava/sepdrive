package com.example.sepdrivebackend.dto;


import com.example.sepdrivebackend.model.RideRequest;
import com.example.sepdrivebackend.model.RideStatus;
import com.example.sepdrivebackend.model.User;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Date;
import java.util.List;
import java.util.stream.Collectors;

@Data // Lombok für Getter/Setter etc.
@NoArgsConstructor // Lombok für leeren Konstruktor
public class RideRequestDto {
    private Long id;
    private Long customerId;
    private String customerUsername;
    private BigDecimal startLatitude;
    private BigDecimal startLongitude;
    private String startAddress;
    private BigDecimal destinationLatitude;
    private BigDecimal destinationLongitude;
    private String destinationAddress;
    private User.CarClass requestedCarClass;
    private BigDecimal totalDistance;
    private BigDecimal totalTime;
    private BigDecimal price;
    private RideStatus status;
    private List<OfferDto> offers;
    private Instant createdAt; // Sende Instant als ISO-String
    private Double CustomerProfileRating;
    private Double customerRating;
    private Double driverRating;
    private Instant completedAt;
    private List<StopLocationDto> stops;

    // Statische Methode, um ein DTO aus einem Entity zu erstellen
    public static RideRequestDto fromEntity(RideRequest rideRequest) {
        RideRequestDto dto = new RideRequestDto();
        if (rideRequest.getOffers() != null) {
        List<OfferDto> offerDtos = rideRequest.getOffers().stream()
            .map(offer -> {
                OfferDto offerDto = new OfferDto();
                offerDto.setId(offer.getId());
                offerDto.setDriverName(offer.getDriverName());
                offerDto.setDriverRating(offer.getDriverRating());
                offerDto.setDriverTotalRides(offer.getDriverTotalRides());
                return offerDto;
            }).collect(Collectors.toList());
        dto.setOffers(offerDtos);
        }
        dto.setId(rideRequest.getId());
        if (rideRequest.getCustomer() != null) { // Sicherstellen, dass Customer geladen ist
            dto.setCustomerId(rideRequest.getCustomer().getId());
            dto.setCustomerUsername(rideRequest.getCustomer().getUsername());
        }
        dto.setStartLatitude(rideRequest.getStartLatitude());
        dto.setStartLongitude(rideRequest.getStartLongitude());
        dto.setStartAddress(rideRequest.getStartAddress());
        dto.setDestinationLatitude(rideRequest.getDestinationLatitude());
        dto.setDestinationLongitude(rideRequest.getDestinationLongitude());
        dto.setDestinationAddress(rideRequest.getDestinationAddress());
        dto.setRequestedCarClass(rideRequest.getRequestedCarClass());
        dto.setTotalDistance(rideRequest.getTotalDistance());
        dto.setTotalTime(rideRequest.getTotalTime());
        dto.setPrice(rideRequest.getPrice());
        dto.setStatus(rideRequest.getStatus());
        dto.setCreatedAt(rideRequest.getCreatedAt());
        dto.setCustomerProfileRating(rideRequest.getCustomer().getRating());
        dto.setCustomerRating(rideRequest.getCustomerRating());
        dto.setDriverRating(rideRequest.getDriverRating());
        dto.setCompletedAt(rideRequest.getCompletedAt());

        dto.setStops(
                rideRequest.getStops() != null
                        ? rideRequest.getStops().stream()
                        .map(stop -> new StopLocationDto(
                                stop.getLatitude(),
                                stop.getLongitude(),
                                stop.getAddress()))
                        .collect(Collectors.toList())
                        : null
        );



        return dto;
    }
}