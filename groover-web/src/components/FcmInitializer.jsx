'use client';
import { useEffect } from 'react';
import { useFcm } from '@/hooks/useFcm';
export function FcmInitializer() {
    const { fcmToken } = useFcm();
    useEffect(() => {
        if (fcmToken) {
            console.log('FCM 준비 완료');
        }
    }, [fcmToken]);
    return null;
}
