# Groover read performance: reproducible local experiment

This is a **performance experiment**, not a claim of production traffic or measured improvement.

## Safety
- Work only with a disposable local PostgreSQL database, **never the deployed production database**.
- The k6 script rejects non-loopback targets.
- Do not run the load profile against a shared service or a database with real users.
- Seed SQL creates 2,000 public fixture reviews with a unique prefix and a dedicated fixture user.
- Keep DB volume, CPU/RAM limit, API config, and test machine unchanged between baseline and optimized runs.

## 1. Prepare
Start a disposable local PostgreSQL and API (port 3000). The repository's `docker-compose.yml`
is an option **only if its named volume is not used for real data**. For isolation, prefer a
new compose project/volume and confirm which DB your API is connecting to.

From the dedicated test DB (using psql, with credentials from that environment), run:
```sh
psql "$BENCH_DATABASE_URL" -v ON_ERROR_STOP=1 -f perf/seed-read-benchmark.sql
```

## 2. Baseline (main)
On a clean `main` checkout, run the API with the prepared fixture DB and run:
```sh
k6 run -e PROFILE=smoke -e BASE_URL=http://127.0.0.1:3000 perf/feed-read.js
k6 run -e PROFILE=load -e BASE_URL=http://127.0.0.1:3000 --summary-export=baseline.json perf/feed-read.js
```
Record the Git SHA, DB and API machine resources, dataset size, `http_req_duration p95`,
`http_reqs`/throughput, HTTP failure rate, and PostgreSQL load.

## 3. After (this branch)
With **the same DB fixture and resources**, restart the optimized API, warm up, then run:
```sh
k6 run -e PROFILE=smoke -e BASE_URL=http://127.0.0.1:3000 perf/feed-read.js
k6 run -e PROFILE=load -e BASE_URL=http://127.0.0.1:3000 --summary-export=optimized.json perf/feed-read.js
```

## 4. Interpretation
- Compare latency **p95**, RPS, failures, CPU and PostgreSQL queries together.
- This k6 test uses anonymous reads; a separately authenticated test is required to measure
  the bulk "liked" lookup improvement.
- `ReviewFeedQueryCountTests` guards against SQL query counts growing per returned item,
  but H2 is not a substitute for PostgreSQL execution plans.
- The main repository already uses `idx_reviews_status_published`; confirm actual index
  use with PostgreSQL `EXPLAIN (ANALYZE, BUFFERS)`.
- Stateful detail GET is deliberately excluded because it increments `view_count` and can
  serialize on row locks; that should be evaluated as a separate write-load scenario.
- These load stages peak at **50 virtual users**. They do not demonstrate "serving hundreds
  of thousands of users in production".
