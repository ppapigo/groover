// src/app/dm/page.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import AppHeader from '@/components/layout/AppHeader';
import DmMenu from '@/components/dm/DmMenu';
import ReportModal from '@/components/dm/ReportModal';

interface Partner {
  id: string;
  name: string;
  profileImageUrl?: string;
}

interface Thread {
  id: string;
  partner: Partner;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
  isBlocked?: boolean;
}

interface ThreadCardProps {
  thread: Thread;
  onMenuOpen: (thread: Thread, e: React.MouseEvent) => void;
}

function ThreadCard({ thread, onMenuOpen }: ThreadCardProps) {
  const formatTime = (dateString: string) => {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return '어제';
    } else if (diffDays < 7) {
      return `${diffDays}일 전`;
    } else {
      return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
    }
  };

  return (
    <div 
      className={`
        flex items-center gap-3 p-4 bg-white rounded-card transition-all
        ${thread.isBlocked ? 'opacity-60' : 'active:bg-card-soft'}
      `}
    >
      <Link
        href={thread.isBlocked ? '#' : `/dm/${thread.id}`}
        className="flex items-center gap-3 flex-1 min-w-0"
      >
        {/* 프로필 이미지 */}
        <div className="relative w-14 h-14 rounded-full flex-shrink-0 flex items-center justify-center text-2xl bg-card-soft overflow-hidden">
          {thread.partner.profileImageUrl ? (
            <img 
              src={thread.partner.profileImageUrl} 
              alt={thread.partner.name}
              className="w-full h-full object-cover"
            />
          ) : (
            '👤'
          )}
          
          {/* 읽지 않은 메시지 뱃지 */}
          {thread.unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[22px] h-[22px] px-1.5 bg-error text-white text-xs font-bold rounded-full flex items-center justify-center">
              {thread.unreadCount > 99 ? '99+' : thread.unreadCount}
            </span>
          )}
        </div>

        {/* 내용 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-text-primary truncate">
              {thread.partner.name}
            </span>
            {thread.isBlocked && (
              <span className="flex-shrink-0 px-2 py-0.5 text-[10px] font-medium text-text-tertiary bg-card-soft rounded">
                차단됨
              </span>
            )}
            <span className="flex-shrink-0 text-xs text-text-tertiary ml-auto">
              {formatTime(thread.lastMessageAt)}
            </span>
          </div>
          <p className={`
            text-sm truncate
            ${thread.unreadCount > 0 ? 'text-text-primary font-medium' : 'text-text-secondary'}
          `}>
            {thread.lastMessage}
          </p>
        </div>
      </Link>

      {/* 메뉴 버튼 */}
      <button
        onClick={(e) => onMenuOpen(thread, e)}
        className="flex-shrink-0 w-10 h-10 flex items-center justify-center text-text-tertiary hover:bg-card-soft rounded-full transition-colors"
      >
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <circle cx="12" cy="6" r="2" />
          <circle cx="12" cy="12" r="2" />
          <circle cx="12" cy="18" r="2" />
        </svg>
      </button>
    </div>
  );
}

export default function DmPage() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [selectedThread, setSelectedThread] = useState<Thread | null>(null);

  useEffect(() => {
    const fetchThreads = async () => {
      try {
        const res = await fetch('/api/dm/threads');
        const data = await res.json();
        setThreads(data.items || []);
      } catch (error) {
        console.error('Failed to fetch threads:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchThreads();
  }, []);

  const handleMenuOpen = (thread: Thread, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedThread(thread);
    setShowMenu(true);
  };

  const handleBlock = () => {
    if (!selectedThread) return;
    setThreads(threads.map(t =>
      t.id === selectedThread.id ? { ...t, isBlocked: true } : t
    ));
    setShowMenu(false);
    alert(`${selectedThread.partner.name}님을 차단했습니다.`);
  };

  const handleUnblock = () => {
    if (!selectedThread) return;
    setThreads(threads.map(t =>
      t.id === selectedThread.id ? { ...t, isBlocked: false } : t
    ));
    setShowMenu(false);
    alert(`${selectedThread.partner.name}님의 차단을 해제했습니다.`);
  };

  const handleReport = (type: string, description: string) => {
    if (!selectedThread) return;
    console.log('Report:', { targetUser: selectedThread.partner.name, type, description });
    setShowReport(false);
    setShowMenu(false);
    alert('신고가 접수되었습니다. 검토 후 조치하겠습니다.');
  };

  const totalUnread = threads.reduce((sum, t) => sum + t.unreadCount, 0);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      
      {/* 페이지 헤더 */}
      <div className="bg-white border-b border-border">
        <div className="px-5 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-text-primary">메시지</h1>
              {totalUnread > 0 && (
                <span className="badge-error">{totalUnread}</span>
              )}
            </div>
            
            <button className="w-10 h-10 flex items-center justify-center text-text-secondary hover:bg-card-soft rounded-full transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* 스레드 리스트 */}
      <div className="px-4 py-3 space-y-2">
        {threads.length > 0 ? (
          threads.map((thread, index) => (
            <div 
              key={thread.id}
              className="animate-slide-up"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <ThreadCard thread={thread} onMenuOpen={handleMenuOpen} />
            </div>
          ))
        ) : (
          <div className="empty-state">
            <div className="empty-state-icon">💬</div>
            <p className="empty-state-text">
              아직 메시지가 없습니다
            </p>
          </div>
        )}
      </div>

      {/* 메뉴 모달 */}
      {showMenu && selectedThread && (
        <DmMenu
          isBlocked={selectedThread.isBlocked || false}
          onBlock={handleBlock}
          onUnblock={handleUnblock}
          onReport={() => {
            setShowMenu(false);
            setShowReport(true);
          }}
          onClose={() => setShowMenu(false)}
        />
      )}

      {/* 신고 모달 */}
      <ReportModal
        isOpen={showReport}
        onClose={() => setShowReport(false)}
        targetUser={selectedThread?.partner.name || ''}
        onSubmit={handleReport}
      />
    </div>
  );
}