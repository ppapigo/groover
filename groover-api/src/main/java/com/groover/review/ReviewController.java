package com.groover.review;

import com.groover.common.dto.ApiResponse;
import com.groover.review.dto.CommentRequest;
import com.groover.review.dto.CommentResponse;
import com.groover.review.dto.FeedResponse;
import com.groover.review.dto.LikeResponse;
import com.groover.review.dto.PublishReviewRequest;
import com.groover.review.dto.ReviewRequest;
import com.groover.review.dto.ReviewResponse;
import com.groover.review.dto.SearchResponse;
import com.groover.review.dto.TagResponse;
import com.groover.user.User;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.UUID;

@RestController @RequiredArgsConstructor
public class ReviewController {
    private final ReviewService service;
    @PostMapping("/blog/posts") @ResponseStatus(HttpStatus.CREATED) ApiResponse<ReviewResponse> create(@AuthenticationPrincipal User u, @Valid @RequestBody ReviewRequest r) { return ApiResponse.created(service.create(u, r)); }
    @PutMapping("/blog/posts/{id}") ApiResponse<ReviewResponse> update(@PathVariable UUID id, @AuthenticationPrincipal User u, @Valid @RequestBody ReviewRequest r) { return ApiResponse.ok(service.update(id, u, r)); }
    @DeleteMapping("/blog/posts/{id}") @ResponseStatus(HttpStatus.NO_CONTENT) void delete(@PathVariable UUID id, @AuthenticationPrincipal User u) { service.delete(id, u); }
    @PostMapping("/blog/posts/{id}/publish") ApiResponse<ReviewResponse> publish(@PathVariable UUID id, @AuthenticationPrincipal User u, @Valid @RequestBody PublishReviewRequest request) { return ApiResponse.ok(service.publish(id, u, request.isPublish())); }
    @GetMapping("/blog/feed") ApiResponse<FeedResponse> feed(@RequestParam(required=false) String cursor, @RequestParam(defaultValue="20") int limit, @AuthenticationPrincipal User u) { return ApiResponse.ok(service.feed(page(cursor), limit, "latest", u)); }
    @GetMapping("/blog/feed/popular") ApiResponse<FeedResponse> popular(@RequestParam(required=false) String cursor, @RequestParam(defaultValue="20") int limit, @AuthenticationPrincipal User u) { return ApiResponse.ok(service.feed(page(cursor), limit, "popular", u)); }
    @GetMapping("/blog/feed/tag/{tag}") ApiResponse<FeedResponse> tagFeed(@PathVariable String tag, @RequestParam(required=false) String cursor, @RequestParam(defaultValue="20") int limit, @AuthenticationPrincipal User u) { return ApiResponse.ok(service.feedByTag(tag, page(cursor), limit, u)); }
    @GetMapping("/blog/posts/{slug}") ApiResponse<ReviewResponse> get(@PathVariable String slug, @AuthenticationPrincipal User u) { return ApiResponse.ok(service.get(slug, u)); }
    @GetMapping("/blog/my-posts") ApiResponse<FeedResponse> mine(@RequestParam(defaultValue="0") int page, @RequestParam(defaultValue="20") int limit, @AuthenticationPrincipal User u) { return ApiResponse.ok(service.mine(u,page,limit,false)); }
    @GetMapping("/blog/my-drafts") ApiResponse<List<ReviewResponse>> drafts(@AuthenticationPrincipal User u) { return ApiResponse.ok(service.mine(u,0,50,true).items()); }
    @PostMapping("/blog/posts/{id}/like") ApiResponse<LikeResponse> like(@PathVariable UUID id, @AuthenticationPrincipal User u) { return ApiResponse.ok(service.toggleLike(id,u)); }
    @GetMapping("/blog/posts/{id}/comments") ApiResponse<List<CommentResponse>> comments(@PathVariable UUID id, @AuthenticationPrincipal User u) { return ApiResponse.ok(service.comments(id, u)); }
    @PostMapping("/blog/posts/{id}/comments") ApiResponse<CommentResponse> comment(@PathVariable UUID id, @AuthenticationPrincipal User u, @Valid @RequestBody CommentRequest r) { return ApiResponse.created(service.addComment(id,u,r.content())); }
    @DeleteMapping("/blog/comments/{id}") @ResponseStatus(HttpStatus.NO_CONTENT) void deleteComment(@PathVariable UUID id, @AuthenticationPrincipal User u) { service.deleteComment(id,u); }
    @GetMapping("/search") SearchResponse search(@RequestParam("q") String query, @RequestParam(defaultValue="20") int limit, @AuthenticationPrincipal User u) { return new SearchResponse(service.search(query,limit,u)); }
    @GetMapping("/blog/tags/popular") ApiResponse<List<TagResponse>> popularTags(@RequestParam(defaultValue="10") int limit) { return ApiResponse.ok(service.popularTags(limit)); }
    @GetMapping("/tags/feed/popular") ApiResponse<List<TagResponse>> popularFeedTags(@RequestParam(defaultValue="10") int limit) { return ApiResponse.ok(service.popularTags(limit)); }
    @GetMapping("/tags/free/search") ApiResponse<List<TagResponse>> tagSearch(@RequestParam("q") String q, @RequestParam(defaultValue="10") int limit) { return ApiResponse.ok(service.popularTags(50).stream().filter(t -> t.name().contains(q)).limit(Math.max(1, Math.min(limit, 50))).toList()); }
    private int page(String cursor) { try { return cursor == null ? 0 : Math.max(0, Integer.parseInt(cursor)); } catch (NumberFormatException e) { return 0; } }
}
