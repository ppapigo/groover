package com.groover.auth;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import javax.crypto.SecretKey;
import java.time.Instant;
import java.util.*;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;

@Service
public class JwtService {
    private final SecretKey key;
    private final long expiration;
    public JwtService(@Value("${app.jwt.secret:}") String secret,
                      @Value("${app.jwt.access-expiration:900000}") long expiration, Environment environment) {
        if (expiration < 60000 || expiration > 3600000) {
            throw new IllegalStateException("JWT lifetime must be between 1 and 60 minutes.");
        }
        if (secret.isBlank() && environment.acceptsProfiles(Profiles.of("dev"))) {
            this.key = Jwts.SIG.HS256.key().build();
        } else {
            this.key = keyFromSecret(secret);
        }
        this.expiration = expiration;
    }
    public static SecretKey keyFromSecret(String secret) {
        byte[] bytes;
        try { bytes = Base64.getDecoder().decode(secret); }
        catch (IllegalArgumentException e) { throw new IllegalStateException("JWT_SECRET must be a Base64 encoded random key."); }
        Set<Byte> distinct = new HashSet<>();
        for (byte value : bytes) distinct.add(value);
        if (bytes.length < 32 || distinct.size() < 16) {
            throw new IllegalStateException("JWT_SECRET must contain at least 32 securely generated random bytes.");
        }
        return Keys.hmacShaKeyFor(bytes);
    }
    public String issue(UUID userId, UUID sessionId) {
        Instant now = Instant.now();
        return Jwts.builder().issuer("groover-api").audience().add("groover-web").and()
                .subject(userId.toString()).claim("sid", sessionId.toString()).id(UUID.randomUUID().toString()).issuedAt(Date.from(now))
                .expiration(Date.from(now.plusMillis(expiration))).signWith(key, Jwts.SIG.HS256).compact();
    }
    public record Identity(UUID userId, UUID sessionId) {}
    public Identity parse(String token) {
        var signed = Jwts.parser().verifyWith(key).requireIssuer("groover-api")
                .requireAudience("groover-web").build().parseSignedClaims(token);
        Claims claims = signed.getPayload();
        Instant now = Instant.now();
        if (!"HS256".equals(signed.getHeader().getAlgorithm()) || claims.getExpiration() == null
                || claims.getIssuedAt() == null || claims.getId() == null || claims.getId().isBlank()
                || claims.getSubject() == null || claims.getSubject().isBlank()
                || claims.get("sid", String.class) == null
                || claims.getIssuedAt().toInstant().isAfter(now.plusSeconds(30))
                || !claims.getExpiration().after(claims.getIssuedAt())
                || claims.getExpiration().getTime() - claims.getIssuedAt().getTime() > 3600000) {
            throw new JwtException("Invalid token.");
        }
        UUID id = UUID.fromString(claims.getSubject());
        UUID sessionId = UUID.fromString(claims.get("sid", String.class));
        if (!id.toString().equals(claims.getSubject()) || !sessionId.toString().equals(claims.get("sid", String.class)))
            throw new JwtException("Invalid subject.");
        return new Identity(id, sessionId);
    }
}
