import http from 'k6/http';
import { check } from 'k6';

// A/B benchmark: same script and request parameters for both server versions.
// Only local loopback targets are permitted.
const BASE = (__ENV.BASE_URL || 'http://127.0.0.1:3100').replace(/\/$/, '');
if (!/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(BASE)) {
  throw new Error('Only local HTTP targets are allowed');
}

const ENDPOINT = __ENV.ENDPOINT || 'feed';
const ROUTES = {
  feed: '/v1/blog/feed?limit=20',
  popular: '/v1/blog/feed/popular?limit=20',
  search: '/v1/search?q=review&limit=20',
};
if (ENDPOINT !== 'mixed' && !Object.prototype.hasOwnProperty.call(ROUTES, ENDPOINT)) {
  throw new Error('ENDPOINT must be feed, popular, search or mixed');
}

const RATE = Number(__ENV.RATE || 100);
if (!Number.isInteger(RATE) || RATE < 1 || RATE > 1000) {
  throw new Error('RATE must be an integer between 1 and 1000');
}
const DURATION = __ENV.DURATION || '60s';
if (!/^(30|60|90|120)s$/.test(DURATION)) {
  throw new Error('DURATION must be 30s, 60s, 90s, or 120s');
}

export const options = {
  scenarios: {
    reads: {
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
    checks: ['rate>0.99'],
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<200'],
    dropped_iterations: ['count==0'],
  },
};

const names = Object.keys(ROUTES);
export default function () {
  const route = ENDPOINT === 'mixed' ? names[Math.floor(Math.random() * names.length)] : ENDPOINT;
  const response = http.get(BASE + ROUTES[route], {
    tags: { endpoint: route },
    timeout: '10s',
  });
  check(response, {
    'HTTP 200': r => r.status === 200,
    'nonempty JSON body': r => Boolean(r.body && r.body.length > 2),
  });
}
