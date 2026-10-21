package com.groover.review.dto;

import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;

public record ReviewMetadata(
        @Size(max = 120) String productName,
        @Size(max = 100) String storeName,
        @PositiveOrZero @Digits(integer = 10, fraction = 2) BigDecimal price,
        @Min(1) @Max(5) Integer rating,
        @Size(max = 30) String purchaseStatus) {}
