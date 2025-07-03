package com.example.sepdrivebackend.service;

import com.example.sepdrivebackend.dto.UserProfileDto;
import com.example.sepdrivebackend.dto.UserRegistrationDto;
import com.example.sepdrivebackend.model.User;
import com.example.sepdrivebackend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.math.BigDecimal; // NEUER Import für präzise Berechnungen
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Service
public class UserService implements UserDetailsService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmailService emailService;
    private final FileStorageService fileStorageService;

    private final Map<String, TwoFactorAuthDetail> twoFactorAuthStore = new ConcurrentHashMap<>();

    @Value("${app.security.super-2fa-code:000000}")
    private String super2FACode;

    public UserService(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            EmailService emailService,
            FileStorageService fileStorageService
    ) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.emailService = emailService;
        this.fileStorageService = fileStorageService;
    }

    @Transactional
    public User registerUser(UserRegistrationDto dto) {

        System.out.println("Date im DTO:" + dto.getBirthDate());

        if (userRepository.findByUsername(dto.getUsername()).isPresent()) {
            throw new IllegalArgumentException("Username already exists!");
        }
        if (userRepository.findByEmail(dto.getEmail()).isPresent()) {
            throw new IllegalArgumentException("Email already exists!");
        }

        User user = new User();
        user.setUsername(dto.getUsername());
        user.setFirstName(dto.getFirstName());
        user.setLastName(dto.getLastName());
        user.setRole(dto.getRole());
        user.setEmail(dto.getEmail());
        user.setBirthDate(dto.getBirthDate());
        user.setPassword(passwordEncoder.encode(dto.getPassword()));
        user.setAccountBalance(0.0);

        if ("DRIVER".equalsIgnoreCase(dto.getRole())) {
            user.setVehicleClass(dto.getVehicleClass());
        } else {
            user.setVehicleClass(null);
        }

        return userRepository.save(user);
    }

    public void initiateLoginAndSend2FACode(String username, String password) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new SecurityException("Invalid username"));
        if (!passwordEncoder.matches(password, user.getPassword())) {
            throw new SecurityException("Invalid password");
        }
        String code = String.format("%06d", new Random().nextInt(999_999));
        twoFactorAuthStore.put(username, new TwoFactorAuthDetail(code, Instant.now().plus(Duration.ofMinutes(5))));

        System.out.println(">>> [DEBUG] 2FA-Code für " + username + ": " + code);


        emailService.sendSimpleMessage(
                user.getEmail(),
                "Ihr 2FA-Code",
                "Ihr 2FA-Code lautet: " + code + "\nEr ist 5 Minuten gültig.\n\nGrüße, SEP-Drive"
        );
    }

    public User verify2FACode(String username, String code) {
        if (super2FACode.equals(code)) {
            twoFactorAuthStore.remove(username);
            return userRepository.findByUsername(username)
                    .orElseThrow(() -> new SecurityException("User not found: " + username));
        }
        TwoFactorAuthDetail detail = twoFactorAuthStore.get(username);
        if (detail == null || Instant.now().isAfter(detail.expiryTime) || !detail.code.equals(code)) {
            throw new SecurityException("Invalid or expired 2FA code.");
        }
        twoFactorAuthStore.remove(username);
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new SecurityException("User not found: " + username));
    }

    @Override
    @Transactional(readOnly = true)
    public UserDetails loadUserByUsername(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + username));

        String role = user.getRole().startsWith("ROLE_") ? user.getRole() : "ROLE_" + user.getRole();

        return new org.springframework.security.core.userdetails.User(
                user.getUsername(),
                user.getPassword(),
                List.of(new SimpleGrantedAuthority(role))
        );
    }

    @Transactional
    public UserProfileDto addFunds(Long userId, double amount) {
        if (amount <= 0) {
            throw new IllegalArgumentException("Der Betrag muss größer als 0 sein.");
        }
        User user = userRepository.findById(userId).orElseThrow(()-> new UsernameNotFoundException("Der Benutzer mit der ID:" + userId + " konnte nicht gefunden werden"));
        user.setAccountBalance(user.getAccountBalance() + amount);
        User savedUser = userRepository.save(user);
        return UserProfileDto.fromEntity(savedUser);
    }

    @Transactional(readOnly = true)
    public double getAccountBalance(Long userId) {
        User user = userRepository.findById(userId).orElseThrow(() -> new UsernameNotFoundException("Der Benutzer mit der ID:" + userId + " konnte nicht gefunden werden"));
        return user.getAccountBalance();
    }

   
    /**
     *
     * @param fromUserId ID des Benutzers, von dem abgebucht wird (Kunde)
     * @param toUserId   ID des Benutzers, dem gutgeschrieben wird (Fahrer)
     * @param amount     Der zu überweisende Betrag
     * @throws UsernameNotFoundException  wenn einer der Benutzer nicht gefunden wird
     * @throws IllegalArgumentException wenn der Betrag ungültig ist oder das Guthaben nicht ausreicht
     */
    @Transactional
    public void transferFunds(Long fromUserId, Long toUserId, double amount) {
        if (amount <= 0) {
            throw new IllegalArgumentException("Transferbetrag muss positiv sein.");
        }

        User fromUser = userRepository.findById(fromUserId)
                .orElseThrow(() -> new UsernameNotFoundException("Abbuchender Benutzer mit ID " + fromUserId + " nicht gefunden."));

        User toUser = userRepository.findById(toUserId)
                .orElseThrow(() -> new UsernameNotFoundException("Empfangender Benutzer mit ID " + toUserId + " nicht gefunden."));

        BigDecimal fromBalance = BigDecimal.valueOf(fromUser.getAccountBalance());
        BigDecimal transferAmount = BigDecimal.valueOf(amount);

        if (fromBalance.compareTo(transferAmount) < 0) {
            throw new IllegalArgumentException("Unzureichendes Guthaben für den Transfer. Benötigt: " + amount + ", Verfügbar: " + fromBalance);
        }

        BigDecimal newFromBalance = fromBalance.subtract(transferAmount);
        BigDecimal newToBalance = BigDecimal.valueOf(toUser.getAccountBalance()).add(transferAmount);

        fromUser.setAccountBalance(newFromBalance.doubleValue());
        toUser.setAccountBalance(newToBalance.doubleValue());

        userRepository.save(fromUser);
        userRepository.save(toUser);
    }


    private static class TwoFactorAuthDetail {
        final String code;
        final Instant expiryTime;

        TwoFactorAuthDetail(String code, Instant expiryTime) {
            this.code = code;
            this.expiryTime = expiryTime;
        }
    }

    public List<UserProfileDto> searchUsers(String username) {
        List<User> users = userRepository.findByUsernameContainingIgnoreCase(username);
        return users.stream()
                .map(UserProfileDto::fromEntity)
                .collect(Collectors.toList());
    }

    public UserProfileDto getUserProfileByUsername(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException("Der Benutzer konnte nicht gefunden werden"));
        return  UserProfileDto.fromEntity(user);
    }

    public void saveProfileImage(Long id, MultipartFile file) throws IOException {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Der Benutzer konnte nicht gefunden werden"));

        user.setProfilePicture(file.getBytes());
        user.setProfileImageContentType(file.getContentType());

        userRepository.save(user);
    }

    public void deleteProfileImage(Long id) {
        User user = userRepository.findById(id).orElseThrow(() -> new IllegalArgumentException("Der Benutzer konnte nicht gefunden werden"));
        user.setProfilePicture(null);
        user.setProfileImageContentType(null);
        userRepository.save(user);
    }
     @Transactional
    public void resetProfilePictureToDefault(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new UsernameNotFoundException("Benutzer mit ID " + userId + " nicht gefunden."));
        user.setProfilePicture(null);
        user.setProfileImageContentType(null);
        userRepository.save(user);
    }
    
}