package com.example.sepdrivebackend.service;

import com.example.sepdrivebackend.dto.CreateRideRequestDto;
import com.example.sepdrivebackend.dto.OfferDto;
import com.example.sepdrivebackend.dto.RideRequestDto;
import com.example.sepdrivebackend.model.*;
import com.example.sepdrivebackend.repository.RideRepository;
import com.example.sepdrivebackend.repository.RideRequestRepository;
import com.example.sepdrivebackend.repository.UserRepository;

import ch.qos.logback.core.joran.conditional.ElseAction;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;

import org.springframework.dao.PermissionDeniedDataAccessException;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.time.LocalDateTime;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service // Markiert diese Klasse als Spring Service Bean
@RequiredArgsConstructor // Lombok generiert automatisch einen Konstruktor für finale Felder
public class RideRequestService {

    private final RideRequestRepository rideRequestRepository;
    private final UserRepository userRepository; // Wird benötigt, um den Kunden zu finden
    private final RideRepository rideRepository;

    /**
     * Ruft die aktuell aktive Fahranfrage für einen Kunden ab.
     * @param customerUsername Der Username des Kunden.
     * @return Ein Optional, das das RideRequestDto enthält, wenn eine aktive Anfrage existiert, sonst leer.
     */
    @Transactional(readOnly = true) // Keine Datenänderung, nur Lesen
    public Optional<RideRequestDto> getActiveRideRequest(String customerUsername) {
        // Finde den User (Kunde) anhand des Usernamens
        User customer = userRepository.findByUsername(customerUsername)
                .orElseThrow(() -> new UsernameNotFoundException("User not found with username: " + customerUsername));

        // Finde die aktive Anfrage für diesen Kunden
        return rideRequestRepository.findByCustomerAndStatus(customer, RideStatus.ACTIVE)
                .map(RideRequestDto::fromEntity); // Konvertiere das gefundene Entity (falls vorhanden) in ein DTO
    }

    /**
     * Erstellt eine neue Fahranfrage für einen Kunden.
     * @param requestDto Die Daten der neuen Anfrage.
     * @param customerUsername Der Username des anfragenden Kunden.
     * @return Das DTO der neu erstellten Fahranfrage.
     * @throws IllegalStateException wenn der Kunde bereits eine aktive Anfrage hat.
     */
    @Transactional // Daten werden geändert (neue Anfrage erstellt)
    public RideRequestDto createRideRequest(CreateRideRequestDto requestDto, String customerUsername) {
        User customer = userRepository.findByUsername(customerUsername)
                .orElseThrow(() -> new UsernameNotFoundException("User not found with username: " + customerUsername));

        // Regel prüfen: Hat der Kunde bereits eine aktive Anfrage?
        Optional<RideRequest> existingActiveRequest = rideRequestRepository.findByCustomerAndStatus(customer, RideStatus.ACTIVE);
        if (existingActiveRequest.isPresent()) {
            // Wenn ja, Fehler werfen
            throw new IllegalStateException("Customer " + customerUsername + " already has an active ride request.");
        }

        // Neue RideRequest-Entität erstellen
        RideRequest newRequest = new RideRequest();
        newRequest.setCustomer(customer);
        newRequest.setStartLatitude(requestDto.getStartLatitude());
        newRequest.setStartLongitude(requestDto.getStartLongitude());
        newRequest.setStartAddress(requestDto.getStartAddress()); // Kann null sein
        newRequest.setDestinationLatitude(requestDto.getDestinationLatitude());
        newRequest.setDestinationLongitude(requestDto.getDestinationLongitude());
        newRequest.setDestinationAddress(requestDto.getDestinationAddress()); // Kann null sein
        newRequest.setRequestedCarClass(requestDto.getRequestedCarClass());
        newRequest.setTotalDistance(requestDto.getTotalDistance());
        newRequest.setTotalTime(requestDto.getTotalTime());
        newRequest.setPrice(requestDto.getPrice());

        if (requestDto.getStops() != null) {
            List<StopLocation> stopEntities = requestDto.getStops().stream()
                    .map(s -> new StopLocation(s.getLatitude(), s.getLongitude(), s.getAddress()))
                    .collect(Collectors.toList());
            newRequest.setStops(stopEntities);
        }

        newRequest.setStatus(RideStatus.ACTIVE); // Status auf AKTIV setzen
        // createdAt und updatedAt werden automatisch durch @CreationTimestamp/@UpdateTimestamp gesetzt

        // Die neue Anfrage speichern
        RideRequest savedRequest = rideRequestRepository.save(newRequest);

        // Das gespeicherte Entity als DTO zurückgeben
        return RideRequestDto.fromEntity(savedRequest);
    }

