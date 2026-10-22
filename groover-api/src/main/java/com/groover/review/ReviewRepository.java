package com.groover.review;

import org.springframework.data.domain.*;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import java.util.*;
import jakarta.persistence.LockModeType;

public interface ReviewRepository extends JpaRepository<Review, UUID> {
    // Page rows first, then fetch all page tags in one query (avoids a collection-fetch pagination join).
    @Query("select r.id, tag from Review r join r.tags tag where r.id in :reviewIds")
    List<Object[]> findTagsByReviewIds(@Param("reviewIds") Collection<UUID> reviewIds);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select r from Review r where r.id = :id")
    Optional<Review> findLockedById(@Param("id") UUID id);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select r from Review r where r.slug = :slug")
    Optional<Review> findLockedBySlug(@Param("slug") String slug);
    @EntityGraph(attributePaths = "author") Optional<Review> findBySlug(String slug);
    @EntityGraph(attributePaths = "author") Optional<Review> findWithAuthorById(UUID id);
    @EntityGraph(attributePaths = "author") Page<Review> findByStatus(ReviewStatus status, Pageable pageable);
    @EntityGraph(attributePaths = "author")
    @Query("select distinct r from Review r join r.tags t where r.status = 'PUBLISHED' and lower(t) = lower(:tag)")
    Page<Review> findPublishedByTag(@Param("tag") String tag, Pageable pageable);
    @EntityGraph(attributePaths = "author") Page<Review> findByAuthorId(UUID authorId, Pageable pageable);
    @Query("select distinct r from Review r join fetch r.author left join r.tags t where r.status = 'PUBLISHED' and (lower(r.title) like lower(concat('%', :q, '%')) or lower(r.content) like lower(concat('%', :q, '%')) or lower(r.productName) like lower(concat('%', :q, '%')) or lower(t) like lower(concat('%', :q, '%')))")
    List<Review> search(@Param("q") String query, Pageable pageable);
    @Query("select t, count(r) from Review r join r.tags t where r.status = 'PUBLISHED' group by t order by count(r) desc")
    List<Object[]> popularTags(Pageable pageable);
}
