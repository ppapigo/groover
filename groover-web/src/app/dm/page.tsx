// src/app/dm/page.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import AppHeader from '@/components/layout/AppHeader';
import DmMenu from '@/components/dm/DmMenu';
import ReportModal from '@/components/dm/ReportModal';

interface Thread {
  id: string;
  name: string;
  lastMessage: string;
  time: string;
  unread: number;
  isBlocked: boolean;
  hasProposal?: boolean;
}

const initialThreads: Thread[] = [
  {
    id: '1',
    name: '뷰티브랜드A',
    lastMessage: '안녕하세요! 제품 리뷰 협찬 제안 드립니다.',
    time: '2시간 전',
    unread: 2,
    isBlocked: false,
    hasProposal: true,
  },
  {
    id: '2',
    name: '캠핑러버',
    lastMessage: '그 텐트 어디서 구매하셨어요?',
    time: '어제',
    unread: 0,
    isBlocked: false,
  },
  {
    id: '3',
    name: '육아맘모임',
    lastMessage: '정보 공유 감사합니다~',
    time: '3일 전',
    unread: 0,
    isBlocked: false,
  },
  {
    id: '4',
    name: '스팸유저',
    lastMessage: '광고입니다...',
    time: '1주 전',
    unread: 0,
    isBlocked: true,
  },
];

export default function DmPage() {
  const [threads, setThreads] = useState(initialThreads);
  const [showMenu, setShowMenu] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [selectedThread, setSelectedThread] = useState<Thread | null>(null);

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
    alert(`${selectedThread.name}님을 차단했습니다.`);
  };

  const handleUnblock = () => {
    if (!selectedThread) return;
    setThreads(threads.map(t =>
      t.id === selectedThread.id ? { ...t, isBlocked: false } : t
    ));
    alert(`${selectedThread.name}님의 차단을 해제했습니다.`);
  };

  const handleReport = (type: string, description: string) => {
    if (!selectedThread) return;
    console.log('Report:', { targetUser: selectedThread.name, type, description });
    alert('신고가 접수되었습니다. 검토 후 조치하겠습니다.');
  };

  return (
    <>
      <AppHeader />
      <div style={{ padding: '16px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '16px' }}>
          💬 메시지
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {threads.map((thread) => (
            <div
              key={thread.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '14px',
                background: thread.isBlocked ? '#f9f9f9' : '#fff',
                border: '1px solid #eee',
                borderRadius: '12px',
                opacity: thread.isBlocked ? 0.6 : 1,
              }}
            >
              <Link
                href={thread.isBlocked ? '#' : `/dm/${thread.id}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  flex: 1,
                  textDecoration: 'none',
                  color: '#333',
                }}
              >
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    background: thread.hasProposal ? '#e8f0fe' : '#f0f0f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '20px',
                  }}
                >
                  {thread.hasProposal ? '💼' : '👤'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{ fontWeight: '600', fontSize: '14px' }}>{thread.name}</span>
                    {thread.isBlocked && (
                      <span
                        style={{
                          fontSize: '10px',
                          color: '#999',
                          background: '#eee',
                          padding: '2px 6px',
                          borderRadius: '4px',
                        }}
                      >
                        차단됨
                      </span>
                    )}
                    {thread.hasProposal && !thread.isBlocked && (
                      <span
                        style={{
                          fontSize: '10px',
                          color: '#0f62fe',
                          background: '#e8f0fe',
                          padding: '2px 6px',
                          borderRadius: '4px',
                        }}
                      >
                        광고제안
                      </span>
                    )}
                    <span style={{ fontSize: '12px', color: '#999', marginLeft: 'auto' }}>{thread.time}</span>
                  </div>
                  <p
                    style={{
                      fontSize: '13px',
                      color: thread.unread > 0 ? '#333' : '#999',
                      fontWeight: thread.unread > 0 ? '500' : 'normal',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {thread.lastMessage}
                  </p>
                </div>
              </Link>

              {/* 읽지 않은 메시지 뱃지 */}
              {thread.unread > 0 && (
                <span
                  style={{
                    minWidth: '20px',
                    height: '20px',
                    background: '#ef4444',
                    color: '#fff',
                    borderRadius: '999px',
                    fontSize: '11px',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {thread.unread}
                </span>
              )}

              {/* 메뉴 버튼 */}
              <button
                onClick={(e) => handleMenuOpen(thread, e)}
                style={{
                  padding: '8px',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '16px',
                  color: '#999',
                }}
              >
                ⋯
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* 메뉴 */}
      {showMenu && selectedThread && (
        <DmMenu
          isBlocked={selectedThread.isBlocked}
          onBlock={handleBlock}
          onUnblock={handleUnblock}
          onReport={() => setShowReport(true)}
          onClose={() => setShowMenu(false)}
        />
      )}

      {/* 신고 모달 */}
      <ReportModal
        isOpen={showReport}
        onClose={() => setShowReport(false)}
        targetUser={selectedThread?.name || ''}
        onSubmit={handleReport}
      />
    </>
  );
}