    /**
     * Storniert die aktuell aktive Fahranfrage eines Kunden.
     * @param customerUsername Der Username des Kunden.
     * @throws EntityNotFoundException wenn der Kunde keine aktive Anfrage hat.
     */
    @Transactional // Daten werden geändert (Status wird aktualisiert)
    public void cancelActiveRideRequest(String customerUsername) {
        User customer = userRepository.findByUsername(customerUsername)
                .orElseThrow(() -> new UsernameNotFoundException("User not found with username: " + customerUsername));

        // Finde die aktive Anfrage
        RideRequest activeRequest = rideRequestRepository.findByCustomerAndStatus(customer, RideStatus.ACTIVE)
                // Wenn keine aktive Anfrage gefunden wird, Fehler werfen
                .orElseThrow(() -> new EntityNotFoundException("No active ride request found for customer: " + customerUsername));

        // Status auf CANCELLED setzen
        activeRequest.setStatus(RideStatus.CANCELLED);
        // updatedAt wird automatisch durch @UpdateTimestamp aktualisiert

        // Die Änderung speichern (technisch nicht immer nötig bei gemanagten Entities, aber sicher ist sicher)
        rideRequestRepository.save(activeRequest);
    }

    @Transactional(readOnly = true)
    public List<RideRequestDto> getRequestsByStatuses(List<RideStatus> statuses) {
        return rideRequestRepository.findByStatusIn(statuses).stream()
                .map(RideRequestDto::fromEntity)
                .toList();
    }

