package com.example.sepdrivebackend.dto;

import jakarta.validation.constraints.DecimalMin; 
import jakarta.validation.constraints.NotNull;

public class DepositRequestDto {

    @NotNull(message = "Amount cannot be null")
    @DecimalMin(value = "0.01", inclusive = true, message = "Amount must be at least 0.01") 
    private Double amount;

    public Double getAmount() {
        return amount;
    }

    public void setAmount(Double amount) {
        this.amount = amount;
    }
}