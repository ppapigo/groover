package com.groover;

import com.groover.auth.ClientIpResolver;
import com.groover.auth.JwtService;
import com.groover.auth.AuthRateLimiter;
import com.groover.auth.AuthRateLimitFilter;
import com.groover.config.ProductionSecurityValidator;
import io.jsonwebtoken.Jwts;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.mock.env.MockEnvironment;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import java.util.Base64;
import java.util.UUID;
import static org.assertj.core.api.Assertions.*;

class SecurityConfigurationTests {
    private String randomKey() { return Base64.getEncoder().encodeToString(Jwts.SIG.HS256.key().build().getEncoded()); }
    private MockEnvironment valid() {
        var env = new MockEnvironment();
        env.setActiveProfiles("prod");
        return env.withProperty("spring.datasource.url", "jdbc:postgresql://db:5432/groover")
                .withProperty("spring.datasource.username", "groover")
                .withProperty("spring.datasource.password", UUID.randomUUID().toString() + UUID.randomUUID())
                .withProperty("app.jwt.secret", randomKey())
                .withProperty("app.cors.allowed-origins", "https://grooverapp.com")
                .withProperty("spring.jpa.hibernate.ddl-auto", "validate")
                .withProperty("spring.flyway.enabled", "true")
                .withProperty("spring.flyway.clean-disabled", "true")
                .withProperty("server.forward-headers-strategy", "none")
                .withProperty("app.security.trusted-proxies", "172.31.240.10");
    }
    @Test void productionAcceptsExplicitSecureConfiguration() { assertThatCode(() -> ProductionSecurityValidator.validate(valid())).doesNotThrowAnyException(); }
    @Test void productionRejectsThePublishedTestFixtureKey() {
        assertThatThrownBy(() -> ProductionSecurityValidator.validate(valid().withProperty("app.jwt.secret",
                "dGVzdC1vbmx5LXJhbmRvbS1ieXRlcy0wMTIzNDU2Nzg5QUJDREVG")))
                .isInstanceOf(IllegalStateException.class);
    }
    @ParameterizedTest
    @ValueSource(strings = {"", "groover", "password", "change-this-development-secret-to-at-least-32-bytes", "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"})
    void weakOrDefaultKeysAreRejectedWithoutEchoingValues(String value) {
        assertThatThrownBy(() -> JwtService.keyFromSecret(value)).isInstanceOf(IllegalStateException.class);
    }
    @ParameterizedTest
    @ValueSource(strings = {"", "groover", "password12345678901234567890", "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"})
    void unsafeDatabasePasswordsPreventProductionStartup(String value) {
        assertThatThrownBy(() -> ProductionSecurityValidator.validate(valid().withProperty("spring.datasource.password", value)))
                .isInstanceOf(IllegalStateException.class);
    }
    @Test void productionRejectsUnsafeOverridesAndMixedProfiles() {
        for (var pair : java.util.Map.of(
                "spring.jpa.hibernate.ddl-auto", "update",
                "app.auth.secure-cookies", "false",
                "spring.flyway.enabled", "false",
                "spring.flyway.clean-disabled", "false",
                "app.cors.allowed-origins", "http://localhost:3001",
                "server.forward-headers-strategy", "framework",
                "app.security.trusted-proxies", "").entrySet()) {
            assertThatThrownBy(() -> ProductionSecurityValidator.validate(valid().withProperty(pair.getKey(), pair.getValue())))
                    .as(pair.getKey()).isInstanceOf(IllegalStateException.class);
        }
        var env = valid(); env.setActiveProfiles("prod", "dev");
        assertThatThrownBy(() -> ProductionSecurityValidator.validate(env)).isInstanceOf(IllegalStateException.class);
    }
    @Test void keyRotationInvalidatesOldTokensAndOnlyDevCanGenerateAnEphemeralKey() {
        var first = new JwtService(randomKey(), 900000, valid());
        var second = new JwtService(randomKey(), 900000, valid());
        String token = first.issue(UUID.randomUUID(), UUID.randomUUID());
        assertThatThrownBy(() -> second.parse(token)).isInstanceOf(io.jsonwebtoken.JwtException.class);
        assertThatThrownBy(() -> new JwtService("", 900000, valid())).isInstanceOf(IllegalStateException.class);
        var dev = new MockEnvironment(); dev.setActiveProfiles("dev");
        assertThatCode(() -> new JwtService("", 900000, dev)).doesNotThrowAnyException();
    }
    @Test void onlyTheExplicitProxyCanProvideASingleClientIp() {
        var resolver = new ClientIpResolver("172.31.240.10");
        var request = new MockHttpServletRequest();
        request.setRemoteAddr("192.0.2.2"); request.addHeader("X-Forwarded-For", "198.51.100.10");
        assertThat(resolver.resolve(request)).isEqualTo("192.0.2.2");
        request.setRemoteAddr("172.31.240.10");
        assertThat(resolver.resolve(request)).isEqualTo("198.51.100.10");
        request.removeHeader("X-Forwarded-For"); request.addHeader("X-Forwarded-For", "198.51.100.10, 1.1.1.1");
        assertThat(resolver.resolve(request)).isEqualTo("172.31.240.10");
        request.removeHeader("X-Forwarded-For"); request.addHeader("X-Forwarded-For", "attacker.example");
        assertThat(resolver.resolve(request)).isEqualTo("172.31.240.10");
        assertThatThrownBy(() -> new ClientIpResolver("0.0.0.0/0")).isInstanceOf(IllegalStateException.class);
    }
    @Test void unavailableRateLimitStorageFailsClosedWithoutLeakingExceptions() throws Exception {
        var limiter = org.mockito.Mockito.mock(AuthRateLimiter.class);
        org.mockito.Mockito.doThrow(new org.springframework.transaction.CannotCreateTransactionException("secret connection details"))
                .when(limiter).consume(org.mockito.ArgumentMatchers.anyString(), org.mockito.ArgumentMatchers.anyString(),
                        org.mockito.ArgumentMatchers.anyInt(), org.mockito.ArgumentMatchers.anyLong());
        var request = new MockHttpServletRequest("POST", "/auth/login");
        request.setServletPath("/auth/login");
        request.setRemoteAddr("192.0.2.1");
        var response = new MockHttpServletResponse();
        new AuthRateLimitFilter(limiter, new ClientIpResolver("")).doFilter(request, response,
                (req, res) -> { throw new AssertionError("Authentication must not run when the limiter is unavailable"); });
        assertThat(response.getStatus()).isEqualTo(503);
        assertThat(response.getContentAsString()).doesNotContain("secret", "connection", "Exception");
    }
    @Test void unavailableSessionStorageFailsClosedWithoutLeakingExceptions() throws Exception {
        var jwt = new JwtService(randomKey(), 900000, valid());
        var users = org.mockito.Mockito.mock(com.groover.user.UserRepository.class);
        org.mockito.Mockito.when(users.findActiveSessionUser(org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any()))
                .thenThrow(new org.springframework.dao.DataAccessResourceFailureException("secret database details"));
        var request = new MockHttpServletRequest("GET", "/auth/me");
        request.addHeader("Authorization", "Bearer " + jwt.issue(UUID.randomUUID(), UUID.randomUUID()));
        var response = new MockHttpServletResponse();
        new com.groover.auth.JwtAuthenticationFilter(jwt, users).doFilter(request, response,
                (req, res) -> { throw new AssertionError("Protected API must not run without session verification"); });
        assertThat(response.getStatus()).isEqualTo(503);
        assertThat(response.getContentAsString()).doesNotContain("secret", "database", "Exception");
    }
}
