package com.groover;

import com.groover.review.Review;
import com.groover.user.User;
import jakarta.persistence.EntityManager;
import jakarta.servlet.DispatcherType;
import jakarta.servlet.RequestDispatcher;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class GrooverApplicationTests {
    @Autowired EntityManager entityManager;
    @Autowired MockMvc mockMvc;

    @Test void contextLoads() { }

    @Test
    void serverErrorDispatchDoesNotBecomeAnAuthenticationFailure() throws Exception {
        mockMvc.perform(get("/error").with(request -> {
                            request.setDispatcherType(DispatcherType.ERROR);
                            return request;
                        })
                        .requestAttr(RequestDispatcher.ERROR_STATUS_CODE, 500)
                        .accept("application/json"))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.status").value(500));
    }

    @Test
    void frontendCanReadReviewFeed() throws Exception {
        mockMvc.perform(get("/blog/feed").header("Origin", "http://localhost:3001"))
                .andExpect(status().isOk())
                .andExpect(header().string("Access-Control-Allow-Origin", "http://localhost:3001"));
    }

    @Test
    void frontendLoginPreflightIsAllowedWithoutAuthentication() throws Exception {
        mockMvc.perform(options("/auth/login")
                        .header("Origin", "http://localhost:3001")
                        .header("Access-Control-Request-Method", "POST")
                        .header("Access-Control-Request-Headers", "content-type"))
                .andExpect(status().isOk())
                .andExpect(header().string("Access-Control-Allow-Origin", "http://localhost:3001"))
                .andExpect(header().string("Access-Control-Allow-Methods", containsString("POST")))
                .andExpect(header().string("Access-Control-Allow-Headers", containsString("content-type")));
    }

    @Test
    void unconfiguredOriginIsRejected() throws Exception {
        mockMvc.perform(options("/auth/login")
                        .header("Origin", "http://localhost:9999")
                        .header("Access-Control-Request-Method", "POST"))
                .andExpect(status().isForbidden())
                .andExpect(header().doesNotExist("Access-Control-Allow-Origin"));
    }

    @ParameterizedTest
    @NullSource
    @ValueSource(ints = {1, 5})
    @Transactional
    void reviewRatingRoundTripsThroughMigratedSchema(Integer rating) {
        User author = new User("rating-test", "rating@example.com", "test-hash", "Rating test");
        entityManager.persist(author);
        Review review = new Review(author, "Rating test", "Content", "rating-test", null,
                null, null, null, null, rating, null, Set.of(), false);
        entityManager.persist(review);
        entityManager.flush();
        entityManager.clear();

        assertThat(entityManager.find(Review.class, review.getId()).getRating()).isEqualTo(rating);
    }
}
