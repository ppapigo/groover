// src/components/ad/AdBanner.tsx
'use client';

import { useEffect, useRef } from 'react';

interface AdBannerProps {
  slot: string;
  format?: 'auto' | 'horizontal' | 'vertical' | 'rectangle';
  style?: React.CSSProperties;
}

// 구글 애드센스 배너 컴포넌트
export default function AdBanner({ slot, format = 'auto', style }: AdBannerProps) {
  const adRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 클라이언트에서만 실행
    if (typeof window !== 'undefined' && adRef.current) {
      try {
        // @ts-ignore
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch (e) {
        console.error('AdSense error:', e);
      }
    }
  }, []);

  return (
    <div ref={adRef} style={{ width: '100%', ...style }}>
      <ins
        className="adsbygoogle"
        style={{ display: 'block', width: '100%' }}
        data-ad-client={process.env.NEXT_PUBLIC_ADSENSE_ID || 'ca-pub-xxxxxxxx'}
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive="true"
      />
    </div>
  );
}

// 개발 환경용 Mock 배너
export function MockAdBanner({ position }: { position: 'top' | 'middle' | 'bottom' }) {
  const messages: Record<string, { text: string; bg: string }> = {
    top: { text: '🔥 이번주 인기 캠핑 필수템 할인! → 보러가기', bg: '#fff3cd' },
    middle: { text: '✨ 육아맘들이 많이 쓰는 젖병 소독기 베스트 5', bg: '#e8f4fd' },
    bottom: { text: '🛒 오늘의 특가! 최대 50% 할인 중', bg: '#f0fff4' },
  };

  const { text, bg } = messages[position];

  return (
    <div
      style={{
        padding: '12px 16px',
        background: bg,
        borderRadius: '8px',
        fontSize: '13px',
        textAlign: 'center',
        cursor: 'pointer',
        margin: '8px 0',
      }}
    >
      <span style={{ marginRight: '4px' }}>AD</span>
      {text}
    </div>
  );
}
