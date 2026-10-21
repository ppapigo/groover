package com.groover.auth.dto;

public record AuthResponse(UserResponse user, String accessToken) {}
