package com.example.sepdrivebackend.security;

import com.example.sepdrivebackend.model.User;
import io.jsonwebtoken.*; // Importiere alles von jjwt (Claims etc.)
import io.jsonwebtoken.security.Keys;
import io.jsonwebtoken.security.SignatureException; // Spezifischer Import für Exception Handling
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
//import java.util.List;

@Component
public class JwtTokenProvider {

    private static final Logger logger = LoggerFactory.getLogger(JwtTokenProvider.class);

    @Value("${app.security.jwt.secret}")
    private String jwtSecret;

    @Value("${app.security.jwt.expiration-ms:3600000}") // Default 1 hour
    private long jwtExpirationMs;


    private SecretKey getSigningKey() {
        return Keys.hmacShaKeyFor(jwtSecret.getBytes(StandardCharsets.UTF_8));
    }


    public String generateToken(User user) {
        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + jwtExpirationMs);
        SecretKey key = getSigningKey();

        System.out.println(">>> Generating token for subject: " + user.getUsername());

        return Jwts.builder()
                .setSubject(user.getUsername())             //Nutzer identifizieren
                .setIssuedAt(now)                           //Tokenzeitpunkz
                .claim("roles", user.getRole())
                .setExpiration(expiryDate)                  //Ablauf des Tokens
                .signWith(key, SignatureAlgorithm.HS512)    //Signatur mit Secret Key
                .compact();                                 //Token als String ausgeben
    }

    // Methode zum Validieren eines Tokens
    public boolean validateToken(String authToken) {
        try {
            Jwts.parserBuilder()
                    .setSigningKey(getSigningKey())
                    .build()
                    .parseClaimsJws(authToken);     //prüft Signatur und Gültigkeit
            return true;
        } catch (SignatureException ex) { //gezielte Exceptions
            logger.error("Invalid JWT signature: {}", ex.getMessage());
        } catch (MalformedJwtException ex) {
            logger.error("Invalid JWT token: {}", ex.getMessage());
        } catch (ExpiredJwtException ex) {
            logger.error("Expired JWT token: {}", ex.getMessage());
        } catch (UnsupportedJwtException ex) {
            logger.error("Unsupported JWT token: {}", ex.getMessage());
        } catch (IllegalArgumentException ex) {
            logger.error("JWT claims string is empty: {}", ex.getMessage());
        }
        return false;
    }

    // Methode zum Extrahieren des Usernamens aus dem Token (mit mehr Debugging)
    public String getUsernameFromJWT(String token) {

        //Username aus Token extrahieren: Backend weiß wer eingeloggt ist ohne in der DB schauen zu müssen
        Claims claims = Jwts.parserBuilder()
                .setSigningKey(getSigningKey())
                .build()
                .parseClaimsJws(token)
                .getBody(); // Holt den "Inhalt" (Claims) des Tokens


        System.out.println(">>> Extracted Full Claims Map: " + claims); // Die komplette Map ausgeben
        System.out.println(">>> Extracted Claims Keys: " + claims.keySet()); // Alle Schlüssel der Map ausgeben
        String subject = claims.getSubject(); // Standardmethode zum Holen des Subjects
        System.out.println(">>> Subject from claims.getSubject(): " + subject);
        // Versuch, es direkt als "sub" aus der Map zu holen:
        Object subjectFromMap = claims.get(Claims.SUBJECT); // Claims.SUBJECT ist die Konstante für den Schlüssel "sub"
        System.out.println(">>> Subject from claims.get(Claims.SUBJECT): " + subjectFromMap);

        return subject;
    }
}