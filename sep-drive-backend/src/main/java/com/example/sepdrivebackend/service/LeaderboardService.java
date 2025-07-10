package com.example.sepdrivebackend.service;

import com.example.sepdrivebackend.repository.RideRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@RequiredArgsConstructor
@Service
public class LeaderboardService {

    private final RideRepository rideRepository;

    public Double getTotalDistance(Long driverId) {
        return rideRepository.getTotalDistanceByDriverId(driverId);
    }

    public Double getTotalAvgRating(Long driverId) {
        return rideRepository.getTotalAvgRatingByDriverId(driverId);
    }

    public Double getTotalDrivingTime(Long driverId) {
        return rideRepository.getTotalDrivingTimeByDriverId(driverId);
    }

    public Integer getTotalRides(Long driverId) {
        return rideRepository.getTotalRidesByDriverId(driverId);
    }

    public Double getTotalMoney(Long driverId) {
        return rideRepository.getTotalMoneyByDriverId(driverId);
    }
}
