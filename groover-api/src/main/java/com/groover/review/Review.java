package com.groover.review;

import com.groover.user.User;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.*;

@Entity
@Table(name = "reviews")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Review {
    @Id private UUID id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "author_id") private User author;
    @Column(nullable = false, length = 200) private String title;
    @Column(nullable = false, columnDefinition = "text") private String content;
    @Column(nullable = false, unique = true) private String slug;
    @Column(length = 300) private String excerpt;
    @Column(name = "preview_image", length = 500) private String previewImage;
    @Column(name = "product_name", length = 120) private String productName;
    @Column(name = "store_name", length = 100) private String storeName;
    @Column(precision = 12, scale = 2) private BigDecimal price;
    private Integer rating;
    @Column(name = "purchase_status", length = 30) private String purchaseStatus;
    @Enumerated(EnumType.STRING) @Column(nullable = false) private ReviewStatus status;
    @ElementCollection
    @CollectionTable(name = "review_tags", joinColumns = @JoinColumn(name = "review_id"))
    @Column(name = "tag", length = 40) private Set<String> tags = new LinkedHashSet<>();
    @Column(name = "view_count", nullable = false) private int viewCount;
    @Column(name = "like_count", nullable = false) private int likeCount;
    @Column(name = "comment_count", nullable = false) private int commentCount;
    @Column(name = "published_at") private Instant publishedAt;
    @Column(name = "created_at", nullable = false) private Instant createdAt;
    @Column(name = "updated_at", nullable = false) private Instant updatedAt;

    public Review(User author, String title, String content, String slug, String excerpt,
                  String previewImage, String productName, String storeName, BigDecimal price,
                  Integer rating, String purchaseStatus, Collection<String> tags, boolean publish) {
        this.id = UUID.randomUUID(); this.author = author; this.createdAt = Instant.now(); this.updatedAt = createdAt;
        apply(title, content, excerpt, previewImage, productName, storeName, price, rating, purchaseStatus, tags);
        publish(publish);
        this.slug = slug;
    }

    public void update(String title, String content, String excerpt, String previewImage, String productName,
                       String storeName, BigDecimal price, Integer rating, String purchaseStatus, Collection<String> tags) {
        apply(title, content, excerpt, previewImage, productName, storeName, price, rating, purchaseStatus, tags);
        this.updatedAt = Instant.now();
    }

    private void apply(String title, String content, String excerpt, String previewImage, String productName,
                       String storeName, BigDecimal price, Integer rating, String purchaseStatus, Collection<String> tags) {
        this.title = title; this.content = content; this.excerpt = excerpt; this.previewImage = previewImage;
        this.productName = productName; this.storeName = storeName; this.price = price;
        this.rating = rating; this.purchaseStatus = purchaseStatus;
        this.tags.clear();
        if (tags != null) tags.stream().map(String::trim).filter(t -> !t.isBlank()).limit(10).forEach(this.tags::add);
    }

    public void publish(boolean value) {
        this.status = value ? ReviewStatus.PUBLISHED : ReviewStatus.DRAFT;
        this.publishedAt = value ? Optional.ofNullable(publishedAt).orElseGet(Instant::now) : null;
        this.updatedAt = Instant.now();
    }
    public void increaseViews() { viewCount++; }
    public void increaseLikes() { likeCount++; }
    public void decreaseLikes() { likeCount = Math.max(0, likeCount - 1); }
    public void increaseComments() { commentCount++; }
    public void decreaseComments() { commentCount = Math.max(0, commentCount - 1); }
}
