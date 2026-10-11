package com.groover.auth;

import com.groover.user.User;
import jakarta.validation.constraints.*;

public final class AuthDtos {
    private AuthDtos() {}
    public record RegisterRequest(@Pattern(regexp = "^[a-zA-Z0-9_]{4,30}$") String userId,
                                  @Email @NotBlank String email, @Size(min = 8, max = 72) String password,
                                  @NotBlank @Size(max = 50) String name) {}
    public record LoginRequest(String email, String userId, @NotBlank String password) {}
    public record UserResponse(String id, String userId, String email, String name, String profileImageUrl) {
        public static UserResponse from(User u) { return new UserResponse(u.getId().toString(), u.getUserId(), u.getEmail(), u.getName(), u.getProfileImageUrl()); }
    }
    public record AuthResponse(UserResponse user, String accessToken) {}
}
