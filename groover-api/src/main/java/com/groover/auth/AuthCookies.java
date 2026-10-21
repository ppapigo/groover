package com.groover.auth;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;
import java.time.Duration;
import java.time.Instant;

@Component
public class AuthCookies {
    private final boolean secure;
    private final String name;
    public AuthCookies(@Value("${app.auth.secure-cookies:true}") boolean secure) {
        this.secure = secure;
        this.name = secure ? "__Host-groover-refresh" : "groover-refresh";
    }
    public String read(HttpServletRequest request) {
        String value = null;
        if (request.getCookies() != null) for (var cookie : request.getCookies()) {
            if (name.equals(cookie.getName())) {
                if (value != null) return null; // Ambiguous duplicate cookies must not authenticate.
                value = cookie.getValue();
            }
        }
        return value;
    }
    public void set(HttpServletResponse response, AuthSessionService.Grant grant) {
        write(response, grant.refreshToken(), Math.max(0, Duration.between(Instant.now(), grant.expiresAt()).getSeconds()));
    }
    public void clear(HttpServletResponse response) { write(response, "", 0); }
    private void write(HttpServletResponse response, String value, long seconds) {
        response.addHeader(HttpHeaders.SET_COOKIE, ResponseCookie.from(name, value).path("/")
                .secure(secure).httpOnly(true).sameSite("Strict").maxAge(seconds).build().toString());
        response.setHeader(HttpHeaders.CACHE_CONTROL, "no-store");
    }
}
