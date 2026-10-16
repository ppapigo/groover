import axios from 'axios';

export const AUTH_EXPIRED_EVENT = 'groover:auth-expired';
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/v1';
export const getAccessToken = () => localStorage.getItem('accessToken');
export const setAccessToken = (token) => {
  if (token) localStorage.setItem('accessToken', token);
  else localStorage.removeItem('accessToken');
};

const api = axios.create({ baseURL: API_BASE_URL });
api.interceptors.request.use((config) => {
  // Login/register must also work when an old token has expired.
  const token = getAccessToken();
  if (token && !['/auth/login', '/auth/register'].includes(config.url)) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
api.interceptors.response.use((response) => response, (error) => {
  const authorization = error.config?.headers?.Authorization;
  if (error.response?.status === 401 && authorization === `Bearer ${getAccessToken()}`) {
    setAccessToken(null);
    window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
  }
  return Promise.reject(error);
});

export const errorMessage = (error) => typeof error === 'string' ? error : error?.response?.data?.message || '요청을 처리하지 못했습니다. 잠시 후 다시 시도해주세요.';
export default api;
