package com.groover;

import com.fasterxml.jackson.databind.JsonNode;
import com.groover.review.Review;
import com.groover.review.ReviewRepository;
import com.groover.user.User;
import com.groover.user.UserRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.*;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.Map;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
        "server.servlet.context-path=/v1",
        "spring.datasource.url=jdbc:h2:mem:review-http;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DEFAULT_NULL_ORDERING=HIGH"
})
class ReviewHttpTests {
    @Autowired TestRestTemplate http;
    @Autowired TransactionTemplate transactions;
    @Autowired UserRepository users;
    @Autowired ReviewRepository reviews;
    @Autowired PasswordEncoder encoder;

    @BeforeEach
    void seedCommittedReview() {
        AuthTestSupport.enableCsrf(http);
        transactions.executeWithoutResult(status -> {
            User author = users.save(new User("http_reviewer", "http@example.com",
                    encoder.encode("test-password-123"), "HTTP reviewer"));
            reviews.save(new Review(author, "HTTP review", "A published review for HTTP tests.", "http-review",
                    null, null, null, null, null, 5, null, Set.of("http-tag"), true));
        });
    }

    @AfterEach
    void cleanTestDatabase() {
        transactions.executeWithoutResult(status -> {
            reviews.deleteAll();
            users.deleteAll();
        });
    }

    @ParameterizedTest
    @ValueSource(strings = {"/blog/feed", "/blog/feed/popular", "/blog/feed/tag/http-tag",
            "/blog/posts/http-review", "/search?q=HTTP"})
    void publishedReviewsIncludeTagsWithoutLogin(String path) {
        var response = http.getForEntity(path, JsonNode.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().findValues("tags"))
                .anySatisfy(tags -> assertThat(tags.toString()).isEqualTo("[\"http-tag\"]"));
    }

