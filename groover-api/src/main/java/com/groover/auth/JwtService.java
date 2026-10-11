package com.groover.auth;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.*;

@Service
public class JwtService {
    private final SecretKey key;
    private final long expiration;
    public JwtService(@Value("${app.jwt.secret}") String secret, @Value("${app.jwt.access-expiration}") long expiration) {
        this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8)); this.expiration = expiration;
    }
    public String issue(UUID userId) {
        Instant now = Instant.now();
        return Jwts.builder().subject(userId.toString()).issuedAt(Date.from(now))
                .expiration(Date.from(now.plusMillis(expiration))).signWith(key).compact();
    }
    public UUID parseUserId(String token) {
        return UUID.fromString(Jwts.parser().verifyWith(key).build().parseSignedClaims(token).getPayload().getSubject());
    }
}
