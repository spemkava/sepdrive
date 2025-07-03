package com.example.sepdrivebackend.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.RestTemplate;

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

}
