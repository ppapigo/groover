package com.groover.user;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "users")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class User {
    @Id private UUID id;
    @Column(name = "user_id", nullable = false, unique = true, length = 30) private String userId;
    @Column(nullable = false, unique = true) private String email;
    @Column(name = "password_hash", nullable = false) private String passwordHash;
    @Column(nullable = false, length = 50) private String name;
    @Column(name = "profile_image_url", length = 500) private String profileImageUrl;
    @Column(name = "created_at", nullable = false) private Instant createdAt;
    @Column(name = "updated_at", nullable = false) private Instant updatedAt;

    public User(String userId, String email, String passwordHash, String name) {
        this.id = UUID.randomUUID();
        this.userId = userId;
        this.email = email.toLowerCase();
        this.passwordHash = passwordHash;
        this.name = name;
        this.createdAt = Instant.now();
        this.updatedAt = this.createdAt;
    }
}
