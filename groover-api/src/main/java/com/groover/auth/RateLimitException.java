package com.groover.auth;

public class RateLimitException extends RuntimeException {
    private final long retryAfter;
    public RateLimitException(long retryAfter) {
        super("요청이 너무 많습니다. 잠시 후 다시 시도해주세요.");
        this.retryAfter = Math.max(1, retryAfter);
    }
    public long retryAfter() { return retryAfter; }
}
