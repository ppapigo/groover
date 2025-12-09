// src/components/layout/AppHeader.tsx
'use client';

import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';

// src/components/layout/AppHeader.tsx
export default function AppHeader() {
  return (
    <header className="app-header" style={{ background: '#000', color: '#fff' }}>
      <div className="logo">
        <span className="logo-icon">🛒</span>
        <span style={{ color: '#fff' }}>Groover</span>
      </div>
      <p className="subtitle" style={{ color: '#ccc' }}>오늘의 추천 쇼핑 리뷰를 확인해보세요</p>
    </header>
  );
}