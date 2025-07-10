package com.example.sepdrivebackend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class StopLocationDto {
    private BigDecimal latitude;
    private BigDecimal longitude;
    private String address; // optional
}
