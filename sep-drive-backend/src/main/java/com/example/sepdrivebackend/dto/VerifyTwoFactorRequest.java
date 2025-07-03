package com.example.sepdrivebackend.dto;


import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class VerifyTwoFactorRequest {


    @NotBlank(message = "Username ist erfolderlich")
    private String username;

    @NotBlank
    @Size(min = 6, max = 6, message = "Code muss 6 Ziffern haben.")
    private String code;
}
