package com.groover.auth;

import com.groover.user.*;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.UUID;

@Service @RequiredArgsConstructor
public class AuthService {
    private final UserRepository users; private final PasswordEncoder encoder; private final JwtService jwt;
    @Transactional public AuthDtos.AuthResponse register(AuthDtos.RegisterRequest request) {
        String requestedId = request.userId() == null || request.userId().isBlank()
                ? request.email().substring(0, request.email().indexOf('@')).replaceAll("[^a-zA-Z0-9_]", "")
                : request.userId();
        String userId = requestedId.length() >= 4 ? requestedId : requestedId + UUID.randomUUID().toString().substring(0, 4);
        if (users.existsByEmailIgnoreCase(request.email())) throw new IllegalArgumentException("이미 사용 중인 이메일입니다.");
        if (users.existsByUserId(userId)) throw new IllegalArgumentException("이미 사용 중인 아이디입니다.");
        User user = users.save(new User(userId, request.email(), encoder.encode(request.password()), request.name()));
        return new AuthDtos.AuthResponse(AuthDtos.UserResponse.from(user), jwt.issue(user.getId()));
    }
    @Transactional(readOnly = true) public AuthDtos.AuthResponse login(AuthDtos.LoginRequest request) {
        if ((request.email() == null || request.email().isBlank()) && (request.userId() == null || request.userId().isBlank()))
            throw invalid();
        User user = request.email() != null ? users.findByEmailIgnoreCase(request.email()).orElseThrow(() -> invalid())
                : users.findByUserId(request.userId()).orElseThrow(() -> invalid());
        if (!encoder.matches(request.password(), user.getPasswordHash())) throw invalid();
        return new AuthDtos.AuthResponse(AuthDtos.UserResponse.from(user), jwt.issue(user.getId()));
    }
    private IllegalArgumentException invalid() { return new IllegalArgumentException("아이디 또는 비밀번호가 올바르지 않습니다."); }
}