    @Transactional
    public RideRequestDto addOfferToRequest(long rideRequestId, OfferDto offerDto, String username) {

        User driver = userRepository
                .findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + username)); //nötig, wegen Methode im Repo

        if (driver.isHasSentOffer()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You have already sent an offer");
        }

        RideRequest rideRequest = rideRequestRepository.findById(rideRequestId)
                .orElseThrow(() -> new EntityNotFoundException("No ride request found with id: " + rideRequestId));

        if(rideRequest.getOffers() == null) {
            rideRequest.setOffers(new ArrayList<>());
        }

        Offer newOffer = new Offer();
        newOffer.setDriverId(driver.getId());
        newOffer.setDriverName(offerDto.getDriverName());
        newOffer.setDriverRating(offerDto.getDriverRating());
        newOffer.setDriverTotalRides(offerDto.getDriverTotalRides());
        newOffer.setRideRequest(rideRequest);

        rideRequest.getOffers().add(newOffer);
        driver.setHasSentOffer(true);
        userRepository.save(driver);

        rideRequestRepository.save(rideRequest);
        return RideRequestDto.fromEntity(rideRequest);

    }

    @Transactional
    public RideRequestDto acceptOffer(long rideRequestId, long offerId) {
        RideRequest rideRequest = rideRequestRepository.findById(rideRequestId)
                .orElseThrow(() -> new EntityNotFoundException("No ride request found with id: " + rideRequestId));
        
        if (rideRequest.getOffers().stream().filter(o -> o.getId().equals(offerId)).findFirst().isPresent()){
            rideRequest.setStatus(RideStatus.ACCEPTED);
            rideRequest.getOffers().forEach(o -> {
                if (o.getId() != offerId) {
                    long driverId = rideRequest.getOffers().stream().filter(n -> n.getId().equals(o.getId())).findFirst().get().getDriverId();
                    User driver = userRepository
                        .findById(driverId)
                        .orElseThrow(() -> new UsernameNotFoundException("User not found: " + driverId));
                    
                    driver.setHasSentOffer(false);
                    userRepository.save(driver);
                }
            });
            rideRequest.getOffers().removeIf(n -> (n.getId() != offerId));
        }
        else {
            throw new EntityNotFoundException("No offer found with id:" + offerId);
        }

        rideRequestRepository.save(rideRequest);
        return RideRequestDto.fromEntity(rideRequest);
    }

    @Transactional
    public RideRequestDto rejectOffer(long rideRequestId, long offerId) {
        RideRequest rideRequest = rideRequestRepository.findById(rideRequestId)
                .orElseThrow(() -> new EntityNotFoundException("No ride request found with id: " + rideRequestId));

        long driverId = rideRequest.getOffers().stream().filter(o -> o.getId().equals(offerId)).findFirst().get().getDriverId();

        User driver = userRepository
                .findById(driverId)
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + driverId)); //nötig, wegen Methode im Repo
        
        if (rideRequest.getOffers().stream().filter(o -> o.getId().equals(offerId)).findFirst().isPresent()){
                rideRequest.getOffers().removeIf(n -> (n.getId() == offerId));
                driver.setHasSentOffer(false);
        }
        else {
            throw new EntityNotFoundException("No offer found with id:" + offerId);
        }

        rideRequestRepository.save(rideRequest);
        return RideRequestDto.fromEntity(rideRequest);
    }

    @Transactional
    public Optional<RideRequestDto> getAcceptedRequest(String username) {
        // Finde den User (Kunde) anhand des Usernamens
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException("User not found with username: " + username));

        // Finde die aktive Anfrage für diesen Fahrer
        if (user.getRole().equals("CUSTOMER")) {
            return rideRequestRepository.findByCustomerAndStatus(user, RideStatus.ACCEPTED)
                .map(RideRequestDto::fromEntity); // Konvertiere das gefundene Entity (falls vorhanden) in ein DTO
        }
        else if (user.getRole().equals("DRIVER")){
            return rideRequestRepository.findFirstByDriverNameAndStatus(username)
                .map(RideRequestDto::fromEntity); // Konvertiere das gefundene Entity (falls vorhanden) in ein DTO
        }
        
        return Optional.empty();
    }

    @Transactional
    public RideRequestDto addRating(long rideRequestId, double rating, String username) {
        User user = userRepository.findByUsername(username)
            .orElseThrow(() -> new UsernameNotFoundException("User not found with username: " + username));
        
        RideRequest rideRequest = rideRequestRepository.findById(rideRequestId)
                .orElseThrow(() -> new EntityNotFoundException("No ride request found with id: " + rideRequestId));

        //Ride ride = rideRepository.findByRideRequest(rideRequest)
        //        .orElseThrow(() -> new EntityNotFoundException("No ride found for rideRequest: " + rideRequest));


        if (user.getRole().equals("CUSTOMER")) {
            rideRequest.setCustomerRating(rating);
            //ride.setCustomerRating(rating);
        }
        if (user.getRole().equals("DRIVER")) {
            rideRequest.setDriverRating(rating);
            //ride.setDriverRating(rating);
        }

        rideRequestRepository.save(rideRequest);
        //rideRepository.save(ride);
        return RideRequestDto.fromEntity(rideRequest);
    }

    @Transactional
    public RideRequestDto completeRequest(long rideRequestId, String username) {

        
        RideRequest rideRequest = rideRequestRepository.findById(rideRequestId)
                .orElseThrow(() -> new EntityNotFoundException("No ride request found with id: " + rideRequestId));

        if (!rideRequest.getStatus().equals(RideStatus.COMPLETED)) {
            long driverId = rideRequest.getOffers().get(0).getDriverId();

            User driver = userRepository
                    .findById(driverId)
                    .orElseThrow(() -> new UsernameNotFoundException("User not found: " + driverId));

            User customer = rideRequest.getCustomer();

            if (username.equals(driver.getUsername()) || username.equals(customer.getUsername())) {
                driver.setHasSentOffer(false);
                driver.setTotalRides(driver.getTotalRides() +1);
                customer.setTotalRides(customer.getTotalRides() +1);
                rideRequest.setStatus(RideStatus.COMPLETED);
                rideRequest.setCompletedAt(Instant.now());

                //Profile Rating
                if (!rideRequest.getCustomerRating().isNaN()) {
                    driver.setRating((driver.getRating()*(driver.getTotalRides()-1) + rideRequest.getCustomerRating())/driver.getTotalRides());
                }

                if (!rideRequest.getDriverRating().isNaN()) {
                    customer.setRating((customer.getRating()*(customer.getTotalRides()-1) + rideRequest.getDriverRating())/customer.getTotalRides());
                }

                Ride ride = getRide(rideRequest, driver, customer);

                rideRepository.save(ride);
                userRepository.save(driver);
                userRepository.save(customer);
                rideRequestRepository.save(rideRequest);
                return RideRequestDto.fromEntity(rideRequest);
            }
            else {
                throw new PermissionDeniedDataAccessException(username + " not matching ride customer/driver", null);
            }
        }
        else {
            return RideRequestDto.fromEntity(rideRequest); //Nothing happens
        }
    }

    private static Ride getRide(RideRequest rideRequest, User driver, User customer) {
        Ride ride = new Ride();
        ride.setCarClass(rideRequest.getRequestedCarClass());
        ride.setDriver(driver);
        ride.setDriverRating(driver.getRating());
        ride.setCustomerRating(customer.getRating());
        ride.setTotalDistance(rideRequest.getTotalDistance());
        ride.setPrice(rideRequest.getPrice());
        ride.setTotalDuration(rideRequest.getTotalTime());
        ride.setDestinationAddress(rideRequest.getDestinationAddress());
        ride.setDestinationLatitude(rideRequest.getDestinationLatitude());
        ride.setDestinationLongitude(rideRequest.getDestinationLongitude());
        ride.setEndTime(LocalDateTime.now());
        ride.setStartAddress(rideRequest.getStartAddress());
        ride.setStartLatitude(rideRequest.getStartLatitude());
        ride.setStartLongitude(rideRequest.getStartLongitude());
        ride.setUpdatedAt(rideRequest.getUpdatedAt());
        ride.setRideRequest(rideRequest);
        ride.setStatus(RideStatus.COMPLETED);
        return ride;
    }

    /**
     * Storniert das eigene Angebot eines Fahrers für eine bestimmte Fahranfrage
     * @param rideRequestId ID der Fahranfrage
     * @param username Benutzername des Fahrers
     * @return Aktualisierte Fahranfrage ohne das stornierte Angebot
     */
    @Transactional
    public RideRequestDto cancelOwnOffer(long rideRequestId, String username) {
        User driver = userRepository.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + username));

        RideRequest rideRequest = rideRequestRepository.findById(rideRequestId)
                .orElseThrow(() -> new EntityNotFoundException("No ride request found with id: " + rideRequestId));

        if (rideRequest.getOffers() == null) {
            throw new EntityNotFoundException("No offers found for this ride request");
        }

        // Finde das Angebot des Fahrers
        Optional<Offer> driverOffer = rideRequest.getOffers().stream()
                .filter(offer -> offer.getDriverId().equals(driver.getId()))
                .findFirst();

        if (driverOffer.isEmpty()) {
            throw new EntityNotFoundException("No offer found from this driver for the ride request");
        }

        // Prüfe ob die Fahranfrage noch aktiv ist (nicht bereits angenommen)
        if (rideRequest.getStatus() != RideStatus.ACTIVE) {
            throw new IllegalStateException("Cannot cancel offer - ride request is no longer active");
        }

        // Entferne das Angebot
        rideRequest.getOffers().remove(driverOffer.get());

        // Setze das hasSentOffer Flag zurück
        driver.setHasSentOffer(false);
        userRepository.save(driver);

        // Speichere die aktualisierte Fahranfrage
        rideRequestRepository.save(rideRequest);

        return RideRequestDto.fromEntity(rideRequest);
    }

    /**
     * Ruft alle aktiven Fahranfragen ab, für die der Fahrer ein Angebot gesendet hat
     * @param username Benutzername des Fahrers
     * @return Liste der Fahranfragen mit eigenen Angeboten
     */
    @Transactional(readOnly = true)
    public List<RideRequestDto> getMyActiveOffers(String username) {
        User driver = userRepository.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + username));

        List<RideRequest> allActiveRequests = rideRequestRepository.findByStatusIn(List.of(RideStatus.ACTIVE));
        
        // Filtere nur die Anfragen, für die der Fahrer ein Angebot hat
        List<RideRequest> requestsWithMyOffers = allActiveRequests.stream()
                .filter(request -> request.getOffers() != null && 
                        request.getOffers().stream()
                                .anyMatch(offer -> offer.getDriverId().equals(driver.getId())))
                .collect(Collectors.toList());

        return requestsWithMyOffers.stream()
                .map(RideRequestDto::fromEntity)
                .collect(Collectors.toList());
    }
}