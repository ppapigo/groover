// src/app/layout.tsx
import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import Script from 'next/script';
import './globals.css';
import BottomTabBar from '@/components/layout/BottomTabBar';
import { Providers } from '@/lib/providers';
import { FcmInitializer } from '@/components/FcmInitializer';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Groover - 쇼핑 블로그 플랫폼',
  description: '쇼핑 후기와 리뷰를 공유하고, AI가 자동으로 장바구니를 만들어주는 플랫폼',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Groover',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#0f62fe',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        {/* 구글 애드센스 스크립트 */}
        <Script
          async
          src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${process.env.NEXT_PUBLIC_ADSENSE_ID || 'ca-pub-xxxxxxxx'}`}
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
      </head>
      <body className={inter.className}>
        <Providers>
          <FcmInitializer />
          <div className="app-root">
            <main className="app-main">
              {children}
            </main>
            <BottomTabBar />
          </div>
        </Providers>
      </body>
    </html>
  );
}