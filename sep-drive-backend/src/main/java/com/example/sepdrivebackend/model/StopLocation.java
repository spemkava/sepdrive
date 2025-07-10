package com.example.sepdrivebackend.model;

import jakarta.persistence.Embeddable;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;

@Embeddable
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class StopLocation {
    private BigDecimal latitude;
    private BigDecimal longitude;
    private String address; // optional
}

