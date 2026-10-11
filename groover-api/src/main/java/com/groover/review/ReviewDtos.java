package com.groover.review;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.*;

public final class ReviewDtos {
    private ReviewDtos() {}
    public record ReviewRequest(@NotBlank @Size(max=200) String title, @NotBlank @Size(min=10, max=50000) String content,
            @Size(max=10) Set<@Size(max=40) String> tags, @Size(max=500) String previewImage, @Size(max=300) String excerpt,
            Metadata metadata, boolean publish) {}
    public record Metadata(@Size(max=120) String productName, @Size(max=100) String storeName,
            @PositiveOrZero BigDecimal price, @Min(1) @Max(5) Integer rating, @Size(max=30) String purchaseStatus) {}
    public record Author(String id, String name, String profileImageUrl) {}
    public record ReviewResponse(String id, String title, String content, String slug, String excerpt, String previewImage,
            Set<String> tags, Metadata metadata, Author author, int viewCount, int likeCount, int commentCount,
            boolean liked, String status, Instant publishedAt, Instant createdAt, Instant updatedAt) {}
    public record FeedResponse(List<ReviewResponse> items, String nextCursor, boolean hasMore) {}
    public record CommentRequest(@NotBlank @Size(max=2000) String content) {}
    public record CommentResponse(String id, String content, Author author, Instant createdAt, Instant updatedAt) {}
}
