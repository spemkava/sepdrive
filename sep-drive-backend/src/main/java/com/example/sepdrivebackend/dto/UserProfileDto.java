package com.example.sepdrivebackend.dto; // Passe Paketnamen ggf. an

import com.example.sepdrivebackend.model.User; // Importiere User Klasse (für Role Enum)
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data; // Lombok für Getter/Setter etc.
import java.time.LocalDate;
import java.time.Instant;
import java.util.Base64;

@Data 
public class UserProfileDto {

    private Long id;
    private String username;
    private String firstName;
    private String lastName;
    private String email;
    private LocalDate birthDate;
    private Instant createdAt;
    private String profilePictureUrl; // Pfad/URL zum Bild (String)
    private String profileImageContentType; //Typ des Profilbildes (String)
    private Double rating;            // Bewertung (double)
    private Integer totalRides;       // Anzahl Fahrten (int)
    private String role;
    private String vehicleClass;
    private Double accountBalance; // NEUES FELD

    public UserProfileDto() {

    }

    public UserProfileDto(@NotBlank @Size(min = 3, max = 50) String username, @NotBlank @Email String email, @NotBlank String firstName, @NotBlank String lastName) {
        this.username = username;
        this.email = email;
        this.firstName = firstName;
        this.lastName = lastName;
    }

    
    public static UserProfileDto fromEntity(User user) {
        UserProfileDto dto = new UserProfileDto();
        dto.setId(user.getId());
        dto.setUsername(user.getUsername());
        dto.setFirstName(user.getFirstName());
        dto.setLastName(user.getLastName());
        dto.setEmail(user.getEmail());
        dto.setBirthDate(user.getBirthDate());
        dto.setCreatedAt(user.getCreatedAt()); // Stelle sicher, dass der Typ hier zu deiner Felddefinition passt (Instant oder String)

        if (user.getProfilePicture() != null && user.getProfileImageContentType() != null) {
            String base64 = Base64.getEncoder().encodeToString(user.getProfilePicture());
            String imageData = "data:" + user.getProfileImageContentType() + ";base64," + base64;
            dto.setProfilePictureUrl(imageData);
        }
        dto.setRating(user.getRating());
        dto.setTotalRides(user.getTotalRides());
        dto.setRole(user.getRole());
        dto.setAccountBalance(user.getAccountBalance()); 

        if (user.getVehicleClass() != null) {
            dto.setVehicleClass(user.getVehicleClass());
        }
        return dto;
    }
}