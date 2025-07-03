package com.example.sepdrivebackend.controller; // Passe Paketnamen ggf. an

import com.example.sepdrivebackend.dto.*; // Importiert alle DTOs
import com.example.sepdrivebackend.model.User; // Wird für JWT Generierung gebraucht
import com.example.sepdrivebackend.security.JwtTokenProvider;
import com.example.sepdrivebackend.service.UserService;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile; // Import für Datei-Uploads

@RestController
@RequestMapping("/api/auth") // Basis-Pfad
public class AuthController { // Hier war ein kleiner Tippfehler "class AuthController"

    private final UserService userService;
    private final JwtTokenProvider jwtTokenProvider;
    private final ObjectMapper objectMapper;

    // Konstruktor für Dependency Injection
    public AuthController(UserService userService, JwtTokenProvider jwtTokenProvider, ObjectMapper objectMapper) {
        this.userService = userService;
        this.jwtTokenProvider = jwtTokenProvider;
        this.objectMapper = objectMapper;
    }

    /**
     * Endpunkt für die Benutzerregistrierung.
     * Akzeptiert jetzt multipart/form-data, um optional ein Profilbild zu ermöglichen.
     */
    @PostMapping(value = "/register", consumes = {"multipart/form-data"})
    public ResponseEntity<?> registerUser(
            @RequestPart("userData") String userDataJson, // als String empfangen
            @RequestPart(value = "profilePicture", required = false) MultipartFile profilePicture
            // Hinweis: Der profilePicture Parameter wird hier entgegengenommen,
            // aber in der aktuellen Logik dieses Controllers nicht explizit an den UserService
            // oder einen FileStorageService weitergegeben. Wenn Profilbilder gespeichert
            // werden sollen, muss diese Logik im userService.registerUser oder hier
            // ergänzt werden, um das MultipartFile zu verarbeiten.
    ) {
        try {
            // JSON-String zu DTO parsen
            UserRegistrationDto registrationDto = objectMapper.readValue(userDataJson, UserRegistrationDto.class);
            System.out.println(">>> DEBUG birthDate in AuthController: " + registrationDto.getBirthDate());

            // Benutzer registrieren
            // Wenn Profilbilder verarbeitet werden sollen, müsste das MultipartFile hier
            // oder im Service berücksichtigt werden.
            userService.registerUser(registrationDto); // Aktuell wird nur das DTO übergeben

            return ResponseEntity.status(HttpStatus.CREATED).build();
        } catch (IllegalArgumentException e) {
            // Dieser Fehler wird vom UserService geworfen, wenn Username/Email existiert
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (Exception e) {
            // Für andere Fehler (z.B. Probleme beim Parsen des JSON, Datenbankfehler etc.)
            e.printStackTrace(); // Wichtig für Debugging im Backend-Log!
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Registration failed due to an internal error.");
        }
    }

    /**
     * Endpunkt für Login Phase 1 (Passwort prüfen, 2FA auslösen).
     */
    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequestDto loginRequest) {
        try {
            userService.initiateLoginAndSend2FACode(loginRequest.getUsername(), loginRequest.getPassword());
            return ResponseEntity.ok(new LoginResponseDto(true)); // Sagt Frontend, dass 2FA nötig ist
        } catch (SecurityException e) { // Fängt "Invalid username or password" etc. vom UserService
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(e.getMessage());
        } catch (RuntimeException e) { // Fängt andere Fehler (z.B. Mail Senden, falls aktiv)
            e.printStackTrace(); // Für Debugging
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Login initiation failed: " + e.getMessage());
        }
    }

    /**
     * Endpunkt für Login Phase 2 (2FA Code prüfen, JWT generieren).
     */
    @PostMapping("/verify-2fa")
    public ResponseEntity<?> verify2fa(@Valid @RequestBody VerifyTwoFactorRequest verifyRequest) {
        try {
            // Service prüft Code (inkl. Super-Code), gibt bei Erfolg User zurück
            User user = userService.verify2FACode(verifyRequest.getUsername(), verifyRequest.getCode());
            // Generiere JWT für den eingeloggten User
            String jwt = jwtTokenProvider.generateToken(user);
            // Erstelle Antwort mit dem Token
            VerifyTwoFactorResponse response = new VerifyTwoFactorResponse(jwt);
            // Sende 200 OK mit Token
            return ResponseEntity.ok(response);
        } catch (SecurityException e) { // Fängt "Invalid or expired 2FA code." etc.
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(e.getMessage());
        } catch (Exception e) { // Andere unerwartete Fehler
            System.err.println("Unexpected error during 2FA verification: " + e.getMessage());
            e.printStackTrace(); // Für Debugging
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("2FA verification failed due to an internal error.");
        }
    }
}