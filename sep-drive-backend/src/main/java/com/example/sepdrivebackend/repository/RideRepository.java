package com.example.sepdrivebackend.repository;

import com.example.sepdrivebackend.model.Ride;
import com.example.sepdrivebackend.model.RideRequest;
import com.example.sepdrivebackend.model.RideStatus;
import com.example.sepdrivebackend.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface RideRepository extends JpaRepository<Ride, Long> {
    Optional<Ride> findTopByPassengerAndStatusInOrderByStartTimeDesc(User passenger, List<String> running);
    List<RideRequest> findByStatus(RideStatus status);

    // Eigene Methoden bei Bedarf ergänzen, zum Beispiel:
    // List<Ride> findByCustomerId(Long customerId);
    // List<Ride> findByDriverId(Long driverId);
}