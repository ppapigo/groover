// src/components/ad/AdBanner.tsx
'use client';

import { useEffect, useRef } from 'react';

declare global {
  interface Window {
    adsbygoogle: any[];
  }
}

interface AdBannerProps {
  slot: string;
  format?: 'auto' | 'horizontal' | 'vertical' | 'rectangle' | 'fluid';
  style?: React.CSSProperties;
}

// 구글 애드센스 배너 컴포넌트
export default function AdBanner({ slot, format = 'auto', style }: AdBannerProps) {
  const adRef = useRef<HTMLDivElement>(null);
  const isLoaded = useRef(false);

  useEffect(() => {
    if (isLoaded.current) return;
    
    if (typeof window !== 'undefined' && adRef.current) {
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
        isLoaded.current = true;
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
        data-ad-client="ca-pub-6900837853350556"
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive="true"
      />
    </div>
  );
}

// 인피드 광고 (피드 사이에 삽입)
export function InFeedAd({ slot }: { slot: string }) {
  return (
    <div style={{ 
      margin: '16px 0', 
      padding: '12px',
      background: '#fafafa',
      borderRadius: '12px',
    }}>
      <AdBanner slot={slot} format="fluid" style={{ minHeight: '100px' }} />
    </div>
  );
}

// 배너 광고 (상단/하단)
export function BannerAd({ slot, position = 'top' }: { slot: string; position?: 'top' | 'bottom' }) {
  return (
    <div style={{ 
      margin: position === 'top' ? '0 0 16px 0' : '16px 0 0 0',
      padding: '8px 0',
    }}>
      <AdBanner slot={slot} format="horizontal" style={{ minHeight: '90px' }} />
    </div>
  );
}

// 콘텐츠 내 광고 (글 중간)
export function InArticleAd({ slot }: { slot: string }) {
  return (
    <div style={{ 
      margin: '24px 0',
      padding: '16px 0',
      borderTop: '1px solid #eee',
      borderBottom: '1px solid #eee',
    }}>
      <p style={{ 
        fontSize: '11px', 
        color: '#999', 
        marginBottom: '8px',
        textAlign: 'center',
      }}>
        광고
      </p>
      <AdBanner slot={slot} format="fluid" style={{ minHeight: '250px' }} />
    </div>
  );
}
