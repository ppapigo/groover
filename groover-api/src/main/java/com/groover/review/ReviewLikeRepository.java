package com.groover.review;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.Collection;
import java.util.List;
import java.util.UUID;

public interface ReviewLikeRepository extends JpaRepository<ReviewLike, ReviewLikeId> {
    @Query("select l.review.id from ReviewLike l where l.user.id = :userId and l.review.id in :reviewIds")
    List<UUID> findLikedReviewIds(@Param("userId") UUID userId, @Param("reviewIds") Collection<UUID> reviewIds);

    boolean existsByReviewIdAndUserId(UUID reviewId, UUID userId);
    void deleteByReviewIdAndUserId(UUID reviewId, UUID userId);
}
