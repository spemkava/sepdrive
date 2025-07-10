package com.example.sepdrivebackend.repository;

import com.example.sepdrivebackend.model.Ride;
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
public interface RideRepository extends JpaRepository<Ride, Long> {
    Optional<Ride> findTopByPassengerAndStatusInOrderByStartTimeDesc(User passenger, List<String> running);
    List<Ride> findByStatus(RideStatus status);
    Optional<Ride> findByRideRequest(RideRequest rideRequest);

    @Query(value = """
        SELECT COALESCE(SUM(r.total_distance), 0)
        FROM rides r
        WHERE r.driver_id = :driverId
        """, nativeQuery = true)
    Double getTotalDistanceByDriverId(@Param("driverId") Long driverId);

    @Query(value = """
        SELECT COALESCE(AVG(r.customer_rating), 0)
        FROM  rides r
        WHERE r.driver_id = :driverId
        """, nativeQuery = true)
    Double getTotalAvgRatingByDriverId(@Param("driverId") Long driverId);

    @Query(value = """
        SELECT COALESCE(SUM(r.total_duration), 0)
        FROM rides r
        WHERE r.driver_id = :driverId
        """, nativeQuery = true)
    Double getTotalDrivingTimeByDriverId(@Param("driverId") Long driverId);

    @Query(value = """
        SELECT COUNT(*)
        FROM rides r
        WHERE r.driver_id = :driverId
        """, nativeQuery = true)
    Integer getTotalRidesByDriverId(@Param("driverId") Long driverId);

    @Query(value = """
        SELECT COALESCE(SUM(r.price), 0)
        FROM rides r
        WHERE r.driver_id = :driverId
        """, nativeQuery = true)
    Double getTotalMoneyByDriverId(@Param("driverId") Long driverId);
}