package com.groover.review;

import com.groover.user.User;
import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

@Entity
@Table(name = "review_likes")
@IdClass(ReviewLikeId.class)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ReviewLike {
    @Id @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "review_id") private Review review;
    @Id @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "user_id") private User user;
    @Column(name = "created_at", nullable = false) private Instant createdAt;
    public ReviewLike(Review review, User user) { this.review = review; this.user = user; this.createdAt = Instant.now(); }
}
