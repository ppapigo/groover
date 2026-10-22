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
 * Compatible with both main and the optimized branch.
 * Report prepared SQL statement counts; do not assert a fixed query count
 * because the baseline is intentionally expected to have N+1 reads.
 *
 * Run individually with:
 * mvn -Dtest=ReviewFeedSqlComparisonTests test
 */
@SpringBootTest(properties = "spring.jpa.properties.hibernate.generate_statistics=true")
class ReviewFeedSqlComparisonTests {
    @Autowired ReviewService service;
    @Autowired UserRepository users;
    @Autowired ReviewRepository reviews;
    @Autowired TransactionTemplate tx;
    @Autowired EntityManager em;
    @Autowired EntityManagerFactory emf;

    private String marker;

    private void seed() {
        marker = UUID.randomUUID().toString();
        tx.executeWithoutResult(status -> {
            User author = users.save(new User(
                    "sql_" + marker.substring(0, 8),
                    "sql_" + marker + "@example.invalid",
                    "fixture-password-hash", "SQL comparison fixture"));
            for (int i = 0; i < 20; i++) {
                reviews.save(new Review(author, "SQLPerfReview " + i,
                        "SQLPerfReview benchmark fixture content " + i,
                        "sql-perf-" + marker + "-" + i,
                        null, null, null, null, null, 5, null,
                        Set.of("tag-a", "tag-b"), true));
            }
        });
    }

    private long countStatements(String endpoint, int pageSize) {
        return tx.execute(status -> {
            em.clear();
            var statistics = emf.unwrap(SessionFactory.class).getStatistics();
            statistics.clear();

            if ("feed".equals(endpoint)) {
                var result = service.feed(0, pageSize, "latest", null);
                assertThat(result.items()).hasSize(pageSize);
                assertThat(result.items()).allSatisfy(item ->
                        assertThat(item.tags()).containsExactlyInAnyOrder("tag-a", "tag-b"));
            } else if ("popular".equals(endpoint)) {
                var result = service.feed(0, pageSize, "popular", null);
                assertThat(result.items()).hasSize(pageSize);
            } else {
                var result = service.search("SQLPerfReview", pageSize, null);
                assertThat(result).hasSize(pageSize);
            }

            long statements = statistics.getPrepareStatementCount();
            System.out.printf("SQL_COMPARE endpoint=%s pageSize=%d preparedStatements=%d%n",
                    endpoint, pageSize, statements);
            return statements;
        });
    }

    @Test
    void printSqlCountsForSmallAndFullPages() {
        seed();
        for (String endpoint : new String[]{"feed", "popular", "search"}) {
            long one = countStatements(endpoint, 1);
            long twenty = countStatements(endpoint, 20);
            System.out.printf("SQL_COMPARE_SUMMARY endpoint=%s one=%d twenty=%d delta=%d%n",
                    endpoint, one, twenty, twenty - one);
        }
    }

    @AfterEach
    void cleanup() {
        if (marker == null) return;
        tx.executeWithoutResult(status -> {
            var items = reviews.findAll().stream()
                    .filter(r -> r.getSlug().startsWith("sql-perf-" + marker)).toList();
            items.forEach(reviews::delete);
            users.findAll().stream()
                    .filter(u -> u.getEmail().equals("sql_" + marker + "@example.invalid"))
                    .forEach(users::delete);
        });
    }
}
