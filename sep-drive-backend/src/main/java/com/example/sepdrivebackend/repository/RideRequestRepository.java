package com.example.sepdrivebackend.repository;

import com.example.sepdrivebackend.model.RideRequest;
import com.example.sepdrivebackend.model.RideStatus;
import com.example.sepdrivebackend.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface RideRequestRepository extends JpaRepository<RideRequest, Long> {

    // Methode, um eine aktive Anfrage für einen bestimmten Kunden zu finden
    // Wird benötigt, um die Regel "nur eine aktive Anfrage pro Kunde" zu prüfen.
    Optional<RideRequest> findByCustomerAndStatus(User customer, RideStatus status);

    @Query("SELECT rr FROM RideRequest rr " +
       "JOIN rr.offers o " +
       "WHERE o.driverName = :driverName " +
       "AND rr.status = com.example.sepdrivebackend.model.RideStatus.ACCEPTED " +
       "ORDER BY rr.createdAt ASC")
    Optional<RideRequest> findFirstByDriverNameAndStatus(@Param("driverName") String driverName);

    List<RideRequest> findByStatusIn(List<RideStatus> statuses);
}
