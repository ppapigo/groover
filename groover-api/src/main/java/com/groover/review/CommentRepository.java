package com.groover.review;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.EntityGraph;
import java.util.*;

public interface CommentRepository extends JpaRepository<Comment, UUID> {
    @EntityGraph(attributePaths = "author") List<Comment> findByReviewIdOrderByCreatedAtAsc(UUID reviewId);
}
