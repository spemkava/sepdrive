package com.example.sepdrivebackend.controller;

import com.example.sepdrivebackend.dto.DepositRequestDto;
import com.example.sepdrivebackend.dto.UserProfileDto;
import com.example.sepdrivebackend.model.User;
import com.example.sepdrivebackend.repository.UserRepository;
import com.example.sepdrivebackend.service.UserService;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize; 
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.security.core.userdetails.UsernameNotFoundException; 

import java.io.IOException;
import java.util.Collections;
import java.util.List; 
import java.util.Map; 



@RestController
@RequestMapping("api/users")
public class UserController {

    private final UserService userService;
    private final UserRepository userRepository; // Sicherstellen, dass dies final ist und im Konstruktor initialisiert wird

    // Konstruktor korrigiert, um userRepository korrekt zu initialisieren
    public UserController(UserService userService, UserRepository userRepository) {
        this.userService = userService;
        this.userRepository = userRepository; // Diese Zuweisung war vorher fehlerhaft
    }

    @GetMapping("/search")
    public List<UserProfileDto> searchUser(@RequestParam("q") String query) {
        return userService.searchUsers(query);
    }

    @GetMapping("/me")
    public ResponseEntity<UserProfileDto> getMyProfile(Authentication authentication) {
        String username = authentication.getName();
        UserProfileDto profile = userService.getUserProfileByUsername(username);
        return ResponseEntity.ok(profile);
    }

    @GetMapping("/{username}")
    public ResponseEntity<UserProfileDto> getUserProfile(@PathVariable String username) {
        UserProfileDto profile = userService.getUserProfileByUsername(username);
        return ResponseEntity.ok(profile);
    }

    @PostMapping("/{id}/upload-profileImage")
    public ResponseEntity<String> uploadProfileImage(@PathVariable long id, @RequestParam("profileImage") MultipartFile file) {
        // Implementierung von uploadProfileImage... (wie vorher)
        // Zur Kürze hier nicht vollständig wiederholt, übernehme deine funktionierende Version.
        // Wichtig: Fehlerbehandlung für IOException und IllegalArgumentException beibehalten.
        String contentType = file.getContentType();
        if (!supportedImages(contentType)) {
            return ResponseEntity.badRequest().body("Es werden nur Bilder mit dem Dateiformat .jpeg, .png oder .gif akzeptiert");
        }
        try {
            userService.saveProfileImage(id, file);
            System.out.println("Dateiname: " + file.getOriginalFilename());
            return ResponseEntity.ok("Profilbild wurde erfolgreich hochgeladen");
        } catch (IOException e) {
            System.err.println("Fehler beim Speichern des Profilbildes für User ID " + id + ": " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Fehler beim Speichern des Profilbildes.");
        }  catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(e.getMessage());
        }
    }

    private boolean supportedImages(String type) {
        return type != null && (
                type.equalsIgnoreCase("image/jpeg") ||
                        type.equalsIgnoreCase("image/png") ||
                        type.equalsIgnoreCase("image/gif")
        );
    }

