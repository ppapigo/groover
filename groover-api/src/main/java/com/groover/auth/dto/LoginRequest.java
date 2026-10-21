package com.groover.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.Locale;

public record LoginRequest(
        @Size(max = 255) String email,
        @Size(max = 30) String userId,
        @NotBlank @Size(max = 72) String password) {
    public LoginRequest {
        email = email == null || email.isBlank() ? null : email.trim().toLowerCase(Locale.ROOT);
        userId = userId == null || userId.isBlank() ? null : userId.trim();
    }
}
