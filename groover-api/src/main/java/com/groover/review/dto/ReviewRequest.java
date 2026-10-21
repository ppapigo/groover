package com.groover.review.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.Set;

public record ReviewRequest(
        @NotBlank @Size(max = 200) String title,
        @NotBlank @Size(min = 10, max = 50000) String content,
        @Size(max = 10) Set<@Size(max = 40) String> tags,
        @Size(max = 500) String previewImage,
        @Size(max = 300) String excerpt,
        @Valid ReviewMetadata metadata,
        boolean publish) {}
