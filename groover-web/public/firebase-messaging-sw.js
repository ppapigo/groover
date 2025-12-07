importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyDx2KjiSNJKfBXofEXu8zoTwOTxfX_lAhs",
  authDomain: "groover-2d5af.firebaseapp.com",
  projectId: "groover-2d5af",
  storageBucket: "groover-2d5af.firebasestorage.app",
  messagingSenderId: "760795876090",
  appId: "1:760795876090:web:9d6903d0198b263d86d743",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || '새 알림';
  const options = {
    body: payload.notification?.body || '',
    icon: '/icon-192x192.png',
    data: payload.data,
  };
  self.registration.showNotification(title, options);
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const link = event.notification.data?.link || '/';
  event.waitUntil(clients.openWindow(link));
});