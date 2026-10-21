package com.groover;

import com.groover.review.Review;
import com.groover.review.ReviewRepository;
import com.groover.review.ReviewService;
import com.groover.user.User;
import com.groover.user.UserRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.EntityManagerFactory;
import java.util.Set;
import java.util.UUID;
import org.hibernate.SessionFactory;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.support.TransactionTemplate;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Detects page-level N+1 regressions using the prepared SQL statement count.
 * H2 is used by this integration test; perform production-like k6 benchmarks
 * on isolated PostgreSQL rather than treating this count as a latency metric.
 */
@SpringBootTest(properties = "spring.jpa.properties.hibernate.generate_statistics=true")
class ReviewFeedQueryCountTests {
    @Autowired ReviewService service;
    @Autowired UserRepository users;
    @Autowired ReviewRepository reviews;
    @Autowired TransactionTemplate tx;
    @Autowired EntityManager em;
    @Autowired EntityManagerFactory emf;

    private String marker;

    private void seed(int count) {
        marker = UUID.randomUUID().toString();
        tx.executeWithoutResult(status -> {
            User author = users.save(new User("perf_" + marker.substring(0, 8),
                    "perf_" + marker + "@example.invalid", "fixture-password-hash", "Performance fixture"));
            for (int i = 0; i < count; i++) {
                reviews.save(new Review(author, "Perf review " + i,
                        "Fixture review content for SQL count comparison.",
                        "perf-" + marker + "-" + i,
                        null, null, null, null, null, 5, null,
                        Set.of("tag-a", "tag-b"), true));
            }
        });
    }

    private long selectCount(int limit) {
        return tx.execute(status -> {
            em.clear();
            var stats = emf.unwrap(SessionFactory.class).getStatistics();
            stats.clear();
            var feed = service.feed(0, limit, "latest", null);
            assertThat(feed.items()).hasSize(limit);
            assertThat(feed.items()).allSatisfy(item ->
                    assertThat(item.tags()).containsExactlyInAnyOrder("tag-a", "tag-b"));
            return stats.getPrepareStatementCount();
        });
    }

    @Test
    void feedSqlCountDoesNotGrowWithPageSize() {
        seed(15);
        long single = selectCount(1);
        long fifteen = selectCount(15);
        // One page query, count query and a single bulk tag query (plus minor provider overhead).
        // The threshold allows provider differences while failing old per-row tag lookups.
        assertThat(fifteen).as("SQL count for 15 reviews").isLessThanOrEqualTo(single + 3);
        assertThat(fifteen).isLessThanOrEqualTo(8);
    }

    @AfterEach
    void cleanup() {
        if (marker == null) return;
        tx.executeWithoutResult(status -> {
            var items = reviews.findAll().stream()
                    .filter(r -> r.getSlug().startsWith("perf-" + marker)).toList();
            items.forEach(reviews::delete);
            // Review cleanup is cascaded only where configured; fixture DB is isolated.
            users.findAll().stream()
                    .filter(u -> u.getEmail().equals("perf_" + marker + "@example.invalid"))
                    .forEach(users::delete);
        });
    }
}
