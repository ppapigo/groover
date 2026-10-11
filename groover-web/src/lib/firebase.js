import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
const firebaseConfig = {
    apiKey: "AIzaSyDx2KjiSNJKfBXofEXu8zoTwOTxfX_lAhs",
    authDomain: "groover-2d5af.firebaseapp.com",
    projectId: "groover-2d5af",
    storageBucket: "groover-2d5af.firebasestorage.app",
    messagingSenderId: "760795876090",
    appId: "1:760795876090:web:9d6903d0198b263d86d743",
};
const app = initializeApp(firebaseConfig);
let messaging = null;
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    messaging = getMessaging(app);
}
export async function getFcmToken() {
    console.log('getFcmToken 시작, messaging:', messaging);
    if (!messaging)
        return null;
    try {
        const permission = await Notification.requestPermission();
        console.log('알림 권한:', permission);
        if (permission !== 'granted')
            return null;
        const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
        console.log('서비스워커 등록:', registration);
        const token = await getToken(messaging, { serviceWorkerRegistration: registration });
        console.log('FCM 토큰:', token);
        return token;
    }
    catch (error) {
        console.error('FCM 토큰 오류:', error);
        return null;
    }
}
export function onForegroundMessage(callback) {
    if (!messaging)
        return () => { };
    return onMessage(messaging, callback);
}
export { app, messaging };
