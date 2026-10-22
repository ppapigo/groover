import http from 'k6/http';
import { check } from 'k6';

// Local-only capacity exploration; never send load to public services.
const BASE = (__ENV.BASE_URL || 'http://127.0.0.1:3100').replace(/\/$/, '');
if (!/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(BASE)) {
  throw new Error('Only loopback HTTP is supported. Set BASE_URL=http://127.0.0.1:3100');
}
const RATE = Number(__ENV.RATE || '50');
if (!Number.isInteger(RATE) || RATE < 1 || RATE > 1000) {
  throw new Error('RATE must be an integer between 1 and 1000');
}
const DURATION = __ENV.DURATION || '60s';
if (!/^(30|60|90|120)s$/.test(DURATION)) {
  throw new Error('DURATION must be 30s, 60s, 90s, or 120s');
}
export const options = {
  scenarios: {
    feed_read: {
      executor: 'constant-arrival-rate',
      rate: RATE,
      timeUnit: '1s',
      duration: DURATION,
      preAllocatedVUs: Math.min(200, Math.max(30, Math.ceil(RATE / 5))),
      maxVUs: 500,
      gracefulStop: '20s',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<200'],
    http_req_failed: ['rate<0.01'],
    checks: ['rate>0.99'],
    dropped_iterations: ['count==0'],
  },
};
const paths = [
  '/v1/blog/feed?limit=20',
  '/v1/blog/feed/popular?limit=20',
  '/v1/search?q=review&limit=20',
];
export default function () {
  const path = paths[Math.floor(Math.random() * paths.length)];
  const res = http.get(BASE + path, {
    timeout: '10s',
    tags: { route: path.split('?')[0] },
  });
  check(res, { 'HTTP 200': r => r.status === 200 });
}
