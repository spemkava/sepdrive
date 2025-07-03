package com.example.sepdrivebackend.service;
import com.example.sepdrivebackend.model.RideStatus;

import com.example.sepdrivebackend.model.Ride;
import com.example.sepdrivebackend.model.RideRequest;
import com.example.sepdrivebackend.model.User;
import com.example.sepdrivebackend.repository.RideRepository;
import com.example.sepdrivebackend.repository.RideRequestRepository;
import jakarta.transaction.Transactional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Service
public class RideService {

    private final RideRepository rideRepository;
    private final RideRequestRepository rideRequestRepository;

    public RideService(RideRepository rideRepository, RideRequestRepository rideRequestRepository) {
        this.rideRepository = rideRepository;
        this.rideRequestRepository = rideRequestRepository;
    }

    /**
     * Erzeugt eine Fahrt aus einer Request (nach Annahme durch Fahrer)
     */
    @Transactional
    public Ride createRideFromRequest(RideRequest rideRequest, User driver) {
        Ride ride = new Ride();

        ride.setRideRequest(rideRequest);
        ride.setCustomer(rideRequest.getCustomer());
        ride.setDriver(driver);

        ride.setStartLatitude(rideRequest.getStartLatitude());
        ride.setStartLongitude(rideRequest.getStartLongitude());
        ride.setStartAddress(rideRequest.getStartAddress());

        ride.setDestinationLatitude(rideRequest.getDestinationLatitude());
        ride.setDestinationLongitude(rideRequest.getDestinationLongitude());
        ride.setDestinationAddress(rideRequest.getDestinationAddress());

        ride.setCarClass(rideRequest.getRequestedCarClass());
        ride.setStatus(RideStatus.PLANNED);
        ride.setStartedAt(Instant.now());

        Ride savedRide = rideRepository.save(ride);

        // Status der Anfrage ändern
        rideRequest.setStatus(RideStatus.ASSIGNED);
        rideRequestRepository.save(rideRequest);

        return savedRide;
    }

    public Optional<Ride> getCurrentActiveRideForUser(User user) {
        // Beispielhafte Abfrage nach aktiver Fahrt - Annahme: rideRepository unterstützt Filter nach Status und User
        return rideRepository.findTopByPassengerAndStatusInOrderByStartTimeDesc(user, List.of("RUNNING", "IN_PROGRESS"));
        // Alternativ eigene Status-Enum verwenden
    }
}