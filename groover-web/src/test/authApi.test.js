import { beforeEach, describe, expect, it } from 'vitest';
import { AxiosError } from 'axios';
import api, { authenticate, endSession, getAccessToken, refreshSession, setAccessToken } from '@/lib/api';

const user = { id: 'user', name: 'User' };
let calls;
let handle;
const ok = (config, data) => ({ config, data, status: 200, statusText: 'OK', headers: {} });
function fail(config, status) {
  throw new AxiosError('Rejected', 'ERR_BAD_REQUEST', config, null, { status, data: { message: 'Rejected' }, config, headers: {} });
}
beforeEach(() => {
  calls = [];
  handle = null;
  api.defaults.adapter = async config => {
    calls.push(config);
    if (config.url === '/auth/csrf') return ok(config, { data: { token: 'csrf-token' } });
    return handle(config);
  };
});

describe('session token transport and renewal', () => {
  it('sends CSRF and cookies for login, without an old bearer token or persistent JS storage', async () => {
    setAccessToken('expired-token');
    handle = config => ok(config, { data: { user, accessToken: 'new-token' } });
    await authenticate('/auth/login', { userId: 'user', password: 'password123' });
    const login = calls.find(c => c.url === '/auth/login');
    expect(login.withCredentials).toBe(true);
    expect(login.headers['X-CSRF-TOKEN']).toBeTruthy();
    expect(login.headers.Authorization).toBeUndefined();
    expect(getAccessToken()).toBe('new-token');
    expect(localStorage.getItem('accessToken')).toBeNull();
  });

  it('coalesces simultaneous 401s into one rotation and retries each request once', async () => {
    setAccessToken('old-token');
    handle = async config => {
      if (config.url === '/auth/refresh') {
        await new Promise(resolve => setTimeout(resolve, 10));
        return ok(config, { data: { user, accessToken: 'new-token' } });
      }
      if (config.headers.Authorization === 'Bearer old-token') return fail(config, 401);
      return ok(config, { success: true });
    };
    await Promise.all([api.get('/protected-one'), api.post('/protected-two', { title: 'Keep this draft' })]);
    expect(calls.filter(c => c.url === '/auth/refresh')).toHaveLength(1);
    const refresh = calls.find(c => c.url === '/auth/refresh');
    expect(refresh.withCredentials).toBe(true);
    expect(refresh.headers.Authorization).toBeUndefined();
    expect(calls.filter(c => c.url === '/protected-two')).toHaveLength(2);
  });

  it('does not recursively refresh when the refresh token is revoked', async () => {
    setAccessToken('old-token');
    handle = config => fail(config, 401);
    await expect(api.get('/protected')).rejects.toMatchObject({ response: { status: 401 } });
    expect(calls.filter(c => c.url === '/auth/refresh')).toHaveLength(1);
    expect(getAccessToken()).toBeNull();
  });

  it('retains state on a refresh outage and does not replay the original write', async () => {
    setAccessToken('old-token');
    handle = config => fail(config, config.url === '/auth/refresh' ? 503 : 401);
    await expect(api.post('/protected', { title: 'Draft' })).rejects.toMatchObject({ response: { status: 503 } });
    expect(getAccessToken()).toBe('old-token');
    expect(calls.filter(c => c.url === '/protected')).toHaveLength(1);
  });

  it('waits for in-flight refresh before logout and never restores the local token afterwards', async () => {
    setAccessToken('old-token');
    let finish;
    let started;
    const began = new Promise(resolve => { started = resolve; });
    handle = config => {
      if (config.url === '/auth/refresh') return new Promise(resolve => {
        finish = () => resolve(ok(config, { data: { user, accessToken: 'late-token' } }));
        started();
      });
      return ok(config, { success: true });
    };
    const refreshing = refreshSession().catch(error => error);
    await began;
    const loggingOut = endSession();
    finish();
    expect((await refreshing).code).toBe('ERR_CANCELED');
    await loggingOut;
    expect(calls.filter(c => c.url !== '/auth/csrf').map(c => c.url)).toEqual(['/auth/refresh', '/auth/logout']);
    expect(getAccessToken()).toBeNull();
  });

  it('never retries a write under a different session returned by another tab login', async () => {
    const token = sid => `header.${btoa(JSON.stringify({ sub: 'user', sid }))}.signature`;
    setAccessToken(token('first'));
    handle = config => config.url === '/auth/refresh'
      ? ok(config, { data: { user, accessToken: token('second') } }) : fail(config, 401);
    await expect(api.post('/protected', { title: 'Private draft' })).rejects.toMatchObject({ response: { status: 401 } });
    expect(calls.filter(c => c.url === '/protected')).toHaveLength(1);
    expect(getAccessToken()).toBeNull();
  });

  it('refreshes expired access before logout-all and keeps CSRF protection on both requests', async () => {
    setAccessToken('old-token');
    handle = config => {
      if (config.url === '/auth/refresh') return ok(config, { data: { user, accessToken: 'new-token' } });
      if (config.headers.Authorization === 'Bearer old-token') return fail(config, 401);
      return ok(config, { success: true });
    };
    await endSession(true);
    expect(calls.filter(c => c.url === '/auth/logout-all')).toHaveLength(2);
    expect(calls.filter(c => c.url === '/auth/logout-all').every(c => c.headers['X-CSRF-TOKEN'])).toBe(true);
    expect(getAccessToken()).toBeNull();
  });

  it('uses bearer logout when available, with a cookie-only fallback on expiry', async () => {
    setAccessToken('expired-token');
    handle = config => config.headers.Authorization ? fail(config, 401) : ok(config, { success: true });
    await endSession();
    const logouts = calls.filter(c => c.url === '/auth/logout');
    expect(logouts).toHaveLength(2);
    expect(logouts[0].headers.Authorization).toBe('Bearer expired-token');
    expect(logouts[1].headers.Authorization).toBeUndefined();
    expect(getAccessToken()).toBeNull();
  });
});
