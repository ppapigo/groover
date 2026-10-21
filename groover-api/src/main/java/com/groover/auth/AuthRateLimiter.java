package com.groover.auth;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;

@Service
public class AuthRateLimiter {
    private final JdbcTemplate jdbc;
    public AuthRateLimiter(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    // Shared, durable counters. A pre-existing stripe lock also serializes first inserts.
    // REQUIRES_NEW commits the attempt even when authentication subsequently fails.
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void consume(String scope, String identifier, int limit, long windowSeconds) {
        String key = hash(scope + ":" + identifier);
        int stripe = Integer.parseInt(key.substring(0, 2), 16) % 64;
        jdbc.queryForObject("SELECT id FROM auth_rate_limit_locks WHERE id = ? FOR UPDATE", Integer.class, stripe);
        long now = jdbc.queryForObject("SELECT CURRENT_TIMESTAMP", java.sql.Timestamp.class).toInstant().getEpochSecond();
        var counters = jdbc.query("SELECT window_start, attempts FROM auth_rate_limits WHERE key_hash = ?",
                (rs, row) -> new long[]{rs.getLong(1), rs.getLong(2)}, key);
        if (counters.isEmpty()) {
            jdbc.update("INSERT INTO auth_rate_limits (key_hash, window_start, attempts) VALUES (?, ?, 1)", key, now);
        } else {
            long[] counter = counters.getFirst();
            if (now >= counter[0] + windowSeconds) {
                jdbc.update("UPDATE auth_rate_limits SET window_start = ?, attempts = 1 WHERE key_hash = ?", now, key);
            } else {
                if (counter[1] >= limit) throw new RateLimitException(counter[0] + windowSeconds - now);
                jdbc.update("UPDATE auth_rate_limits SET attempts = attempts + 1 WHERE key_hash = ?", key);
            }
        }
    }

    @Scheduled(fixedDelay = 3600000, initialDelay = 3600000)
    @Transactional
    public void cleanup() {
        long now = jdbc.queryForObject("SELECT CURRENT_TIMESTAMP", java.sql.Timestamp.class).toInstant().getEpochSecond();
        jdbc.update("DELETE FROM auth_rate_limits WHERE window_start < ?", now - 86400);
    }

    private String hash(String value) {
        try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8))); }
        catch (NoSuchAlgorithmException e) { throw new IllegalStateException("SHA-256 unavailable."); }
    }
}
