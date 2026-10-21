package com.groover.review.dto;

import java.util.List;

public record FeedResponse(List<ReviewResponse> items, String nextCursor, boolean hasMore) {}
