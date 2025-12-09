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
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showNewChat, setShowNewChat] = useState(false);
  const [searchUser, setSearchUser] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);

  useEffect(() => { fetchConversations(); }, []);

 const fetchConversations = async () => {
  try {
    const res = await api.get('/dm/threads');
    const data = res.data.data || res.data || [];
    setConversations(Array.isArray(data) ? data : []);
  } catch {
    setConversations([]);
  } finally { 
    setIsLoading(false); 
  }
};

  const handleSearchUser = async (query: string) => {
    setSearchUser(query);
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }
    try {
      const res = await api.get(`/search?q=${encodeURIComponent(query)}`);
      setSearchResults(res.data.users || []);
    } catch {
      setSearchResults([]);
    }
  };

  const startNewChat = async (userId: string) => {
    try {
      const res = await api.post('/dm/start', { targetUserId: userId });
      const threadId = res.data.data?.id || res.data.id;
      setShowNewChat(false);
      router.push(`/messages/${threadId}`);
    } catch (err) {
      alert('대화를 시작할 수 없습니다.');
    }
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
        {/* 헤더 + 새 대화 버튼 */}
        <div style={{ padding: 16, background: '#fff', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>메시지</h1>
          <button
            onClick={() => setShowNewChat(true)}
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: '#0f62fe',
              color: '#fff',
              border: 'none',
              fontSize: 24,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            +
          </button>
        </div>

        {/* 새 대화 모달 */}
        {showNewChat && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}>
            <div style={{
              background: '#fff',
              borderRadius: 16,
              padding: 24,
              width: '90%',
              maxWidth: 400,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                <h2 style={{ margin: 0, fontSize: 18 }}>새 대화</h2>
                <button onClick={() => setShowNewChat(false)} style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer' }}>×</button>
              </div>
              <input
                type="text"
                placeholder="사용자 이름 검색..."
                value={searchUser}
                onChange={(e) => handleSearchUser(e.target.value)}
                style={{
                  width: '100%',
                  padding: 12,
                  border: '1px solid #ddd',
                  borderRadius: 8,
                  fontSize: 16,
                  marginBottom: 16,
                }}
              />
              <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                {searchResults.map((user) => (
                  <div
                    key={user.id}
                    onClick={() => startNewChat(user.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: 12,
                      cursor: 'pointer',
                      borderRadius: 8,
                    }}
                  >
                    <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>👤</div>
                    <span>{user.name}</span>
                  </div>
                ))}
                {searchUser.length >= 2 && searchResults.length === 0 && (
                  <p style={{ textAlign: 'center', color: '#999' }}>사용자를 찾을 수 없습니다.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 대화 목록 */}
        {isLoading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#999' }}>로딩 중...</div>
        ) : conversations.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#999' }}>
            <p>메시지가 없습니다.</p>
            <button
              onClick={() => setShowNewChat(true)}
              style={{
                marginTop: 16,
                padding: '12px 24px',
                background: '#0f62fe',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                cursor: 'pointer',
              }}
            >
              새 대화 시작하기
            </button>
          </div>
        ) : (
          conversations.map(conv => (
            <Link key={conv.id} href={'/messages/' + conv.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 16, background: '#fff', borderBottom: '1px solid #f0f0f0', textDecoration: 'none', color: 'inherit' }}>
              <div style={{ width: 50, height: 50, borderRadius: '50%', background: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>👤</div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontWeight: conv.unreadCount > 0 ? 700 : 500 }}>{conv.participant.name}</span>
                  <span style={{ fontSize: 12, color: '#999' }}>{formatTime(conv.lastMessage?.createdAt || new Date().toISOString())}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <p style={{ fontSize: 14, color: conv.unreadCount > 0 ? '#333' : '#999', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, margin: 0 }}>{conv.lastMessage?.content || '대화를 시작하세요'}</p>
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