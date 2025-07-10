package com.example.sepdrivebackend.controller;

import com.example.sepdrivebackend.model.User;
import com.example.sepdrivebackend.service.LeaderboardService;
import com.example.sepdrivebackend.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RequiredArgsConstructor
@RestController
@RequestMapping("/api/leaderboard")
public class LeaderboardController {

    private final UserService userService;
    private final LeaderboardService leaderboardService;

    @GetMapping("/drivers")
    public ResponseEntity<List<User>> getDrivers() {
        return ResponseEntity.ok(userService.getDrivers());
    }

    @GetMapping("/total-distance/{driverId}")
    public ResponseEntity<Double> getTotalDistance(@PathVariable Long driverId) {
        Double distance = leaderboardService.getTotalDistance(driverId);
        return ResponseEntity.ok(distance);
    }

    @GetMapping("/total-avg-rating/{driverId}")
    public ResponseEntity<Double> getTotalAvgRating(@PathVariable Long driverId) {
        Double rating = leaderboardService.getTotalAvgRating(driverId);
        return ResponseEntity.ok(rating);
    }

    @GetMapping("/total-driving-time/{driverId}")
    public ResponseEntity<Double> getTotalTotalDrivingTime(@PathVariable Long driverId) {
        Double drivingTime = leaderboardService.getTotalDrivingTime(driverId);
        return ResponseEntity.ok(drivingTime);
    }

    @GetMapping("/total-rides/{driverId}")
    public ResponseEntity<Integer> getTotalRides(@PathVariable Long driverId) {
        Integer rides = leaderboardService.getTotalRides(driverId);
        return ResponseEntity.ok(rides);
    }

    @GetMapping("/total-money/{driverId}")
    public ResponseEntity<Double> getTotalMoney(@PathVariable Long driverId) {
        Double money = leaderboardService.getTotalMoney(driverId);
        return ResponseEntity.ok(money);
    }
}
