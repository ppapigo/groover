package com.groover.auth;

import com.groover.auth.dto.AuthResponse;
import com.groover.auth.dto.UserResponse;
import com.groover.user.User;
import com.groover.user.UserRepository;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.sql.Timestamp;
import java.time.Duration;
import java.time.Instant;
import java.util.*;

@Service
public class AuthSessionService {
    private static final Duration LIFETIME = Duration.ofDays(7);
    private final JdbcTemplate jdbc;
    private final UserRepository users;
    private final JwtService jwt;
    private final SecureRandom random = new SecureRandom();

    public AuthSessionService(JdbcTemplate jdbc, UserRepository users, JwtService jwt) {
        this.jdbc = jdbc; this.users = users; this.jwt = jwt;
    }

    public record Grant(AuthResponse response, String refreshToken, Instant expiresAt) {
        @Override public String toString() { return "AuthSessionGrant[redacted]"; }
    }
    private record TokenSession(UUID id, UUID userId) {}

    @Transactional
    public Grant register(User user) { return create(users.saveAndFlush(user)); }

    @Transactional
    public Grant login(UUID userId) {
        lockUser(userId);
        return create(users.findById(userId).orElseThrow(this::invalid));
    }

    private Grant create(User user) {
        Instant now = now();
        Instant expiry = now.plus(LIFETIME);
        UUID sessionId = UUID.randomUUID();
        jdbc.update("INSERT INTO auth_sessions (id,user_id,created_at,expires_at) VALUES (?,?,?,?)",
                sessionId, user.getId(), Timestamp.from(now), Timestamp.from(expiry));
        return grant(user, sessionId, expiry, now);
    }

    // Return an empty result AFTER recording reuse. Throwing a normal transactional
    // exception here would roll the revocation back and leave stolen tokens usable.
    @Transactional
    public Optional<Grant> refresh(String token) {
        var found = lookup(token);
        if (found.isEmpty()) return Optional.empty();
        var session = found.get();
        lockUser(session.userId());
        var rows = jdbc.query("SELECT expires_at,revoked_at FROM auth_sessions WHERE id=? FOR UPDATE",
                (rs, row) -> new Instant[]{rs.getTimestamp(1).toInstant(),
                        rs.getTimestamp(2) == null ? null : rs.getTimestamp(2).toInstant()}, session.id());
        Instant now = now();
        if (rows.isEmpty() || rows.getFirst()[1] != null || !rows.getFirst()[0].isAfter(now)) return Optional.empty();
        int consumed = jdbc.update("UPDATE auth_refresh_tokens SET used_at=? WHERE token_hash=? AND used_at IS NULL",
                Timestamp.from(now), hash(token));
        if (consumed == 0) {
            jdbc.update("UPDATE auth_sessions SET revoked_at=? WHERE id=?", Timestamp.from(now), session.id());
            return Optional.empty();
        }
        User user = users.findById(session.userId()).orElseThrow(this::invalid);
        return Optional.of(grant(user, session.id(), rows.getFirst()[0], now));
    }

    @Transactional
    public void logout(UUID userId, UUID sessionId) {
        lockUser(userId);
        jdbc.update("UPDATE auth_sessions SET revoked_at=CURRENT_TIMESTAMP WHERE id=? AND user_id=? AND revoked_at IS NULL",
                sessionId, userId);
    }

    @Transactional
    public void logoutByRefresh(String token) {
        lookup(token).ifPresent(session -> {
            lockUser(session.userId());
            jdbc.update("UPDATE auth_sessions SET revoked_at=CURRENT_TIMESTAMP WHERE id=? AND revoked_at IS NULL", session.id());
        });
    }

    @Transactional
    public void logoutAll(UUID userId) {
        // Session creation, rotation and logout-all use the same user lock.
        lockUser(userId);
        jdbc.update("UPDATE auth_sessions SET revoked_at=CURRENT_TIMESTAMP WHERE user_id=? AND revoked_at IS NULL", userId);
    }

    private Grant grant(User user, UUID sessionId, Instant expiry, Instant now) {
        byte[] bytes = new byte[32]; random.nextBytes(bytes);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        jdbc.update("INSERT INTO auth_refresh_tokens (token_hash,session_id,created_at) VALUES (?,?,?)",
                hash(token), sessionId, Timestamp.from(now));
        return new Grant(new AuthResponse(UserResponse.from(user), jwt.issue(user.getId(), sessionId)), token, expiry);
    }

    private Optional<TokenSession> lookup(String token) {
        if (token == null || !token.matches("[A-Za-z0-9_-]{43}")) return Optional.empty();
        return jdbc.query("SELECT s.id,s.user_id FROM auth_sessions s JOIN auth_refresh_tokens t ON t.session_id=s.id WHERE t.token_hash=?",
                (rs, row) -> new TokenSession(rs.getObject(1, UUID.class), rs.getObject(2, UUID.class)), hash(token)).stream().findFirst();
    }
    private void lockUser(UUID id) {
        if (jdbc.query("SELECT id FROM users WHERE id=? FOR UPDATE", (rs, row) -> rs.getObject(1, UUID.class), id).isEmpty()) throw invalid();
    }
    private Instant now() { return jdbc.queryForObject("SELECT CURRENT_TIMESTAMP", Timestamp.class).toInstant(); }
    private String hash(String token) {
        try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(token.getBytes(StandardCharsets.US_ASCII))); }
        catch (NoSuchAlgorithmException e) { throw new IllegalStateException("SHA-256 unavailable."); }
    }
    private BadCredentialsException invalid() { return new BadCredentialsException("인증이 필요합니다."); }

    @Scheduled(fixedDelay = 3600000, initialDelay = 3600000)
    @Transactional
    public void cleanup() {
        // Expired sessions and their token history are removed together by the FK.
        jdbc.update("DELETE FROM auth_sessions WHERE expires_at < CURRENT_TIMESTAMP");
    }
}
