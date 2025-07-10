package com.example.sepdrivebackend.controller;

import com.example.sepdrivebackend.dto.RouteResponseDto;
import com.example.sepdrivebackend.dto.RouteUpdateRequestDto;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/route")
public class RoutingController {
   @Value("${ors.api.key}")
    private String orsApiKey;

    @GetMapping
    public ResponseEntity<String> getRoute(
        @RequestParam double startLat,
        @RequestParam double startLon,
        @RequestParam double endLat,
        @RequestParam double endLon)  {
System.out.println("Route received: " + startLat + " " + startLon + " " + endLat + " " + endLon);
        String orsUrl = "https://api.openrouteservice.org/v2/directions/driving-car/geojson";

        RestTemplate restTemplate = new RestTemplate();

        HttpHeaders headers = new HttpHeaders();
        headers.set("Authorization", orsApiKey);
        headers.setContentType(MediaType.APPLICATION_JSON);

        Map<String, Object> body = Map.of(
                "coordinates", List.of(
                        List.of(startLon, startLat), // OpenRouteService erwartet [lon, lat]
                        List.of(endLon, endLat)
                )


        );

        HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);

        try {
            ResponseEntity<String> response = restTemplate.postForEntity(orsUrl, request, String.class);
            System.out.println("ORS Response: " + response.getBody());

            ObjectMapper mapper = new ObjectMapper();
            JsonNode root = mapper.readTree(response.getBody());

            // Prüfe, ob die GeoJSON-Koordinaten existieren
            JsonNode coordinatesNode = root.path("features").get(0).path("geometry").path("coordinates");
            if (coordinatesNode.isMissingNode() || !coordinatesNode.isArray()) {
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("No coordinates found in ORS response");
            }
            // Gehe zu routes[0].geometry.coordinates
            //JsonNode coordinatesNode = root.path("routes").get(0).path("geometry").path("coordinates");

            if (coordinatesNode.isMissingNode() || !coordinatesNode.isArray()) {
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("No coordinates found in ORS response");
            }
            return ResponseEntity.ok(response.getBody());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Routing failed: " + e.getMessage());
        }

    }

    @PostMapping("/rides/{rideId}/update-route")
    public ResponseEntity<RouteResponseDto> updateRoute(
            @PathVariable Long rideId,
            @RequestBody RouteUpdateRequestDto request) {

        List<List<Double>> coordinates = new ArrayList<>();

        // Beispiel: aktuelle Position aus Request
        double currentLat = request.getCurrentLat();
        double currentLon = request.getCurrentLon();
        coordinates.add(List.of(currentLon, currentLat));

        if (request.getWaypoints() != null) {
            for (RouteUpdateRequestDto.Waypoint wp : request.getWaypoints()) {
                coordinates.add(List.of(wp.getLon(), wp.getLat()));
            }
        }

        if (request.getNewDestinationLat() != null && request.getNewDestinationLon() != null) {
            coordinates.add(List.of(request.getNewDestinationLon(), request.getNewDestinationLat()));
        }

        String orsUrl = "https://api.openrouteservice.org/v2/directions/driving-car/geojson";
        RestTemplate restTemplate = new RestTemplate();
        HttpHeaders headers = new HttpHeaders();
        headers.set("Authorization", orsApiKey);
        headers.setContentType(MediaType.APPLICATION_JSON);

        Map<String, Object> body = Map.of("coordinates", coordinates);
        HttpEntity<Map<String, Object>> requestEntity = new HttpEntity<>(body, headers);

        try {
            ResponseEntity<String> orsResponse = restTemplate.postForEntity(orsUrl, requestEntity, String.class);
            String responseBody = orsResponse.getBody();

            ObjectMapper mapper = new ObjectMapper();
            JsonNode root = mapper.readTree(responseBody);
            JsonNode summary = root.path("features").get(0).path("properties").path("summary");

            double distance = summary.path("distance").asDouble();
            double duration = summary.path("duration").asDouble();
            double pricePerKm = 1.0;
            double price = (distance / 1000.0) * pricePerKm;

            RouteResponseDto routeResponse = new RouteResponseDto();
            routeResponse.setGeoJson(responseBody);
            routeResponse.setDistance(distance);
            routeResponse.setDuration(duration);
            routeResponse.setPrice(price);

            return ResponseEntity.ok(routeResponse);

        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(null);
        }
    }

}
