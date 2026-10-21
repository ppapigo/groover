-- Run ONLY against a disposable local PostgreSQL database.
-- Re-runnable and does not delete existing project data.
INSERT INTO users (id, user_id, email, password_hash, name, created_at, updated_at)
VALUES ('77777777-7777-4777-8777-777777777777', 'k6_benchmark',
        'k6-benchmark@example.invalid', 'not-a-real-password-hash',
        'Benchmark fixture', now(), now())
ON CONFLICT (id) DO NOTHING;

INSERT INTO reviews (
    id, author_id, title, content, slug, status,
    view_count, like_count, comment_count, published_at, created_at, updated_at
)
SELECT md5('groover-loadtest-review-' || n)::uuid,
       '77777777-7777-4777-8777-777777777777'::uuid,
       'Benchmark review ' || n,
       'Representative fixture content for local read performance tests.',
       'loadtest-groover-' || n, 'PUBLISHED',
       0, 0, 0, now() - (n || ' minutes')::interval,
       now() - (n || ' minutes')::interval, now()
FROM generate_series(1, 2000) AS n
ON CONFLICT (id) DO NOTHING;

INSERT INTO review_tags (review_id, tag)
SELECT id, 'perf-tag' FROM reviews
WHERE slug LIKE 'loadtest-groover-%'
ON CONFLICT (review_id, tag) DO NOTHING;
