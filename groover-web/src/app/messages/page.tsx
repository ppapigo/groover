'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AppHeader from '@/components/layout/AppHeader';
import { AuthGuard } from '@/components/auth/AuthGuard';
import api from '@/lib/api';

interface Conversation {
  id: string;
  participant: { id: string; name: string; profileImageUrl: string | null };
  lastMessage: { content: string; createdAt: string; isRead: boolean };
  unreadCount: number;
}

export default function MessagesPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => { fetchConversations(); }, []);

  const fetchConversations = async () => {
    try {
      const res = await api.get('/dm/conversations');
      setConversations(res.data.data || []);
    } catch {
      setConversations([
        { id: '1', participant: { id: 'user1', name: '육아맘', profileImageUrl: null }, lastMessage: { content: '안녕하세요! 육아템 글 잘 봤어요~', createdAt: new Date().toISOString(), isRead: false }, unreadCount: 2 },
        { id: '2', participant: { id: 'user2', name: '캠핑러버', profileImageUrl: null }, lastMessage: { content: '캠핑 장비 추천 감사합니다!', createdAt: new Date(Date.now() - 3600000).toISOString(), isRead: true }, unreadCount: 0 },
      ]);
    } finally { setIsLoading(false); }
  };

  const formatTime = (dateString: string) => {
    const diff = Date.now() - new Date(dateString).getTime();
    if (diff < 60000) return '방금';
    if (diff < 3600000) return Math.floor(diff / 60000) + '분 전';
    if (diff < 86400000) return Math.floor(diff / 3600000) + '시간 전';
    return Math.floor(diff / 86400000) + '일 전';
  };

  return (
    <AuthGuard>
      <AppHeader />
      <div style={{ minHeight: '100vh', background: '#f5f5f5' }}>
        <div style={{ padding: 16, background: '#fff', borderBottom: '1px solid #eee' }}>
          <h1 style={{ fontSize: 20, fontWeight: 700 }}>메시지</h1>
        </div>
        {isLoading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#999' }}>로딩 중...</div>
        ) : conversations.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#999' }}>메시지가 없습니다.</div>
        ) : (
          conversations.map(conv => (
            <Link key={conv.id} href={'/messages/' + conv.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 16, background: '#fff', borderBottom: '1px solid #f0f0f0', textDecoration: 'none', color: 'inherit' }}>
              <div style={{ width: 50, height: 50, borderRadius: '50%', background: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>👤</div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontWeight: conv.unreadCount > 0 ? 700 : 500 }}>{conv.participant.name}</span>
                  <span style={{ fontSize: 12, color: '#999' }}>{formatTime(conv.lastMessage.createdAt)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <p style={{ fontSize: 14, color: conv.unreadCount > 0 ? '#333' : '#999', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{conv.lastMessage.content}</p>
                  {conv.unreadCount > 0 && <span style={{ marginLeft: 8, padding: '2px 8px', background: '#0f62fe', color: '#fff', borderRadius: 10, fontSize: 12 }}>{conv.unreadCount}</span>}
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </AuthGuard>
  );
}