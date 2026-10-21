package com.groover.review.dto;

import java.time.Instant;

public record CommentResponse(String id, String content, AuthorResponse author, Instant createdAt, Instant updatedAt) {}
