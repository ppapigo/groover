// src/components/layout/BottomTabBar.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Search, FileText, User } from 'lucide-react';

const tabs = [
  { href: '/', icon: Home, label: '홈' },
  { href: '/search', icon: Search, label: '검색' },
  { href: '/blog', icon: FileText, label: '블로그' },
  { href: '/profile', icon: User, label: '프로필' },
];

export default function BottomTabBar() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  return (
    <nav className="bottom-tab-bar">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const active = isActive(tab.href);
        
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`tab-item ${active ? 'active' : ''}`}
          >
            <Icon 
              size={24} 
              strokeWidth={active ? 2.5 : 1.5}
              className="tab-icon"
            />
            <span className="tab-label">{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}