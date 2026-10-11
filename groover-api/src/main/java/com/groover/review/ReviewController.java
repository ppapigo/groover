package com.groover.review;

import com.groover.common.ApiResponse;
import com.groover.user.User;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController @RequiredArgsConstructor
public class ReviewController {
    private final ReviewService service;
    @PostMapping("/blog/posts") @ResponseStatus(HttpStatus.CREATED) ApiResponse<?> create(@AuthenticationPrincipal User u, @Valid @RequestBody ReviewDtos.ReviewRequest r) { return ApiResponse.created(service.create(u, r)); }
    @PutMapping("/blog/posts/{id}") ApiResponse<?> update(@PathVariable UUID id, @AuthenticationPrincipal User u, @Valid @RequestBody ReviewDtos.ReviewRequest r) { return ApiResponse.ok(service.update(id, u, r)); }
    @DeleteMapping("/blog/posts/{id}") @ResponseStatus(HttpStatus.NO_CONTENT) void delete(@PathVariable UUID id, @AuthenticationPrincipal User u) { service.delete(id, u); }
    @PostMapping("/blog/posts/{id}/publish") ApiResponse<?> publish(@PathVariable UUID id, @AuthenticationPrincipal User u, @RequestBody Map<String,Boolean> b) { return ApiResponse.ok(service.publish(id, u, b.getOrDefault("publish", true))); }
    @GetMapping("/blog/feed") ApiResponse<?> feed(@RequestParam(required=false) String cursor, @RequestParam(defaultValue="20") int limit, @AuthenticationPrincipal User u) { return ApiResponse.ok(service.feed(page(cursor), limit, "latest", u)); }
    @GetMapping("/blog/feed/popular") ApiResponse<?> popular(@RequestParam(required=false) String cursor, @RequestParam(defaultValue="20") int limit, @AuthenticationPrincipal User u) { return ApiResponse.ok(service.feed(page(cursor), limit, "popular", u)); }
    @GetMapping("/blog/feed/tag/{tag}") ApiResponse<?> tagFeed(@PathVariable String tag, @RequestParam(required=false) String cursor, @RequestParam(defaultValue="20") int limit, @AuthenticationPrincipal User u) { return ApiResponse.ok(service.feedByTag(tag, page(cursor), limit, u)); }
    @GetMapping("/blog/posts/{slug}") ApiResponse<?> get(@PathVariable String slug, @AuthenticationPrincipal User u) { return ApiResponse.ok(service.get(slug, u)); }
    @GetMapping("/blog/my-posts") ApiResponse<?> mine(@RequestParam(defaultValue="0") int page, @RequestParam(defaultValue="20") int limit, @AuthenticationPrincipal User u) { return ApiResponse.ok(service.mine(u,page,limit,false)); }
    @GetMapping("/blog/my-drafts") ApiResponse<?> drafts(@AuthenticationPrincipal User u) { return ApiResponse.ok(service.mine(u,0,50,true).items()); }
    @PostMapping("/blog/posts/{id}/like") ApiResponse<?> like(@PathVariable UUID id, @AuthenticationPrincipal User u) { return ApiResponse.ok(service.toggleLike(id,u)); }
    @GetMapping("/blog/posts/{id}/comments") ApiResponse<?> comments(@PathVariable UUID id) { return ApiResponse.ok(service.comments(id)); }
    @PostMapping("/blog/posts/{id}/comments") ApiResponse<?> comment(@PathVariable UUID id, @AuthenticationPrincipal User u, @Valid @RequestBody ReviewDtos.CommentRequest r) { return ApiResponse.created(service.addComment(id,u,r.content())); }
    @DeleteMapping("/blog/comments/{id}") @ResponseStatus(HttpStatus.NO_CONTENT) void deleteComment(@PathVariable UUID id, @AuthenticationPrincipal User u) { service.deleteComment(id,u); }
    @GetMapping("/search") Map<String,Object> search(@RequestParam("q") String query, @RequestParam(defaultValue="20") int limit, @AuthenticationPrincipal User u) { return Map.of("posts", service.search(query,limit,u)); }
    @GetMapping("/blog/tags/popular") ApiResponse<?> popularTags(@RequestParam(defaultValue="10") int limit) { return ApiResponse.ok(service.popularTags(limit)); }
    @GetMapping("/tags/feed/popular") ApiResponse<?> popularFeedTags(@RequestParam(defaultValue="10") int limit) { return ApiResponse.ok(service.popularTags(limit)); }
    @GetMapping("/tags/free/search") ApiResponse<?> tagSearch(@RequestParam("q") String q, @RequestParam(defaultValue="10") int limit) { return ApiResponse.ok(service.popularTags(50).stream().filter(t -> t.get("name").toString().contains(q)).limit(limit).toList()); }
    private int page(String cursor) { try { return cursor == null ? 0 : Math.max(0, Integer.parseInt(cursor)); } catch (NumberFormatException e) { return 0; } }
}
