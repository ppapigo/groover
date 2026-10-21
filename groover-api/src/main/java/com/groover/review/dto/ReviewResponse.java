package com.groover.review.dto;

import java.time.Instant;
import java.util.Set;

public record ReviewResponse(
        String id, String title, String content, String slug, String excerpt, String previewImage,
        Set<String> tags, ReviewMetadata metadata, AuthorResponse author,
        int viewCount, int likeCount, int commentCount, boolean liked, String status,
        Instant publishedAt, Instant createdAt, Instant updatedAt) {}
