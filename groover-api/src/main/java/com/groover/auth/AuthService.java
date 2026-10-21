package com.groover.auth;

import com.groover.auth.dto.LoginRequest;
import com.groover.auth.dto.RegisterRequest;
import com.groover.user.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.validation.annotation.Validated;
import java.nio.charset.StandardCharsets;
import java.util.Locale;
import java.util.UUID;

@Service @Validated
public class AuthService {
    private final UserRepository users; private final PasswordEncoder encoder; private final AuthSessionService sessions;
    private final AuthRateLimiter limiter;
    private final String dummyHash;
    public AuthService(UserRepository users, PasswordEncoder encoder, AuthSessionService sessions, AuthRateLimiter limiter) {
        this.users = users; this.encoder = encoder; this.sessions = sessions; this.limiter = limiter;
        this.dummyHash = encoder.encode(UUID.randomUUID().toString());
    }
    // Each counter commits independently; do not hold an outer DB connection while acquiring a limiter connection.
    public AuthSessionService.Grant register(@NotNull @Valid RegisterRequest request) {
        validatePasswordBytes(request.password());
        limiter.consume("register:email", request.email(), 3, 900);
        String requestedId = request.userId() == null || request.userId().isBlank()
                ? request.email().substring(0, request.email().indexOf('@')).replaceAll("[^a-zA-Z0-9_]", "")
                : request.userId();
        String userId = requestedId.length() >= 4 ? requestedId.substring(0, Math.min(30, requestedId.length()))
                : requestedId + UUID.randomUUID().toString().substring(0, 4);
        limiter.consume("register:id", userId.toLowerCase(Locale.ROOT), 3, 900);
        if (users.existsByEmailIgnoreCase(request.email())) throw new IllegalArgumentException("이미 사용 중인 이메일입니다.");
        if (users.existsByUserId(userId)) throw new IllegalArgumentException("이미 사용 중인 아이디입니다.");
        return sessions.register(new User(userId, request.email(), encoder.encode(request.password()), request.name()));
    }
    public AuthSessionService.Grant login(@NotNull @Valid LoginRequest request) {
        validatePasswordBytes(request.password());
        if ((request.email() == null) == (request.userId() == null)) throw invalid();
        User user = request.email() != null ? users.findByEmailIgnoreCase(request.email()).orElse(null)
                : users.findByUserId(request.userId()).orElse(null);
        String identifier = user != null ? user.getId().toString()
                : (request.email() != null ? request.email() : request.userId().toLowerCase(Locale.ROOT));
        limiter.consume("login:account", identifier, 10, 900);
        boolean matches = encoder.matches(request.password(), user == null ? dummyHash : user.getPasswordHash());
        if (user == null || !matches) throw invalid();
        return sessions.login(user.getId());
    }
    private void validatePasswordBytes(String password) {
        if (password.getBytes(StandardCharsets.UTF_8).length > 72)
            throw new IllegalArgumentException("비밀번호는 UTF-8 기준 72바이트 이하여야 합니다.");
    }
    private BadCredentialsException invalid() { return new BadCredentialsException("아이디 또는 비밀번호가 올바르지 않습니다."); }
}
