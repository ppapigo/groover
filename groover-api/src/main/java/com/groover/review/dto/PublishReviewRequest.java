package com.groover.review.dto;

import com.fasterxml.jackson.annotation.JsonSetter;
import com.fasterxml.jackson.annotation.Nulls;

public final class PublishReviewRequest {
    // An omitted field retains the default; an explicit null is rejected by the setter.
    private boolean publish = true;

    public boolean isPublish() {
        return publish;
    }

    @JsonSetter(nulls = Nulls.FAIL)
    public void setPublish(boolean publish) {
        this.publish = publish;
    }
}
