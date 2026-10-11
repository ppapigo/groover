package com.groover.review;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;

public interface ReviewLikeRepository extends JpaRepository<ReviewLike, ReviewLikeId> {
    boolean existsByReviewIdAndUserId(UUID reviewId, UUID userId);
    void deleteByReviewIdAndUserId(UUID reviewId, UUID userId);
}
