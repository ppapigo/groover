package com.groover;

import com.fasterxml.jackson.databind.JsonNode;
import com.groover.review.ReviewRepository;
import com.groover.user.UserRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.*;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
        "server.servlet.context-path=/v1",
        "spring.datasource.url=jdbc:h2:mem:auth-http;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DEFAULT_NULL_ORDERING=HIGH"
})
class AuthHttpTests {
    @Autowired TestRestTemplate http;
    @Autowired TransactionTemplate transactions;
    @Autowired UserRepository users;
    @Autowired ReviewRepository reviews;

    @AfterEach
    void cleanTestDatabase() {
        transactions.executeWithoutResult(status -> {
            reviews.deleteAll();
            users.deleteAll();
        });
    }

    @Test
    void signupImmediatelyCreatesAnAccountAndAllowsAuthenticatedRequestsWithoutEmailVerification() {
        JsonNode account = register();
        String userId = account.path("user").path("id").asText();
        String token = account.path("accessToken").asText();
        assertThat(userId).isNotBlank();
        assertThat(token).isNotBlank();
        assertThat(users.existsByEmailIgnoreCase("signup@example.com")).isTrue();

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);
        var me = http.exchange("/auth/me", HttpMethod.GET, new HttpEntity<>(headers), JsonNode.class);
        assertThat(me.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(me.getBody().path("data").path("id").asText()).isEqualTo(userId);

        var review = http.exchange("/blog/posts", HttpMethod.POST, new HttpEntity<>(Map.of(
                "title", "My first review",
                "content", "A review written immediately after registration.",
                "publish", true), headers), JsonNode.class);
        assertThat(review.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(review.getBody().path("data").path("status").asText()).isEqualTo("PUBLISHED");
        assertThat(review.getBody().path("data").path("author").path("id").asText()).isEqualTo(userId);

        for (var identifier : Map.of("email", "signup@example.com", "userId", "signup_user").entrySet()) {
            var login = http.postForEntity("/auth/login", Map.of(
                    identifier.getKey(), identifier.getValue(), "password", "password123"), JsonNode.class);
            assertThat(login.getStatusCode()).as(identifier.getKey()).isEqualTo(HttpStatus.OK);
            assertThat(login.getBody().path("data").path("accessToken").asText()).isNotBlank();
            assertThat(login.getBody().path("data").path("user").path("id").asText()).isEqualTo(userId);
        }
    }

    @ParameterizedTest
    @ValueSource(strings = {"email", "userId"})
    void directSignupStillRejectsDuplicateAccounts(String duplicateField) {
        register();
        var response = http.postForEntity("/auth/register", Map.of(
                "userId", duplicateField.equals("userId") ? "signup_user" : "another_user",
                "email", duplicateField.equals("email") ? "SIGNUP@example.com" : "another@example.com",
                "password", "password123",
                "name", "Another user"), JsonNode.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody().path("success").asBoolean()).isFalse();
        assertThat(response.getBody().path("data").path("accessToken").isMissingNode()).isTrue();
        assertThat(users.count()).isEqualTo(1);
    }

    private JsonNode register() {
        var response = http.postForEntity("/auth/register", Map.of(
                "userId", "signup_user",
                "email", "signup@example.com",
                "password", "password123",
                "name", "New user"), JsonNode.class);
        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(response.getBody().path("success").asBoolean()).isTrue();
        assertThat(response.getBody().path("data").path("user").path("email").asText())
                .isEqualTo("signup@example.com");
        return response.getBody().path("data");
    }
}
