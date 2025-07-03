package com.example.sepdrivebackend.controller;

import com.example.sepdrivebackend.dto.RideRequestDto;
import com.example.sepdrivebackend.model.RideStatus;
import com.example.sepdrivebackend.service.RideRequestService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import java.util.List;

@RequiredArgsConstructor
@RestController
@RequestMapping("/api/ride-history")
public class RideHistoryController {

    private final RideRequestService rideRequestService;

    @GetMapping("/history")
    public List<RideRequestDto> getCompletedRideRequests() {
        List<RideStatus> completedRides = List.of(RideStatus.COMPLETED);
        return rideRequestService.getRequestsByStatuses(completedRides);
    }
}
