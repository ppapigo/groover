package com.groover;

import com.fasterxml.jackson.databind.JsonNode;
import com.groover.auth.*;
import com.groover.review.*;
import com.groover.user.*;
import io.jsonwebtoken.Jwts;
import org.junit.jupiter.api.*;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.transaction.support.TransactionTemplate;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.*;
import static org.assertj.core.api.Assertions.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
        "server.servlet.context-path=/v1", "app.cors.allowed-origins=https://groover.grooverapp.com"
})
class SecurityHttpTests {
    @DynamicPropertySource
    static void database(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", () -> System.getProperty("security.test.database-url",
                "jdbc:h2:mem:security-http;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DEFAULT_NULL_ORDERING=HIGH"));
        registry.add("spring.datasource.username", () -> System.getProperty("security.test.database-user", "sa"));
        registry.add("spring.datasource.password", () -> System.getenv().getOrDefault("GROOVER_TEST_DB_PASSWORD", ""));
    }
    @Autowired TestRestTemplate http;
    @Autowired TransactionTemplate tx;
    @Autowired UserRepository users;
    @Autowired ReviewRepository reviews;
    @Autowired CommentRepository comments;
    @Autowired ReviewLikeRepository likes;
    @Autowired ReviewService service;
    @Autowired AuthRateLimiter limiter;
    @Autowired PasswordEncoder encoder;
    @Autowired JwtService jwt;
    @Autowired AuthSessionService sessions;
    @Autowired JdbcTemplate jdbc;
    @Value("${app.jwt.secret}") String secret;
    User owner, stranger;
    Review published, draft;
    String commentId, ownerToken, strangerToken;

    @BeforeEach void seed() {
        AuthTestSupport.enableCsrf(http);
        jdbc.update("DELETE FROM auth_rate_limits");
        tx.executeWithoutResult(status -> {
            owner = users.save(new User("owner", "owner@example.com", encoder.encode("password123"), "Owner"));
            stranger = users.save(new User("stranger", "stranger@example.com", encoder.encode("password123"), "Stranger"));
            published = reviews.save(review("Public review", true));
            draft = reviews.save(review("Private draft", false));
            commentId = comments.save(new Comment(published, owner, "Owner comment")).getId().toString();
            comments.save(new Comment(draft, owner, "Private draft comment"));
        });
        ownerToken = sessions.login(owner.getId()).response().accessToken();
        strangerToken = sessions.login(stranger.getId()).response().accessToken();
    }
    @AfterEach void clean() {
        SecurityContextHolder.clearContext();
        tx.executeWithoutResult(status -> { likes.deleteAll(); comments.deleteAll(); reviews.deleteAll(); users.deleteAll(); });
        jdbc.update("DELETE FROM auth_rate_limits");
    }
    private Review review(String title, boolean publish) {
        return new Review(owner, title, "A sufficiently long review content.", "review-" + UUID.randomUUID(),
                null, null, null, null, null, null, null, Set.of("safe-tag"), publish);
    }
    private ResponseEntity<JsonNode> request(HttpMethod method, String path, Object body, String token) {
        HttpHeaders headers = new HttpHeaders();
        if (token != null) headers.setBearerAuth(token);
        return http.exchange(path, method, new HttpEntity<>(body, headers), JsonNode.class);
    }
    private Map<String, Object> body() { return Map.of("title", "Edited review", "content", "A complete edited review.", "publish", true, "userId", owner.getId().toString()); }

    @ParameterizedTest
    @ValueSource(strings = {"/auth/me", "/blog/my-posts", "/blog/my-drafts"})
    void protectedReadsRequireAuthentication(String path) {
        assertThat(request(HttpMethod.GET, path, null, null).getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }
    @Test void anonymousWritesRequireAuthentication() {
        assertThat(request(HttpMethod.POST, "/blog/posts", body(), null).getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(request(HttpMethod.DELETE, "/blog/posts/" + published.getId(), null, null).getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }
    @Test void ownershipIsEnforcedForUpdateDeletePublishAndComments() {
        for (HttpMethod method : List.of(HttpMethod.PUT, HttpMethod.DELETE)) {
            assertThat(request(method, "/blog/posts/" + published.getId(), body(), strangerToken).getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        }
        assertThat(request(HttpMethod.POST, "/blog/posts/" + published.getId() + "/publish", Map.of("publish", false), strangerToken).getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(request(HttpMethod.DELETE, "/blog/comments/" + commentId, null, strangerToken).getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(comments.existsById(UUID.fromString(commentId))).isTrue();
    }
    @Test void draftsAndTheirCommentsAndLikesArePrivate() {
        for (String path : List.of("/blog/posts/" + draft.getId(), "/blog/posts/" + draft.getSlug(), "/blog/posts/" + draft.getId() + "/comments")) {
            assertThat(request(HttpMethod.GET, path, null, null).getStatusCode()).as(path).isEqualTo(HttpStatus.UNAUTHORIZED);
            assertThat(request(HttpMethod.GET, path, null, strangerToken).getStatusCode()).as(path).isEqualTo(HttpStatus.FORBIDDEN);
            assertThat(request(HttpMethod.GET, path, null, ownerToken).getStatusCode()).as(path).isEqualTo(HttpStatus.OK);
        }
        for (String suffix : List.of("/comments", "/like")) {
            assertThat(request(HttpMethod.POST, "/blog/posts/" + draft.getId() + suffix,
                    Map.of("content", "Attempted draft comment"), strangerToken).getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        }
    }
    @Test void serviceRejectsAnInjectedUserWithoutDependingOnController() {
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(stranger, null, List.of()));
        assertThatThrownBy(() -> service.delete(published.getId(), owner))
                .isInstanceOf(org.springframework.security.access.AccessDeniedException.class);
        SecurityContextHolder.clearContext();
        assertThatThrownBy(() -> service.delete(published.getId(), owner))
                .isInstanceOf(org.springframework.security.core.AuthenticationException.class);
    }
    @Test void publicQueriesWorkAndExcludeDrafts() {
        for (String path : List.of("/blog/feed", "/blog/feed/popular", "/search?q=review", "/blog/feed/tag/safe-tag", "/blog/tags/popular")) {
            var result = request(HttpMethod.GET, path, null, null);
            assertThat(result.getStatusCode()).as(path).isEqualTo(HttpStatus.OK);
            assertThat(result.getBody().toString()).doesNotContain("Private draft");
        }
        assertThat(request(HttpMethod.GET, "/blog/posts/" + published.getId(), null, null).getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(request(HttpMethod.GET, "/blog/posts/" + published.getId() + "/comments", null, null).getStatusCode()).isEqualTo(HttpStatus.OK);
    }
    @ParameterizedTest
    @ValueSource(strings = {"forged", "expired", "missing-exp", "missing-iat", "missing-sub", "missing-jti", "missing-sid",
            "wrong-issuer", "wrong-audience", "future", "unknown-user", "tampered"})
    void invalidJwtIsRejected(String kind) {
        Instant now = Instant.now();
        var builder = Jwts.builder().issuer(kind.equals("wrong-issuer") ? "other" : "groover-api")
                .audience().add(kind.equals("wrong-audience") ? "other" : "groover-web").and()
                .subject((kind.equals("unknown-user") ? UUID.randomUUID() : owner.getId()).toString())
                .claim("sid", jwt.parse(ownerToken).sessionId().toString())
                .id(UUID.randomUUID().toString()).issuedAt(Date.from(kind.equals("future") ? now.plusSeconds(120) : now.minusSeconds(120)));
        if (!kind.equals("missing-exp")) builder.expiration(Date.from(kind.equals("expired") ? now.minusSeconds(1) : now.plusSeconds(300)));
        if (kind.equals("missing-iat")) builder.issuedAt(null);
        if (kind.equals("missing-sub")) builder.subject(null);
        if (kind.equals("missing-jti")) builder.id(null);
        if (kind.equals("missing-sid")) builder.claim("sid", null);
        String token = builder.signWith(kind.equals("forged") ? Jwts.SIG.HS256.key().build() : JwtService.keyFromSecret(secret), Jwts.SIG.HS256).compact();
        if (kind.equals("tampered")) {
            String[] parts = token.split("\\.");
            parts[1] = Base64.getUrlEncoder().withoutPadding().encodeToString("{\"sub\":\"attacker\"}".getBytes(java.nio.charset.StandardCharsets.UTF_8));
            token = String.join(".", parts);
        }
        var result = request(HttpMethod.GET, "/auth/me", null, token);
        assertThat(result.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(result.getBody().toString()).doesNotContain(secret, "Exception", "signature", "expired");
    }
    @ParameterizedTest
    @ValueSource(strings = {"Basic abc", "Bearer", "Bearer ", "Bearer invalid", "Bearer a.b.c extra", "Bearer a.b.c,Bearer a.b.c"})
    void malformedAuthorizationIsRejected(String authorization) {
        HttpHeaders headers = new HttpHeaders(); headers.set("Authorization", authorization);
        assertThat(http.exchange("/auth/me", HttpMethod.GET, new HttpEntity<>(headers), String.class).getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }
    @Test void duplicateAuthorizationHeadersAreRejected() {
        HttpHeaders headers = new HttpHeaders();
        headers.add("Authorization", "Bearer " + ownerToken); headers.add("Authorization", "Bearer " + strangerToken);
        assertThat(http.exchange("/auth/me", HttpMethod.GET, new HttpEntity<>(headers), String.class).getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }
    @Test void passwordsAreHashedAndUnknownAccountsUseTheSameFailureResponse() {
        assertThat(owner.getPasswordHash()).startsWith("$2").isNotEqualTo("password123");
        assertThat(encoder.matches("password123", owner.getPasswordHash())).isTrue();
        var bad = request(HttpMethod.POST, "/auth/login", Map.of("userId", "owner", "password", "wrong-password"), null);
        var missing = request(HttpMethod.POST, "/auth/login", Map.of("userId", "missing", "password", "wrong-password"), null);
        assertThat(bad.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(missing.getStatusCode()).isEqualTo(bad.getStatusCode());
        assertThat(missing.getBody()).isEqualTo(bad.getBody());
        assertThat(request(HttpMethod.POST, "/auth/login", Map.of("email", "OWNER@example.com", "password", "password123"), null).getStatusCode()).isEqualTo(HttpStatus.OK);
    }
    @Test void registrationRejectsMissingAndOverlongUtf8Passwords() {
        for (String password : List.of("", "short", "가".repeat(25))) {
            assertThat(request(HttpMethod.POST, "/auth/register", Map.of("userId", "newuser", "email", "new@example.com", "name", "New", "password", password), null).getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        }
        assertThat(request(HttpMethod.POST, "/auth/register", Map.of("email", "new@example.com", "name", "New"), null).getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    }
    @Test void loginAccountLimitSurvivesFailuresAndCoversBothEmailAndId() {
        for (int i = 0; i < 10; i++) {
            assertThat(request(HttpMethod.POST, "/auth/login", Map.of(i % 2 == 0 ? "userId" : "email",
                    i % 2 == 0 ? "owner" : "owner@example.com", "password", "wrong-password"), null).getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        }
        var blocked = request(HttpMethod.POST, "/auth/login", Map.of("userId", "owner", "password", "password123"), null);
        assertThat(blocked.getStatusCode()).isEqualTo(HttpStatus.TOO_MANY_REQUESTS);
        assertThat(blocked.getHeaders().getFirst("Retry-After")).isNotBlank();
    }
    @Test void ipLimitCannotBeBypassedWithForwardedHeadersOrDifferentAccounts() {
        for (int i = 0; i < 61; i++) {
            HttpHeaders headers = new HttpHeaders();
            headers.set("X-Forwarded-For", "203.0.113." + i);
            headers.set("Forwarded", "for=198.51.100." + i);
            var result = http.exchange("/auth/login", HttpMethod.POST,
                    new HttpEntity<>(Map.of("userId", "missing" + i, "password", "password123"), headers), JsonNode.class);
            assertThat(result.getStatusCode()).isEqualTo(i < 60 ? HttpStatus.UNAUTHORIZED : HttpStatus.TOO_MANY_REQUESTS);
        }
    }
    @Test void registrationHasAnIpLimit() {
        for (int i = 0; i < 11; i++) {
            var result = request(HttpMethod.POST, "/auth/register", Map.of("name", "Incomplete"), null);
            assertThat(result.getStatusCode()).isEqualTo(i < 10 ? HttpStatus.BAD_REQUEST : HttpStatus.TOO_MANY_REQUESTS);
        }
    }
    @Test void encodedAuthPathsCannotBypassTheIpLimit() {
        var uri = java.net.URI.create(http.getRootUri() + "/auth/%72egister");
        for (int i = 0; i < 11; i++) {
            var result = http.exchange(uri, HttpMethod.POST, new HttpEntity<>(Map.of("name", "Incomplete")), String.class);
            assertThat(result.getStatusCode()).isEqualTo(i < 10 ? HttpStatus.BAD_REQUEST : HttpStatus.TOO_MANY_REQUESTS);
        }
    }
    @Test void rateLimitsAreSharedBetweenInstancesAndAtomic() throws Exception {
        var another = new AuthRateLimiter(jdbc);
        for (int i = 0; i < 3; i++) limiter.consume("shared-test", "same-account", 3, 900);
        assertThatThrownBy(() -> tx.executeWithoutResult(s -> another.consume("shared-test", "same-account", 3, 900))).isInstanceOf(RateLimitException.class);
        try (var executor = Executors.newFixedThreadPool(6)) {
            var jobs = new ArrayList<Callable<Boolean>>();
            for (int i = 0; i < 12; i++) jobs.add(() -> {
                try { limiter.consume("parallel-test", "same-account", 3, 900); return true; }
                catch (RateLimitException e) { return false; }
            });
            long allowed = 0;
            for (var future : executor.invokeAll(jobs)) if (future.get()) allowed++;
            assertThat(allowed).isEqualTo(3);
        }
    }
    @Test void concurrentLikesPreserveToggleSemanticsAndCounters() throws Exception {
        try (var executor = Executors.newFixedThreadPool(6)) {
            var jobs = new ArrayList<Callable<ResponseEntity<JsonNode>>>();
            for (int i = 0; i < 10; i++) jobs.add(() -> request(HttpMethod.POST, "/blog/posts/" + published.getId() + "/like", null, strangerToken));
            for (var result : executor.invokeAll(jobs)) assertThat(result.get().getStatusCode()).isEqualTo(HttpStatus.OK);
        }
        assertThat(likes.count()).isZero();
        assertThat(reviews.findById(published.getId()).orElseThrow().getLikeCount()).isZero();
    }
    @Test void productionCorsOnlyAllowsTheProductionOriginAndExplicitHeaders() {
        for (String origin : List.of("https://groover.grooverapp.com", "https://grooverapp.com", "https://board.grooverapp.com", "https://achat.grooverapp.com", "https://evil.example", "http://localhost:3001")) {
            HttpHeaders headers = new HttpHeaders();
            headers.setOrigin(origin); headers.setAccessControlRequestMethod(HttpMethod.POST);
            headers.setAccessControlRequestHeaders(List.of("authorization", "content-type", "x-csrf-token"));
            var result = http.exchange("/auth/login", HttpMethod.OPTIONS, new HttpEntity<>(headers), String.class);
            assertThat(result.getStatusCode()).isEqualTo(origin.equals("https://groover.grooverapp.com") ? HttpStatus.OK : HttpStatus.FORBIDDEN);
            assertThat(result.getHeaders().getAccessControlAllowCredentials()).isEqualTo(origin.equals("https://groover.grooverapp.com"));
        }
    }
    @Test void logoutImmediatelyRevokesTheAccessToken() {
        assertThat(request(HttpMethod.POST, "/auth/logout", null, ownerToken).getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(request(HttpMethod.GET, "/auth/me", null, ownerToken).getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(request(HttpMethod.GET, "/auth/me", null, strangerToken).getStatusCode()).isEqualTo(HttpStatus.OK);
    }
}
