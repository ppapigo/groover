// src/lib/api.ts
import axios from 'axios';
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/v1';
// Axios 인스턴스 생성
export const api = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true, // 쿠키 전송 (Refresh Token)
    headers: {
        'Content-Type': 'application/json',
    },
});
// 토큰 저장소 (메모리)
let accessToken = null;
// 토큰 갱신 중 여부
let isRefreshing = false;
// 갱신 대기 중인 요청들
let refreshSubscribers = [];
// 토큰 설정
export const setAccessToken = (token) => {
    accessToken = token;
    if (token) {
        localStorage.setItem('accessToken', token);
    }
    else {
        localStorage.removeItem('accessToken');
    }
};
// 토큰 가져오기
export const getAccessToken = () => {
    if (accessToken)
        return accessToken;
    if (typeof window !== 'undefined') {
        accessToken = localStorage.getItem('accessToken');
    }
    return accessToken;
};
// 갱신 완료 시 대기 중인 요청들 처리
const onRefreshed = (token) => {
    refreshSubscribers.forEach((callback) => callback(token));
    refreshSubscribers = [];
};
// 갱신 대기열에 추가
const addRefreshSubscriber = (callback) => {
    refreshSubscribers.push(callback);
};
// 요청 인터셉터 - Access Token 자동 추가
// 요청 인터셉터 - 수정
api.interceptors.request.use((config) => {
    // 직접 localStorage에서 가져오기
    if (typeof window !== 'undefined') {
        const token = localStorage.getItem('accessToken');
        if (token && config.headers) {
            config.headers.Authorization = `Bearer ${token}`;
        }
    }
    return config;
}, (error) => Promise.reject(error));
// 응답 인터셉터 - 401 에러 시 토큰 갱신
api.interceptors.response.use((response) => response, async (error) => {
    const originalRequest = error.config;
    // 401 에러이고, 재시도 아닌 경우
    if (error.response?.status === 401 && !originalRequest._retry) {
        // refresh 요청 자체가 실패한 경우 → 로그아웃
        if (originalRequest.url?.includes('/auth/refresh')) {
            setAccessToken(null);
            window.location.href = '/login';
            return Promise.reject(error);
        }
        // 이미 갱신 중이면 대기
        if (isRefreshing) {
            return new Promise((resolve) => {
                addRefreshSubscriber((token) => {
                    originalRequest.headers.Authorization = `Bearer ${token}`;
                    resolve(api(originalRequest));
                });
            });
        }
        originalRequest._retry = true;
        isRefreshing = true;
        try {
            // 토큰 갱신 요청
            const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {}, { withCredentials: true });
            const newToken = response.data.data.accessToken;
            setAccessToken(newToken);
            // 대기 중인 요청들 처리
            onRefreshed(newToken);
            // 원래 요청 재시도
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return api(originalRequest);
        }
        catch (refreshError) {
            // 갱신 실패 → 로그아웃
            setAccessToken(null);
            window.location.href = '/login';
            return Promise.reject(refreshError);
        }
        finally {
            isRefreshing = false;
        }
    }
    return Promise.reject(error);
});
export default api;
