import axios from 'axios';

export const AUTH_EXPIRED_EVENT = 'groover:auth-expired';
export const AUTH_CHANGED_EVENT = 'groover:auth-changed';
export const API_BASE_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '/v1' : 'http://localhost:3000/v1');
let accessToken = null;
let authEpoch = 0;
let refreshPromise = null;
let csrfPromise = null;
let authQueue = Promise.resolve();
// Remove tokens left by the previous client; new credentials are never persisted in JS storage.
try { localStorage.removeItem('accessToken'); } catch { /* Storage may be disabled. */ }
export const getAccessToken = () => accessToken;
export const getAuthEpoch = () => authEpoch;
export const setAccessToken = (token) => {
  accessToken = token || null;
};

const api = axios.create({ baseURL: API_BASE_URL });
const channel = typeof window.BroadcastChannel === 'function' ? new window.BroadcastChannel('groover-auth') : null;
channel?.addEventListener('message', () => {
  authEpoch++;
  setAccessToken(null);
  window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
});

function authLock(action) {
  // Web Locks serialize refresh-cookie rotation between tabs as well as within this tab.
  const run = () => navigator.locks?.request
    ? navigator.locks.request('groover-auth-cookie', action) : action();
  const result = authQueue.then(run, run);
  authQueue = result.catch(() => {});
  return result;
}
async function csrfToken(force = false) {
  if (force) csrfPromise = null;
  if (!csrfPromise) {
    csrfPromise = api.get('/auth/csrf', { withCredentials: true, skipBearer: true, skipAuthRefresh: true })
      .then(response => response.data.data.token)
      .catch(error => { csrfPromise = null; throw error; });
  }
  return csrfPromise;
}
async function cookiePost(path, data = {}, bearer = false) {
  const send = async force => api.post(path, data, {
    withCredentials: true, skipBearer: !bearer, skipAuthRefresh: true,
    headers: { 'X-CSRF-TOKEN': await csrfToken(force) },
  });
  try { return await send(false); }
  catch (error) {
    if (error.response?.status === 403 && error.response?.data?.message === '요청 보안 검증에 실패했습니다.') return send(true);
    throw error;
  }
}
function expireSession() {
  setAccessToken(null);
  window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
}
function identity(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return `${payload.sub}:${payload.sid}`;
  } catch { return null; }
}
async function refreshLocked(epoch) {
  if (epoch !== authEpoch) throw new axios.CanceledError('Authentication changed.');
  try {
    const response = await cookiePost('/auth/refresh');
    if (epoch !== authEpoch) throw new axios.CanceledError('Authentication changed.');
    const session = response.data.data;
    setAccessToken(session.accessToken);
    return session;
  } catch (error) {
    if (epoch === authEpoch && error.response?.status === 401) expireSession();
    // A network/503 error is not evidence of logout. Keep state for an explicit retry.
    throw error;
  }
}
export function refreshSession() {
  if (!refreshPromise) {
    const epoch = authEpoch;
    refreshPromise = authLock(() => refreshLocked(epoch)).finally(() => { refreshPromise = null; });
  }
  return refreshPromise;
}
export function authenticate(path, data) {
  const epoch = ++authEpoch;
  return authLock(async () => {
    const response = await cookiePost(path, data);
    if (epoch !== authEpoch) throw new axios.CanceledError('Authentication changed.');
    setAccessToken(response.data.data.accessToken);
    channel?.postMessage('changed');
    return response.data.data;
  });
}
export function endSession(all = false) {
  const epoch = ++authEpoch;
  return authLock(async () => {
    if (all) {
      try { await cookiePost('/auth/logout-all', {}, true); }
      catch (error) {
        if (error.response?.status !== 401) throw error;
        await refreshLocked(epoch);
        await cookiePost('/auth/logout-all', {}, true);
      }
    } else {
      // Bearer also revokes the session if its cookie was removed. The cookie
      // fallback still permits logout after access-token expiry.
      try { await cookiePost('/auth/logout', {}, true); }
      catch (error) {
        if (error.response?.status !== 401) throw error;
        await cookiePost('/auth/logout');
      }
    }
    if (epoch === authEpoch) expireSession();
    channel?.postMessage('changed');
  });
}

api.interceptors.request.use((config) => {
  config.authEpoch ??= authEpoch;
  const token = getAccessToken();
  if (token && !config.skipBearer) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
api.interceptors.response.use((response) => response, async (error) => {
  const config = error.config;
  const authorization = error.config?.headers?.Authorization;
  if (error.response?.status === 401 && authorization && !config.skipAuthRefresh
      && !config.authRetried && config.authEpoch === authEpoch) {
    const previous = authorization.slice(7);
    if (previous === getAccessToken()) await refreshSession();
    if (config.authEpoch !== authEpoch) throw error;
    const current = getAccessToken();
    if (!current) throw error;
    if (identity(previous) && identity(previous) !== identity(current)) {
      expireSession();
      throw error; // Never replay a write under another account or login session.
    }
    config.authRetried = true;
    config.headers.Authorization = `Bearer ${current}`;
    return api.request(config);
  }
  if (error.response?.status === 401 && config?.authRetried && config.authEpoch === authEpoch) {
    expireSession();
  }
  return Promise.reject(error);
});

export const errorMessage = (error) => typeof error === 'string' ? error : error?.response?.data?.message || '요청을 처리하지 못했습니다. 잠시 후 다시 시도해주세요.';
export default api;
