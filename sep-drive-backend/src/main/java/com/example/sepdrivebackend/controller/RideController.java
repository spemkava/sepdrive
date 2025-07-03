package com.example.sepdrivebackend.controller;

import com.example.sepdrivebackend.dto.RideDto;
import com.example.sepdrivebackend.model.Ride;
import com.example.sepdrivebackend.model.RideRequest;
import com.example.sepdrivebackend.model.User;
import com.example.sepdrivebackend.repository.RideRequestRepository;
import com.example.sepdrivebackend.repository.UserRepository;
import com.example.sepdrivebackend.service.RideService;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.web.bind.annotation.*;

import java.util.Optional;

@RestController
@RequestMapping("/api/rides")
public class RideController {

    private final RideService rideService;
    private final RideRequestRepository rideRequestRepository;
    private final UserRepository userRepository; // oder dein Auth-Kontext/Fahrer-Kontext

    public RideController(RideService rideService,
                          RideRequestRepository rideRequestRepository,
                          UserRepository userRepository) {
        this.rideService = rideService;
        this.rideRequestRepository = rideRequestRepository;
        this.userRepository = userRepository;
    }

    @PostMapping("/from-request/{rideRequestId}/accept")
    public ResponseEntity<Ride> acceptRideRequest(@PathVariable Long rideRequestId, @RequestParam Long driverId) {
        RideRequest rideRequest = rideRequestRepository.findById(rideRequestId)
                .orElseThrow(() -> new EntityNotFoundException("RideRequest not found"));
        User driver = userRepository.findById(driverId)
                .orElseThrow(() -> new EntityNotFoundException("Driver not found"));

        Ride ride = rideService.createRideFromRequest(rideRequest, driver);
        return ResponseEntity.ok(ride);
    }

    @GetMapping("/api/rides/active")
    public ResponseEntity<RideDto> getCurrentActiveRide(Authentication authentication) {
        String username = authentication.getName();
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + username));
        Optional<Ride> rideOpt = rideService.getCurrentActiveRideForUser(user);
        return rideOpt.map(ride -> ResponseEntity.ok(RideDto.fromEntity(ride)))
                .orElseGet(() -> ResponseEntity.notFound().build());
    }
}