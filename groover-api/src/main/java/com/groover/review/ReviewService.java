package com.groover.review;

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

@Service @RequiredArgsConstructor
public class ReviewService {
    private final ReviewRepository reviews; private final ReviewLikeRepository likes;
    private final CommentRepository comments; private final UserRepository users;

    @Transactional
    public ReviewDtos.ReviewResponse create(User author, ReviewDtos.ReviewRequest req) {
        var m = meta(req); String excerpt = valueOr(req.excerpt(), excerpt(req.content()));
        Review review = new Review(author, req.title(), req.content(), slug(req.title()), excerpt, req.previewImage(),
                m.productName(), m.storeName(), m.price(), m.rating(), m.purchaseStatus(), req.tags(), req.publish());
        return response(reviews.save(review), author.getId());
    }
    @Transactional
    public ReviewDtos.ReviewResponse update(UUID id, User user, ReviewDtos.ReviewRequest req) {
        Review r = owned(id, user); var m = meta(req);
        r.update(req.title(), req.content(), valueOr(req.excerpt(), excerpt(req.content())), req.previewImage(),
                m.productName(), m.storeName(), m.price(), m.rating(), m.purchaseStatus(), req.tags());
        if (req.publish()) r.publish(true);
        return response(r, user.getId());
    }
    @Transactional public void delete(UUID id, User user) { reviews.delete(owned(id, user)); }
    @Transactional public ReviewDtos.ReviewResponse publish(UUID id, User user, boolean publish) {
        Review r = owned(id, user); r.publish(publish); return response(r, user.getId());
    }
    @Transactional(readOnly = true)
    public ReviewDtos.FeedResponse feed(int page, int limit, String sort, User user) {
        Sort ordering = "popular".equals(sort) ? Sort.by(Sort.Direction.DESC, "likeCount", "viewCount") : Sort.by(Sort.Direction.DESC, "publishedAt");
        Page<Review> result = reviews.findByStatus(ReviewStatus.PUBLISHED, PageRequest.of(Math.max(page, 0), Math.min(limit, 50), ordering));
        return new ReviewDtos.FeedResponse(result.stream().map(r -> response(r, id(user))).toList(),
                result.hasNext() ? String.valueOf(page + 1) : null, result.hasNext());
    }
    @Transactional(readOnly = true)
    public ReviewDtos.FeedResponse feedByTag(String tag, int page, int limit, User user) {
        Page<Review> result = reviews.findPublishedByTag(tag, PageRequest.of(Math.max(page, 0), Math.min(limit, 50), Sort.by("publishedAt").descending()));
        return new ReviewDtos.FeedResponse(result.stream().map(r -> response(r, id(user))).toList(),
                result.hasNext() ? String.valueOf(page + 1) : null, result.hasNext());
    }
    @Transactional
    public ReviewDtos.ReviewResponse get(String slugOrId, User user) {
        Review r;
        try { r = reviews.findWithAuthorById(UUID.fromString(slugOrId)).orElseThrow(this::missing); }
        catch (IllegalArgumentException e) { r = reviews.findBySlug(slugOrId).orElseThrow(this::missing); }
        if (r.getStatus() != ReviewStatus.PUBLISHED && (user == null || !r.getAuthor().getId().equals(user.getId()))) throw missing();
        r.increaseViews(); return response(r, id(user));
    }
    @Transactional(readOnly = true) public ReviewDtos.FeedResponse mine(User user, int page, int limit, boolean draftsOnly) {
        Page<Review> result = reviews.findByAuthorId(user.getId(), PageRequest.of(page, Math.min(limit, 50), Sort.by("createdAt").descending()));
        List<ReviewDtos.ReviewResponse> items = result.stream().filter(r -> !draftsOnly || r.getStatus() == ReviewStatus.DRAFT).map(r -> response(r, user.getId())).toList();
        return new ReviewDtos.FeedResponse(items, result.hasNext() ? String.valueOf(page + 1) : null, result.hasNext());
    }
    @Transactional public Map<String, Object> toggleLike(UUID id, User user) {
        Review r = reviews.findById(id).orElseThrow(this::missing);
        boolean liked = likes.existsByReviewIdAndUserId(id, user.getId());
        if (liked) { likes.deleteByReviewIdAndUserId(id, user.getId()); r.decreaseLikes(); }
        else { likes.save(new ReviewLike(r, user)); r.increaseLikes(); }
        return Map.of("liked", !liked, "likeCount", r.getLikeCount());
    }
    @Transactional(readOnly = true) public List<ReviewDtos.CommentResponse> comments(UUID reviewId) {
        return comments.findByReviewIdOrderByCreatedAtAsc(reviewId).stream().map(this::comment).toList();
    }
    @Transactional public ReviewDtos.CommentResponse addComment(UUID reviewId, User user, String content) {
        Review r = reviews.findById(reviewId).orElseThrow(this::missing); r.increaseComments();
        return comment(comments.save(new Comment(r, user, content)));
    }
    @Transactional public void deleteComment(UUID id, User user) {
        Comment c = comments.findById(id).orElseThrow(() -> new EntityNotFoundException("댓글을 찾을 수 없습니다."));
        if (!c.getAuthor().getId().equals(user.getId())) throw new AccessDeniedException("본인의 댓글만 삭제할 수 있습니다.");
        c.getReview().decreaseComments(); comments.delete(c);
    }
    @Transactional(readOnly = true) public List<ReviewDtos.ReviewResponse> search(String query, int limit, User user) {
        if (query == null || query.isBlank()) return List.of();
        return reviews.search(query.trim(), PageRequest.of(0, Math.min(limit, 50))).stream().map(r -> response(r, id(user))).toList();
    }
    @Transactional(readOnly = true) public List<Map<String, Object>> popularTags(int limit) {
        return reviews.popularTags(PageRequest.of(0, Math.min(limit, 50))).stream().map(v -> Map.<String,Object>of("name", v[0], "postCount", v[1])).toList();
    }
    private Review owned(UUID id, User user) { Review r = reviews.findWithAuthorById(id).orElseThrow(this::missing); if (!r.getAuthor().getId().equals(user.getId())) throw new AccessDeniedException("본인의 리뷰만 변경할 수 있습니다."); return r; }
    private ReviewDtos.ReviewResponse response(Review r, UUID viewer) {
        var metadata = new ReviewDtos.Metadata(r.getProductName(), r.getStoreName(), r.getPrice(), r.getRating(), r.getPurchaseStatus());
        var author = new ReviewDtos.Author(r.getAuthor().getId().toString(), r.getAuthor().getName(), r.getAuthor().getProfileImageUrl());
        boolean liked = viewer != null && likes.existsByReviewIdAndUserId(r.getId(), viewer);
        return new ReviewDtos.ReviewResponse(r.getId().toString(), r.getTitle(), r.getContent(), r.getSlug(), r.getExcerpt(), r.getPreviewImage(),
                r.getTags(), metadata, author, r.getViewCount(), r.getLikeCount(), r.getCommentCount(), liked,
                r.getStatus().name(), r.getPublishedAt(), r.getCreatedAt(), r.getUpdatedAt());
    }
    private ReviewDtos.CommentResponse comment(Comment c) { return new ReviewDtos.CommentResponse(c.getId().toString(), c.getContent(), new ReviewDtos.Author(c.getAuthor().getId().toString(), c.getAuthor().getName(), c.getAuthor().getProfileImageUrl()), c.getCreatedAt(), c.getUpdatedAt()); }
    private ReviewDtos.Metadata meta(ReviewDtos.ReviewRequest req) { return req.metadata() == null ? new ReviewDtos.Metadata(null,null,null,null,null) : req.metadata(); }
    private UUID id(User user) { return user == null ? null : user.getId(); }
    private EntityNotFoundException missing() { return new EntityNotFoundException("리뷰를 찾을 수 없습니다."); }
    private String valueOr(String value, String fallback) { return value == null || value.isBlank() ? fallback : value; }
    private String excerpt(String content) { String text = content.replaceAll("<[^>]+>|!\\[[^]]*]\\([^)]*\\)", "").replaceAll("\\s+", " ").trim(); return text.substring(0, Math.min(150, text.length())); }
    private String slug(String title) { String base = Normalizer.normalize(title, Normalizer.Form.NFKC).toLowerCase().replaceAll("[^\\p{L}\\p{N}]+", "-").replaceAll("(^-|-$)", ""); if (base.isBlank()) base = "review"; return base.substring(0, Math.min(60, base.length())) + "-" + UUID.randomUUID().toString().substring(0, 8); }
}
