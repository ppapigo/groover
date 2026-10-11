package com.groover.review;

import com.groover.user.User;
import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "comments")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Comment {
    @Id private UUID id;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "review_id", nullable = false) private Review review;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "author_id", nullable = false) private User author;
    @Column(nullable = false, length = 2000) private String content;
    @Column(name = "created_at", nullable = false) private Instant createdAt;
    @Column(name = "updated_at", nullable = false) private Instant updatedAt;
    public Comment(Review review, User author, String content) {
        this.id = UUID.randomUUID(); this.review = review; this.author = author; this.content = content;
        this.createdAt = Instant.now(); this.updatedAt = createdAt;
    }
}
