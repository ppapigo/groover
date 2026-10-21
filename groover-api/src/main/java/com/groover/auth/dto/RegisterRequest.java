package com.groover.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.util.Locale;

public record RegisterRequest(
        @Pattern(regexp = "^[a-zA-Z0-9_]{4,30}$") String userId,
        @Email @NotBlank @Size(max = 255) String email,
        @NotBlank @Size(min = 8, max = 72) String password,
        @NotBlank @Size(max = 50) String name) {
    public RegisterRequest {
        email = email == null ? null : email.trim().toLowerCase(Locale.ROOT);
        userId = userId == null ? null : userId.trim();
        name = name == null ? null : name.trim();
    }
}
