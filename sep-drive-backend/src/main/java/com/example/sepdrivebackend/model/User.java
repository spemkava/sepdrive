package com.example.sepdrivebackend.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.Getter;

import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDate;
import java.time.Instant;

@Entity
@Table(name = "users", uniqueConstraints = {
        @UniqueConstraint(columnNames = "username"),
        @UniqueConstraint(columnNames = "email")
})
@Getter
@Setter
@NoArgsConstructor
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank
    @Size(min = 3, max = 50)
    @Column(nullable = false, unique = true)
    private String username;

    @NotBlank
    @Column(nullable = false)
    private String firstName;

    @NotBlank
    @Column(nullable = false)
    private String lastName;

    @NotBlank
    @Email
    @Column(nullable = false, unique = true)
    private String email;

    @NotNull
    @Past
    @Column(nullable = false)
    private LocalDate birthDate;

    @NotBlank
    @Size(min = 8)
    @Column(nullable = false)
    private String password;

    @NotBlank
    @Column(nullable = false)
    private String role;


    @Column(name = "profile_picture") // Profilbild ist optional
    private byte[] profilePicture;


    @Column(name = "profile_image_content_type")
    private String profileImageContentType;





    @Column(nullable = true)
    private String vehicleClass;


    @Column(nullable = false, columnDefinition = "DOUBLE PRECISION DEFAULT 0.0")
    private double accountBalance = 0.0;

    
    @Column(nullable = true)
    private double rating = 0.0;

    private int totalRides = 0;

    @CreationTimestamp
    private Instant createdAt;

    @UpdateTimestamp
    private Instant updatedAt;

    @Column(nullable = false)
    private boolean hasSentOffer = false;


    public enum CarClass {
        SMALL, // Klein
        MEDIUM, // Medium
        DELUXE // Deluxe
    }


}