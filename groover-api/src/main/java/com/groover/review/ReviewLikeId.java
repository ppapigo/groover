package com.groover.review;

import lombok.*;
import java.io.Serializable;
import java.util.UUID;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @EqualsAndHashCode
public class ReviewLikeId implements Serializable {
    private UUID review;
    private UUID user;
}
