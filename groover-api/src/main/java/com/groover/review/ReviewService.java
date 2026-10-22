package com.groover.review;

import com.groover.review.dto.AuthorResponse;
import com.groover.review.dto.CommentResponse;
import com.groover.review.dto.FeedResponse;
import com.groover.review.dto.LikeResponse;
import com.groover.review.dto.ReviewMetadata;
import com.groover.review.dto.ReviewRequest;
import com.groover.review.dto.ReviewResponse;
import com.groover.review.dto.TagResponse;
import com.groover.user.*;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.text.Normalizer;
import java.time.Instant;
import java.util.*;
import org.springframework.security.authentication.AuthenticationCredentialsNotFoundException;
import org.springframework.security.core.context.SecurityContextHolder;

@Service @RequiredArgsConstructor
public class ReviewService {
    private final ReviewRepository reviews; private final ReviewLikeRepository likes;
    private final CommentRepository comments; private final UserRepository users;

    @Transactional
    public ReviewResponse create(User author, ReviewRequest req) {
        requireUser(author);
        var m = meta(req); String excerpt = valueOr(req.excerpt(), excerpt(req.content()));
        Review review = new Review(author, req.title(), req.content(), slug(req.title()), excerpt, req.previewImage(),
                m.productName(), m.storeName(), m.price(), m.rating(), m.purchaseStatus(), req.tags(), req.publish());
        return response(reviews.save(review), author.getId());
    }
    @Transactional
    public ReviewResponse update(UUID id, User user, ReviewRequest req) {
        Review r = owned(id, user); var m = meta(req);
        r.update(req.title(), req.content(), valueOr(req.excerpt(), excerpt(req.content())), req.previewImage(),
                m.productName(), m.storeName(), m.price(), m.rating(), m.purchaseStatus(), req.tags());
        if (req.publish()) r.publish(true);
        return response(r, user.getId());
    }
    @Transactional public void delete(UUID id, User user) { reviews.delete(owned(id, user)); }
    @Transactional public ReviewResponse publish(UUID id, User user, boolean publish) {
        Review r = owned(id, user); r.publish(publish); return response(r, user.getId());
    }
    @Transactional(readOnly = true)
    public FeedResponse feed(int page, int limit, String sort, User user) {
        Sort ordering = "popular".equals(sort) ? Sort.by(Sort.Direction.DESC, "likeCount", "viewCount") : Sort.by(Sort.Direction.DESC, "publishedAt");
        Page<Review> result = reviews.findByStatus(ReviewStatus.PUBLISHED, PageRequest.of(Math.max(page, 0), limit(limit), ordering));
        return new FeedResponse(responses(result.getContent(), id(user)),
                result.hasNext() ? String.valueOf(page + 1) : null, result.hasNext());
    }
    @Transactional(readOnly = true)
    public FeedResponse feedByTag(String tag, int page, int limit, User user) {
        Page<Review> result = reviews.findPublishedByTag(tag, PageRequest.of(Math.max(page, 0), limit(limit), Sort.by("publishedAt").descending()));
        return new FeedResponse(responses(result.getContent(), id(user)),
                result.hasNext() ? String.valueOf(page + 1) : null, result.hasNext());
    }
    @Transactional
    public ReviewResponse get(String slugOrId, User user) {
        Review r;
        try { r = reviews.findLockedById(UUID.fromString(slugOrId)).orElseThrow(this::missing); }
        catch (IllegalArgumentException e) { r = reviews.findLockedBySlug(slugOrId).orElseThrow(this::missing); }
        readable(r, user);
        r.increaseViews(); return response(r, id(user));
    }
    @Transactional(readOnly = true) public FeedResponse mine(User user, int page, int limit, boolean draftsOnly) {
        requireUser(user);
        Page<Review> result = reviews.findByAuthorId(user.getId(), PageRequest.of(Math.max(0, page), limit(limit), Sort.by("createdAt").descending()));
        List<ReviewResponse> items = responses(result.getContent().stream()
                .filter(r -> !draftsOnly || r.getStatus() == ReviewStatus.DRAFT).toList(), user.getId());
        return new FeedResponse(items, result.hasNext() ? String.valueOf(page + 1) : null, result.hasNext());
    }
    @Transactional public LikeResponse toggleLike(UUID id, User user) {
        requireUser(user);
        Review r = reviews.findLockedById(id).orElseThrow(this::missing);
        readable(r, user);
        boolean liked = likes.existsByReviewIdAndUserId(id, user.getId());
        if (liked) { likes.deleteByReviewIdAndUserId(id, user.getId()); r.decreaseLikes(); }
        else { likes.save(new ReviewLike(r, user)); r.increaseLikes(); }
        return new LikeResponse(!liked, r.getLikeCount());
    }
    @Transactional(readOnly = true) public List<CommentResponse> comments(UUID reviewId, User user) {
        readable(reviews.findById(reviewId).orElseThrow(this::missing), user);
        return comments.findByReviewIdOrderByCreatedAtAsc(reviewId).stream().map(this::comment).toList();
    }
    @Transactional public CommentResponse addComment(UUID reviewId, User user, String content) {
        requireUser(user);
        Review r = reviews.findLockedById(reviewId).orElseThrow(this::missing);
        readable(r, user); r.increaseComments();
        return comment(comments.save(new Comment(r, user, content)));
    }
    @Transactional public void deleteComment(UUID id, User user) {
        requireUser(user);
        Comment c = comments.findById(id).orElseThrow(() -> new EntityNotFoundException("댓글을 찾을 수 없습니다."));
        if (!c.getAuthor().getId().equals(user.getId())) throw new AccessDeniedException("본인의 댓글만 삭제할 수 있습니다.");
        Review review = reviews.findLockedById(c.getReview().getId()).orElseThrow(this::missing);
        review.decreaseComments(); comments.delete(c);
    }
    @Transactional(readOnly = true) public List<ReviewResponse> search(String query, int limit, User user) {
        if (query == null || query.isBlank()) return List.of();
        if (query.length() > 200) throw new IllegalArgumentException("검색어는 200자 이하여야 합니다.");
        return responses(reviews.search(query.trim(), PageRequest.of(0, limit(limit))), id(user));
    }
    @Transactional(readOnly = true) public List<TagResponse> popularTags(int limit) {
        return reviews.popularTags(PageRequest.of(0, limit(limit))).stream()
                .map(v -> new TagResponse((String) v[0], ((Number) v[1]).longValue())).toList();
    }
    private Review owned(UUID id, User user) { requireUser(user); Review r = reviews.findLockedById(id).orElseThrow(this::missing); if (!r.getAuthor().getId().equals(user.getId())) throw new AccessDeniedException("본인의 리뷰만 변경할 수 있습니다."); return r; }
    private void readable(Review review, User user) {
        if (review.getStatus() == ReviewStatus.PUBLISHED) return;
        requireUser(user);
        if (!review.getAuthor().getId().equals(user.getId())) throw new AccessDeniedException("접근 권한이 없습니다.");
    }
    private void requireUser(User user) {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        if (user == null || authentication == null || !authentication.isAuthenticated()
                || !(authentication.getPrincipal() instanceof User principal))
            throw new AuthenticationCredentialsNotFoundException("인증이 필요합니다.");
        if (!principal.getId().equals(user.getId())) throw new AccessDeniedException("접근 권한이 없습니다.");
    }
    private int limit(int value) { return Math.max(1, Math.min(value, 50)); }
    /** Populate page-level attributes in bulk; do not join-fetch collections while paginating. */
    private List<ReviewResponse> responses(List<Review> rows, UUID viewer) {
        if (rows.isEmpty()) return List.of();
        List<UUID> ids = rows.stream().map(Review::getId).toList();
        Map<UUID, Set<String>> tags = new HashMap<>();
        for (Object[] row : reviews.findTagsByReviewIds(ids)) {
            tags.computeIfAbsent((UUID) row[0], ignored -> new LinkedHashSet<>()).add((String) row[1]);
        }
        Set<UUID> liked = viewer == null ? Set.of() :
                new HashSet<>(likes.findLikedReviewIds(viewer, ids));
        return rows.stream().map(r -> response(r,
                tags.getOrDefault(r.getId(), Set.of()), liked.contains(r.getId()))).toList();
    }
    private ReviewResponse response(Review r, UUID viewer) {
        return response(r, new LinkedHashSet<>(r.getTags()),
                viewer != null && likes.existsByReviewIdAndUserId(r.getId(), viewer));
    }
    private ReviewResponse response(Review r, Set<String> tags, boolean liked) {
        var metadata = new ReviewMetadata(r.getProductName(), r.getStoreName(), r.getPrice(), r.getRating(), r.getPurchaseStatus());
        var author = new AuthorResponse(r.getAuthor().getId().toString(), r.getAuthor().getName(), r.getAuthor().getProfileImageUrl());
        return new ReviewResponse(r.getId().toString(), r.getTitle(), r.getContent(), r.getSlug(), r.getExcerpt(), r.getPreviewImage(),
                new LinkedHashSet<>(tags), metadata, author, r.getViewCount(), r.getLikeCount(), r.getCommentCount(), liked,
                r.getStatus().name(), r.getPublishedAt(), r.getCreatedAt(), r.getUpdatedAt());
    }
    private CommentResponse comment(Comment c) { return new CommentResponse(c.getId().toString(), c.getContent(), new AuthorResponse(c.getAuthor().getId().toString(), c.getAuthor().getName(), c.getAuthor().getProfileImageUrl()), c.getCreatedAt(), c.getUpdatedAt()); }
    private ReviewMetadata meta(ReviewRequest req) { return req.metadata() == null ? new ReviewMetadata(null,null,null,null,null) : req.metadata(); }
    private UUID id(User user) { return user == null ? null : user.getId(); }
    private EntityNotFoundException missing() { return new EntityNotFoundException("리뷰를 찾을 수 없습니다."); }
    private String valueOr(String value, String fallback) { return value == null || value.isBlank() ? fallback : value; }
    private String excerpt(String content) { String text = content.replaceAll("<[^>]+>|!\\[[^]]*]\\([^)]*\\)", "").replaceAll("\\s+", " ").trim(); return text.substring(0, Math.min(150, text.length())); }
    private String slug(String title) { String base = Normalizer.normalize(title, Normalizer.Form.NFKC).toLowerCase().replaceAll("[^\\p{L}\\p{N}]+", "-").replaceAll("(^-|-$)", ""); if (base.isBlank()) base = "review"; return base.substring(0, Math.min(60, base.length())) + "-" + UUID.randomUUID().toString().substring(0, 8); }
}
