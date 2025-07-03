package com.example.sepdrivebackend.controller;

import com.example.sepdrivebackend.dto.CreateRideRequestDto;
import com.example.sepdrivebackend.dto.OfferDto;
import com.example.sepdrivebackend.dto.RideRequestDto;
import com.example.sepdrivebackend.model.RideRequest;
import com.example.sepdrivebackend.model.RideStatus;
import com.example.sepdrivebackend.service.RideRequestService;
import jakarta.persistence.EntityNotFoundException;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/ride-requests") // Basis-Pfad für alle Endpunkte
@RequiredArgsConstructor
public class RideRequestController {

    private final RideRequestService rideRequestService; // Injiziert den Service

    /**
     * Endpunkt zum Erstellen einer neuen Fahranfrage.
     * Nur für eingeloggte Kunden erlaubt.
     */
    @PostMapping
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<?> createRideRequest(@Valid @RequestBody CreateRideRequestDto requestDto, Authentication authentication) {
    // Überprüfen, ob der Benutzer authentifiziert ist
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("User not authenticated.");
        }

        String username = authentication.getName();
        try {

            RideRequestDto createdDto = rideRequestService.createRideRequest(requestDto, username);

            return ResponseEntity.status(HttpStatus.CREATED).body(createdDto);
        } catch (UsernameNotFoundException e) {

            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Authenticated user not found.");
        } catch (IllegalStateException e) {
            // Fängt Fehler wie "Customer already has an active ride request."
            return ResponseEntity.status(HttpStatus.CONFLICT).body(e.getMessage()); // 409 Conflict
        } catch (Exception e) {
            // Fange andere unerwartete Fehler ab
            System.err.println("Error creating ride request for user " + username + ": " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Error creating ride request.");
        }
    }

    /**
     * Endpunkt zum Abrufen der aktiven Fahranfrage des eingeloggten Kunden.
     * Nur für eingeloggte Kunden erlaubt.
     */
    @GetMapping("/active")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<RideRequestDto> getActiveRideRequest(Authentication authentication) {
        // Überprüfen, ob der Benutzer authentifiziert ist
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        String username = authentication.getName();
        // Rufe Service auf, gibt Optional<Dto> zurück
        Optional<RideRequestDto> optionalDto = rideRequestService.getActiveRideRequest(username);
        // Wenn Daten da sind -> 200 OK mit Daten, sonst -> 404 Not Found
        return optionalDto.map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    /**
     * Endpunkt zum Stornieren/Löschen der aktiven Fahranfrage des eingeloggten Kunden.
     * Nur für eingeloggte Kunden erlaubt.
     */
    @DeleteMapping("/active")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<Void> cancelActiveRideRequest(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        String username = authentication.getName();
        try {
            // Rufe Service zum Stornieren auf
            rideRequestService.cancelActiveRideRequest(username);
            // Bei Erfolg -> Status 204 No Content zurückgeben
            return ResponseEntity.noContent().build();
        } catch (EntityNotFoundException e) {
            // Wenn keine aktive Anfrage zum Löschen gefunden wurde -> 404 Not Found
            return ResponseEntity.notFound().build();
        } catch (UsernameNotFoundException e) {
            // Sollte nicht passieren
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        } catch (Exception e) {
            // Andere unerwartete Fehler
            System.err.println("Error cancelling ride request for user " + username + ": " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }




    @GetMapping("/pending")
    public List<RideRequestDto> getActiveRideRequests() {
        List<RideStatus> activeStatuses = List.of(RideStatus.ACTIVE);
        return rideRequestService.getRequestsByStatuses(activeStatuses);
    }

    @PostMapping("/{rideRequestId}/offers")
    public ResponseEntity<?> addOffer(@PathVariable long rideRequestId, @RequestBody OfferDto offerDto, Authentication authentication) {
        String username = authentication.getName();

        RideRequestDto updated = rideRequestService.addOfferToRequest(rideRequestId, offerDto, username);
        return ResponseEntity.ok(updated);
    }

    @GetMapping("/{rideRequestId}/{offerId}/accept")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<?> acceptOffer(@PathVariable long rideRequestId, @PathVariable long offerId, Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        RideRequestDto updated = rideRequestService.acceptOffer(rideRequestId, offerId);
        return ResponseEntity.ok(updated);
    }

    @GetMapping("/{rideRequestId}/{offerId}/reject")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<?> deleteOffer(@PathVariable long rideRequestId, @PathVariable long offerId, Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        RideRequestDto updated = rideRequestService.rejectOffer(rideRequestId, offerId);
        return ResponseEntity.ok(updated);
    }

    @GetMapping("/accepted")
    public ResponseEntity<RideRequestDto> getAcceptedRequest(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        String username = authentication.getName();
        // Rufe Service auf, gibt Optional<Dto> zurück
        Optional<RideRequestDto> optionalDto = rideRequestService.getAcceptedRequest(username);
        // Wenn Daten da sind -> 200 OK mit Daten, sonst -> 404 Not Found
        return optionalDto.map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @GetMapping("/{rideRequestId}/{rating}/rating")
    public RideRequestDto addRating(@PathVariable long rideRequestId, @PathVariable Double rating, Authentication authentication) {
        String username = authentication.getName();

        return rideRequestService.addRating(rideRequestId, rating, username);
    }

    @GetMapping("/{rideRequestId}/complete")
    public RideRequestDto completeRequest(@PathVariable long rideRequestId, Authentication authentication) {
        
        String username = authentication.getName();
        // Wenn Daten da sind -> 200 OK mit Daten, sonst -> 404 Not Found
        return rideRequestService.completeRequest(rideRequestId,username);
    }
}
