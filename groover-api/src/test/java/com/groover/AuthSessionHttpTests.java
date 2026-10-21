package com.groover;

import com.fasterxml.jackson.databind.JsonNode;
import com.groover.auth.JwtService;
import com.groover.auth.AuthSessionService;
import com.groover.user.User;
import com.groover.user.UserRepository;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import java.util.*;
import java.util.concurrent.*;
import static org.assertj.core.api.Assertions.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
        "server.servlet.context-path=/v1", "app.auth.secure-cookies=true",
        "app.cors.allowed-origins=https://grooverapp.com"
})
class AuthSessionHttpTests {
    @DynamicPropertySource static void database(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", () -> System.getProperty("security.test.database-url",
                "jdbc:h2:mem:session-http;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DEFAULT_NULL_ORDERING=HIGH"));
        registry.add("spring.datasource.username", () -> System.getProperty("security.test.database-user", "sa"));
        registry.add("spring.datasource.password", () -> System.getenv().getOrDefault("GROOVER_TEST_DB_PASSWORD", ""));
    }
    @Autowired TestRestTemplate http;
    @Autowired JdbcTemplate jdbc;
    @Autowired UserRepository users;
    @Autowired PasswordEncoder encoder;
    @Autowired JwtService jwt;
    @Autowired AuthSessionService sessions;
    User user;
    record Login(String access, String refreshCookie) {}

    @BeforeEach void seed() {
        jdbc.update("DELETE FROM auth_rate_limits");
        user = users.saveAndFlush(new User("session_user", "session@example.test", encoder.encode("password123"), "Session user"));
    }
    @AfterEach void cleanup() { users.deleteById(user.getId()); jdbc.update("DELETE FROM auth_rate_limits"); }

    private HttpHeaders csrfHeaders(String refreshCookie) {
        var response = http.getForEntity("/auth/csrf", JsonNode.class);
        HttpHeaders headers = new HttpHeaders();
        headers.set("X-CSRF-TOKEN", response.getBody().path("data").path("token").asText());
        String csrfCookie = response.getHeaders().getFirst(HttpHeaders.SET_COOKIE).split(";", 2)[0];
        headers.set(HttpHeaders.COOKIE, csrfCookie + (refreshCookie == null ? "" : "; " + refreshCookie));
        return headers;
    }
    private ResponseEntity<JsonNode> post(String path, Object body, String cookie, String access) {
        var headers = csrfHeaders(cookie);
        if (access != null) headers.setBearerAuth(access);
        return http.exchange(path, HttpMethod.POST, new HttpEntity<>(body, headers), JsonNode.class);
    }
    private Login login() {
        var response = post("/auth/login", Map.of("userId", user.getUserId(), "password", "password123"), null, null);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        return credentials(response);
    }
    private Login credentials(ResponseEntity<JsonNode> response) {
        return new Login(response.getBody().path("data").path("accessToken").asText(),
                response.getHeaders().getOrEmpty(HttpHeaders.SET_COOKIE).stream()
                        .filter(c -> c.startsWith("__Host-groover-refresh=")).findFirst().orElseThrow().split(";", 2)[0]);
    }
    private HttpStatusCode me(String token) {
        HttpHeaders headers = new HttpHeaders(); headers.setBearerAuth(token);
        return http.exchange("/auth/me", HttpMethod.GET, new HttpEntity<>(headers), JsonNode.class).getStatusCode();
    }

    @Test void refreshIsHttpOnlySecureAndOnlyHashedInTheDatabase() {
        var response = post("/auth/login", Map.of("email", user.getEmail(), "password", "password123"), null, null);
        var logged = credentials(response);
        String raw = logged.refreshCookie().split("=", 2)[1];
        assertThat(response.getHeaders().getFirst(HttpHeaders.SET_COOKIE))
                .contains("HttpOnly", "Secure", "SameSite=Strict", "Path=/").doesNotContain("Domain=");
        assertThat(response.getHeaders().getCacheControl()).contains("no-store");
        assertThat(response.getBody().toString()).doesNotContain(raw, "refreshToken");
        assertThat(jdbc.queryForList("SELECT token_hash FROM auth_refresh_tokens", String.class))
                .allSatisfy(hash -> assertThat(hash).matches("[0-9a-f]{64}").isNotEqualTo(raw));
        assertThat(me(logged.access())).isEqualTo(HttpStatus.OK);
        // A refresh cookie never authenticates an ordinary API request.
        HttpHeaders headers = new HttpHeaders(); headers.set(HttpHeaders.COOKIE, logged.refreshCookie());
        assertThat(http.exchange("/auth/me", HttpMethod.GET, new HttpEntity<>(headers), String.class).getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }
    @Test void rotationAndReplayRevokeTheSessionAndCommitThatRevocation() {
        var first = login();
        var rotated = post("/auth/refresh", Map.of(), first.refreshCookie(), null);
        assertThat(rotated.getStatusCode()).isEqualTo(HttpStatus.OK);
        var second = credentials(rotated);
        assertThat(second.refreshCookie()).isNotEqualTo(first.refreshCookie());
        assertThat(me(first.access())).isEqualTo(HttpStatus.OK);
        assertThat(post("/auth/refresh", Map.of(), first.refreshCookie(), null).getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(me(first.access())).isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(me(second.access())).isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(post("/auth/refresh", Map.of(), second.refreshCookie(), null).getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM auth_sessions WHERE user_id=? AND revoked_at IS NOT NULL", Integer.class, user.getId())).isEqualTo(1);
    }
    @Test void cookieLogoutWorksWithoutAnAccessTokenAndKeepsOtherDevicesSignedIn() {
        var first = login(); var other = login();
        var result = post("/auth/logout", Map.of(), first.refreshCookie(), null);
        assertThat(result.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(result.getHeaders().getFirst(HttpHeaders.SET_COOKIE)).contains("Max-Age=0");
        assertThat(me(first.access())).isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(post("/auth/refresh", Map.of(), first.refreshCookie(), null).getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(me(other.access())).isEqualTo(HttpStatus.OK);
    }
    @Test void logoutAllRevokesAllDevicesAndTheirRefreshTokens() {
        var first = login(); var other = login();
        assertThat(post("/auth/logout-all", Map.of(), first.refreshCookie(), null).getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        var another = users.saveAndFlush(new User("unaffected", "unaffected@example.test", encoder.encode("password123"), "Another user"));
        try {
            String unrelated = sessions.login(another.getId()).response().accessToken();
            assertThat(post("/auth/logout-all", Map.of("userId", another.getId()), first.refreshCookie(), first.access()).getStatusCode()).isEqualTo(HttpStatus.OK);
            for (var device : List.of(first, other)) {
                assertThat(me(device.access())).isEqualTo(HttpStatus.UNAUTHORIZED);
                assertThat(post("/auth/refresh", Map.of(), device.refreshCookie(), null).getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
            }
            assertThat(me(unrelated)).isEqualTo(HttpStatus.OK);
        } finally { users.deleteById(another.getId()); }
        assertThat(me(login().access())).isEqualTo(HttpStatus.OK);
    }
    @Test void expiredSessionAndUnknownOrMismatchedSessionIdsAreRejected() {
        var first = login();
        assertThat(me(jwt.issue(user.getId(), UUID.randomUUID()))).isEqualTo(HttpStatus.UNAUTHORIZED);
        var another = users.saveAndFlush(new User("other_session", "other-session@example.test", encoder.encode("password123"), "Other"));
        try {
            var other = sessions.login(another.getId());
            assertThat(me(jwt.issue(user.getId(), jwt.parse(other.response().accessToken()).sessionId()))).isEqualTo(HttpStatus.UNAUTHORIZED);
        } finally { users.deleteById(another.getId()); }
        jdbc.update("UPDATE auth_sessions SET expires_at=? WHERE user_id=?", java.sql.Timestamp.from(java.time.Instant.now().minusSeconds(10)), user.getId());
        assertThat(me(first.access())).isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(post("/auth/refresh", Map.of(), first.refreshCookie(), null).getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }
    @Test void invalidRefreshDoesNotRevokeAnUnrelatedSession() {
        var first = login();
        for (String cookie : Arrays.asList(null, "__Host-groover-refresh=invalid",
                "__Host-groover-refresh=" + "x".repeat(43),
                first.refreshCookie() + "; " + first.refreshCookie())) {
            assertThat(post("/auth/refresh", Map.of(), cookie, null).getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        }
        assertThat(me(first.access())).isEqualTo(HttpStatus.OK);
    }
    @Test void authCookieActionsRequireCsrfEvenWithValidCredentials() {
        var first = login();
        for (String path : List.of("/auth/login", "/auth/register", "/auth/refresh", "/auth/logout", "/auth/logout-all")) {
            for (String supplied : List.of("", "forged")) {
                HttpHeaders headers = new HttpHeaders(); headers.set(HttpHeaders.COOKIE, first.refreshCookie());
                headers.setBearerAuth(first.access()); headers.set("X-CSRF-TOKEN", supplied);
                assertThat(http.exchange(path, HttpMethod.POST, new HttpEntity<>(Map.of(), headers), String.class)
                        .getStatusCode()).as(path).isEqualTo(HttpStatus.FORBIDDEN);
            }
        }
        var headers = csrfHeaders(first.refreshCookie()); headers.setOrigin("https://evil.example");
        assertThat(http.exchange("/auth/refresh", HttpMethod.POST, new HttpEntity<>(Map.of(), headers), String.class)
                .getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(me(first.access())).isEqualTo(HttpStatus.OK);
    }
    @Test void twoSimultaneousRefreshesDetectReuseAndInvalidateTheWinningTokenToo() throws Exception {
        var first = login();
        try (var executor = Executors.newFixedThreadPool(2)) {
            var barrier = new CyclicBarrier(2);
            Callable<ResponseEntity<JsonNode>> action = () -> { barrier.await(); return post("/auth/refresh", Map.of(), first.refreshCookie(), null); };
            var results = executor.invokeAll(List.of(action, action));
            var responses = List.of(results.get(0).get(), results.get(1).get());
            assertThat(responses.stream().map(r -> r.getStatusCode().value()).toList()).containsExactlyInAnyOrder(200, 401);
            var winner = credentials(responses.stream().filter(r -> r.getStatusCode().is2xxSuccessful()).findFirst().orElseThrow());
            assertThat(me(winner.access())).isEqualTo(HttpStatus.UNAUTHORIZED);
        }
    }
    @Test void logoutAllRacingWithRefreshCannotResurrectASession() throws Exception {
        var first = login();
        try (var executor = Executors.newFixedThreadPool(2)) {
            var barrier = new CyclicBarrier(2);
            var refresh = executor.submit(() -> { barrier.await(); return post("/auth/refresh", Map.of(), first.refreshCookie(), null); });
            var logout = executor.submit(() -> { barrier.await(); return post("/auth/logout-all", Map.of(), first.refreshCookie(), first.access()); });
            assertThat(logout.get().getStatusCode()).isEqualTo(HttpStatus.OK);
            var response = refresh.get();
            assertThat(response.getStatusCode().value()).isIn(200, 401);
            if (response.getStatusCode().is2xxSuccessful()) assertThat(me(credentials(response).access())).isEqualTo(HttpStatus.UNAUTHORIZED);
            assertThat(me(first.access())).isEqualTo(HttpStatus.UNAUTHORIZED);
        }
    }
    @Test void refreshIsRateLimitedPerIp() {
        for (int i = 0; i < 121; i++) {
            var response = post("/auth/refresh", Map.of(), null, null);
            assertThat(response.getStatusCode()).isEqualTo(i < 120 ? HttpStatus.UNAUTHORIZED : HttpStatus.TOO_MANY_REQUESTS);
        }
    }
}