    @Test
    void signedInUserCanCreateEditPublishAndReadReviews() {
        HttpHeaders headers = login();

        var created = http.exchange("/blog/posts", HttpMethod.POST,
                new HttpEntity<>(reviewRequest("Initial review"), headers), JsonNode.class);
        assertThat(created.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        String id = created.getBody().path("data").path("id").asText();

        var edited = http.exchange("/blog/posts/" + id, HttpMethod.PUT,
                new HttpEntity<>(reviewRequest("Edited review"), headers), JsonNode.class);
        assertThat(edited.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(edited.getBody().path("data").path("title").asText()).isEqualTo("Edited review");

        for (String path : new String[]{"/auth/me", "/blog/my-posts", "/blog/my-drafts", "/blog/posts/" + id}) {
            var response = http.exchange(path, HttpMethod.GET, new HttpEntity<>(headers), JsonNode.class);
            assertThat(response.getStatusCode()).as(path).isEqualTo(HttpStatus.OK);
            if (!path.equals("/auth/me")) {
                assertThat(response.getBody().findValues("tags"))
                        .anySatisfy(tags -> assertThat(tags.toString()).isEqualTo("[\"http-tag\"]"));
            }
        }

        var published = http.exchange("/blog/posts/" + id + "/publish", HttpMethod.POST,
                new HttpEntity<>(Map.of("publish", true), headers), JsonNode.class);
        assertThat(published.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(published.getBody().path("data").path("status").asText()).isEqualTo("PUBLISHED");
        assertThat(http.getForEntity("/blog/posts/" + id, JsonNode.class).getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    @ParameterizedTest
    @ValueSource(strings = {"/blog/tags/popular", "/tags/feed/popular", "/tags/free/search?q=http"})
    void tagResponsesKeepTheirNamesAndNumericCounts(String path) {
        var response = http.getForEntity(path, JsonNode.class);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        var data = response.getBody().path("data");
        assertThat(data.isArray()).isTrue();
        assertThat(data.size()).isEqualTo(1);
        assertThat(data.get(0).size()).isEqualTo(2);
        assertThat(data.get(0).path("name").asText()).isEqualTo("http-tag");
        assertThat(data.get(0).path("postCount").isIntegralNumber()).isTrue();
        assertThat(data.get(0).path("postCount").asLong()).isEqualTo(1);
    }

    @Test
    void searchKeepsItsTopLevelPostsResponse() {
        var response = http.getForEntity("/search?q=HTTP", JsonNode.class);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().size()).isEqualTo(1);
        assertThat(response.getBody().path("posts").isArray()).isTrue();
        assertThat(response.getBody().path("posts").get(0).path("title").asText()).isEqualTo("HTTP review");
    }

    @Test
    void likeResponseKeepsItsBooleanAndCountWhenToggled() {
        HttpHeaders headers = login();
        var id = reviews.findAll().getFirst().getId();
        for (boolean expectedLiked : new boolean[]{true, false}) {
            var response = http.exchange("/blog/posts/" + id + "/like", HttpMethod.POST,
                    new HttpEntity<>(headers), JsonNode.class);
            assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
            var data = response.getBody().path("data");
            assertThat(data.size()).isEqualTo(2);
            assertThat(data.path("liked").isBoolean()).isTrue();
            assertThat(data.path("liked").asBoolean()).isEqualTo(expectedLiked);
            assertThat(data.path("likeCount").isIntegralNumber()).isTrue();
            assertThat(data.path("likeCount").asInt()).isEqualTo(expectedLiked ? 1 : 0);
        }
    }

    @ParameterizedTest
    @CsvSource({"{}, PUBLISHED", "{\"publish\":true}, PUBLISHED", "{\"publish\":false}, DRAFT"})
    void publishRequestPreservesItsDefaultAndExplicitValues(String body, String expectedStatus) {
        HttpHeaders headers = login();
        var created = http.exchange("/blog/posts", HttpMethod.POST,
                new HttpEntity<>(reviewRequest("Draft review"), headers), JsonNode.class);
        assertThat(created.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        String id = created.getBody().path("data").path("id").asText();
        headers.setContentType(MediaType.APPLICATION_JSON);
        var response = http.exchange("/blog/posts/" + id + "/publish", HttpMethod.POST,
                new HttpEntity<>(body, headers), JsonNode.class);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().path("data").path("status").asText()).isEqualTo(expectedStatus);
    }

    @ParameterizedTest
    @ValueSource(strings = {"{\"publish\":null}", "{\"publish\":{}}"})
    void invalidPublishValuesAreBadRequests(String body) {
        HttpHeaders headers = login();
        headers.setContentType(MediaType.APPLICATION_JSON);
        var id = reviews.findAll().getFirst().getId();
        var response = http.exchange("/blog/posts/" + id + "/publish", HttpMethod.POST,
                new HttpEntity<>(body, headers), JsonNode.class);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody().path("success").asBoolean()).isFalse();
        assertThat(response.getBody().path("message").asText()).isEqualTo("입력값을 확인해주세요.");
        assertThat(reviews.findById(id).orElseThrow().getStatus().name()).isEqualTo("PUBLISHED");
    }

    @Test
    void malformedPublicRequestIsBadRequest() {
        var response = http.getForEntity("/blog/posts/not-a-uuid/comments", JsonNode.class);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody().path("success").asBoolean()).isFalse();
        assertThat(response.getBody().path("message").asText()).doesNotContain("인증");
    }

    @Test
    void privateRoutesStillRequireAValidToken() {
        assertThat(http.getForEntity("/blog/my-posts", JsonNode.class).getStatusCode())
                .isEqualTo(HttpStatus.UNAUTHORIZED);
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth("invalid-token");
        assertThat(http.exchange("/auth/me", HttpMethod.GET, new HttpEntity<>(headers), JsonNode.class).getStatusCode())
                .isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    private HttpHeaders login() {
        var response = http.postForEntity("/auth/login",
                Map.of("userId", "http_reviewer", "password", "test-password-123"), JsonNode.class);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(response.getBody().path("data").path("accessToken").asText());
        return headers;
    }

    private Map<String, Object> reviewRequest(String title) {
        return Map.of("title", title, "content", "A sufficiently detailed review for the HTTP test.",
                "tags", Set.of("http-tag"), "metadata", Map.of("rating", 5), "publish", false);
    }
}
