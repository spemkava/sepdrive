package com.example.sepdrivebackend.dto;


import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
public class VerifyTwoFactorResponse {

    private String tokenType = "Bearer";
    private String accessToken;

    public VerifyTwoFactorResponse(String accessToken) {
        this.accessToken = accessToken;
    }
}
