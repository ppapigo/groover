package com.groover.auth.dto;

import com.groover.user.User;

public record UserResponse(String id, String userId, String email, String name, String profileImageUrl) {
    public static UserResponse from(User user) {
        return new UserResponse(user.getId().toString(), user.getUserId(), user.getEmail(),
                user.getName(), user.getProfileImageUrl());
    }
}
