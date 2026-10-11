package com.groover.review;

import org.springframework.data.domain.*;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import java.util.*;

public interface ReviewRepository extends JpaRepository<Review, UUID> {
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