    @GetMapping("/{id}/profileImage")
    public ResponseEntity<byte[]> getProfileImage(@PathVariable Long id) {
      
        User user = userRepository.findById(id).orElseThrow(() -> new RuntimeException("Der Benutzer konnte nicht gefunden werden"));
        byte[] image = user.getProfilePicture();
        String contentType = user.getProfileImageContentType();
        if (image == null || contentType == null) {
            return ResponseEntity.notFound().build();
        }
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.parseMediaType(contentType));
        return new ResponseEntity<>(image, headers, HttpStatus.OK);
    }

    @DeleteMapping("/{id}/profileImage") 
    public ResponseEntity<String> deleteProfileImage(@PathVariable Long id) {
        try {
            userService.deleteProfileImage(id);
            return ResponseEntity.ok("Profilbild zurückgesetzt");
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(e.getMessage());
        }
    }
    @PostMapping("/{id}/reset-profile-to-default") // Neuer Pfad und POST-Methode
    public ResponseEntity<String> resetProfileImageToDefault(@PathVariable Long id, Authentication authentication) {
        // Optional: Sicherheitscheck, ob der authentifizierte Benutzer die Aktion für sich selbst ausführt
        User authenticatedUser = userRepository.findByUsername(authentication.getName())
                 .orElseThrow(() -> new UsernameNotFoundException("Authentifizierter Benutzer nicht gefunden: " + authentication.getName()));
        if (!authenticatedUser.getId().equals(id)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Aktion nicht erlaubt.");
        }

        try {
            userService.resetProfilePictureToDefault(id); // Ruft die neue Service-Methode auf
            return ResponseEntity.ok("Profilbild auf Standard zurückgesetzt.");
        } catch (UsernameNotFoundException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(e.getMessage());
        } catch (Exception e) {
            System.err.println("Fehler beim Zurücksetzen des Profilbilds auf Standard für User ID " + id + ": " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Fehler beim Zurücksetzen des Profilbilds.");
        }
    }





    @PostMapping("/{userId}/account/deposit")
    public ResponseEntity<?> depositFunds(
            @PathVariable Long userId,
            @Valid @RequestBody DepositRequestDto depositRequest,
            Authentication authentication) {

        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("User not authenticated.");
        }

        User authenticatedUser = userRepository.findByUsername(authentication.getName())
                 .orElseThrow(() -> new UsernameNotFoundException("Authentifizierter Benutzer nicht gefunden: " + authentication.getName()));

        // AKTIVIERTE LOGS für ID-Prüfung
        System.out.println(">>> Account Deposit Check: Authenticated User ID: " + authenticatedUser.getId() + ", PathVariable userId: " + userId + ", Amount: " + depositRequest.getAmount());
        if (!authenticatedUser.getId().equals(userId)) {
            System.out.println(">>> Account Deposit Check: FORBIDDEN - ID mismatch.");
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("You can only deposit funds into your own account.");
        }
        System.out.println(">>> Account Deposit Check: ALLOWED - IDs match.");

        try {
            UserProfileDto updatedProfile = userService.addFunds(userId, depositRequest.getAmount());
            return ResponseEntity.ok(updatedProfile);
        } catch (UsernameNotFoundException e) { // Wird vom Service geworfen, wenn User für addFunds nicht gefunden
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(e.getMessage());
        } catch (IllegalArgumentException e) { // Wird vom Service für ungültigen Betrag geworfen
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (Exception e) {
            System.err.println("Fehler bei der Einzahlung für User ID " + userId + ": " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Error processing deposit.");
        }
    }

    @GetMapping("/{userId}/account/balance")
    public ResponseEntity<?> getAccountBalance(@PathVariable Long userId, Authentication authentication) {

        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("User not authenticated.");
        }

        User authenticatedUser = userRepository.findByUsername(authentication.getName())
                .orElseThrow(() -> new UsernameNotFoundException("Authentifizierter Benutzer nicht gefunden: " + authentication.getName()));

        // AKTIVIERTE LOGS für ID-Prüfung
        System.out.println(">>> Account Balance Check: Authenticated User ID: " + authenticatedUser.getId() + ", PathVariable userId: " + userId);
        if (!authenticatedUser.getId().equals(userId)) {
            System.out.println(">>> Account Balance Check: FORBIDDEN - ID mismatch.");
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("You can only view your own account balance.");
        }
        System.out.println(">>> Account Balance Check: ALLOWED - IDs match.");

        try {
            double balance = userService.getAccountBalance(userId);
            return ResponseEntity.ok(Map.of("userId", userId, "balance", balance));
        } catch (UsernameNotFoundException e) { // Wird vom Service geworfen
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(e.getMessage());
        } catch (Exception e) {
            System.err.println("Fehler beim Abrufen des Kontostands für User ID " + userId + ": " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Error retrieving account balance.");
        }
    }

    
    }
