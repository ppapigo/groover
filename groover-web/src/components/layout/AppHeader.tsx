// src/components/layout/AppHeader.tsx
'use client';

import Link from 'next/link';
import Image from 'next/image';

export default function AppHeader() {
  return (
    <header className="app-header" style={{ background: '#000', color: '#fff' }}>
      <Link href="/" className="logo" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
        <Image src="/logo.png" alt="Groover" width={28} height={28} />
        <span style={{ color: '#fff', fontSize: '18px', fontWeight: '700' }}>Groover</span>
      </Link>
      <p className="subtitle" style={{ color: '#ccc', fontSize: '12px' }}>쇼핑 리뷰 커뮤니티</p>
    </header>
  );
}