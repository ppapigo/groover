import http from 'k6/http';
import { check, sleep } from 'k6';

// Intentionally refuse public targets to avoid accidentally load testing production.
const BASE = (__ENV.BASE_URL || 'http://127.0.0.1:3000').replace(/\/$/, '');
if (!/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(BASE)) {
  throw new Error('Only local HTTP targets are allowed: set BASE_URL=http://127.0.0.1:3000');
}
const profile = __ENV.PROFILE || 'smoke';
if (!['smoke', 'load'].includes(profile)) throw new Error('PROFILE must be smoke or load');
const stages = profile === 'load'
  ? [{ duration: '30s', target: 10 }, { duration: '1m', target: 30 },
     { duration: '1m', target: 50 }, { duration: '30s', target: 0 }]
  : [{ duration: '15s', target: 1 }, { duration: '15s', target: 3 },
     { duration: '10s', target: 0 }];
export const options = {
  stages,
  thresholds: {
    http_req_failed: ['rate<0.01'],
    checks: ['rate>0.99'],
  },
  tags: { project: 'groover', endpoint_group: 'read' },
};
const endpoints = [
  '/v1/blog/feed?limit=20',
  '/v1/blog/feed/popular?limit=20',
  '/v1/search?q=review&limit=20',
];
export default function () {
  const path = endpoints[Math.floor(Math.random() * endpoints.length)];
  const res = http.get(BASE + path, { tags: { endpoint: path.split('?')[0] }, timeout: '10s' });
  check(res, {
    'HTTP 200': response => response.status === 200,
    'nonempty JSON body': response => !!response.body && response.body.length > 2,
  });
  sleep(1);
}
