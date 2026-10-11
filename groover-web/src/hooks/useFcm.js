'use client';
import { useEffect, useState } from 'react';
import { getFcmToken, onForegroundMessage } from '@/lib/firebase';
import { useAuth } from './useAuth';
import api from '@/lib/api';
export function useFcm() {
    const { isAuthenticated, isLoading } = useAuth();
    const [fcmToken, setFcmToken] = useState(null);
    useEffect(() => {
        // 로딩 중이거나 인증 안됐으면 스킵
        if (isLoading || !isAuthenticated)
            return;
        const initFcm = async () => {
            const token = await getFcmToken();
            if (token) {
                setFcmToken(token);
                try {
                    await api.post('/fcm/token', { token, device: 'web' });
                    console.log('FCM 토큰 서버 등록 완료');
                }
                catch (error) {
                    console.error('FCM 토큰 등록 실패:', error);
                }
            }
        };
        initFcm();
        const unsubscribe = onForegroundMessage((payload) => {
            if (Notification.permission === 'granted') {
                new Notification(payload.notification?.title || '새 알림', {
                    body: payload.notification?.body,
                    icon: '/icon-192x192.png',
                });
            }
        });
        return () => { if (typeof unsubscribe === 'function')
            unsubscribe(); };
    }, [isAuthenticated, isLoading]);
    const requestPermission = async () => {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            const token = await getFcmToken();
            if (token) {
                setFcmToken(token);
                await api.post('/fcm/token', { token, device: 'web' });
            }
        }
        return permission;
    };
    return { fcmToken, requestPermission };
}
