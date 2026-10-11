CREATE TABLE users (
    id UUID PRIMARY KEY,
    user_id VARCHAR(30) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(50) NOT NULL,
    profile_image_url VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE TABLE reviews (
    id UUID PRIMARY KEY,
    author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    excerpt VARCHAR(300),
    preview_image VARCHAR(500),
    product_name VARCHAR(120),
    store_name VARCHAR(100),
    price NUMERIC(12,2),
    rating SMALLINT,
    purchase_status VARCHAR(30),
    status VARCHAR(20) NOT NULL,
    view_count INTEGER NOT NULL DEFAULT 0,
    like_count INTEGER NOT NULL DEFAULT 0,
    comment_count INTEGER NOT NULL DEFAULT 0,
    published_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT chk_review_rating CHECK (rating IS NULL OR rating BETWEEN 1 AND 5)
);

CREATE TABLE review_tags (
    review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
    tag VARCHAR(40) NOT NULL,
    PRIMARY KEY (review_id, tag)
);

CREATE TABLE review_likes (
    review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    PRIMARY KEY (review_id, user_id)
);

CREATE TABLE comments (
    id UUID PRIMARY KEY,
    review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content VARCHAR(2000) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE INDEX idx_reviews_status_published ON reviews(status, published_at DESC);
CREATE INDEX idx_reviews_author ON reviews(author_id, created_at DESC);
CREATE INDEX idx_review_tags_tag ON review_tags(tag);
CREATE INDEX idx_comments_review ON comments(review_id, created_at);
