'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { useAuth } from '@/hooks/useAuth';
import { useSocket } from '@/hooks/useSocket';
import api from '@/lib/api';

interface Message {
  id: string;
  content: string;
  senderId: string;
  createdAt: string;
  isRead: boolean;
}

interface Participant {
  id: string;
  name: string;
  profileImageUrl: string | null;
}

export default function ChatPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { user } = useAuth();
  const { isConnected, joinThread, leaveThread, sendMessage: socketSend, markAsRead, setTyping, on } = useSocket();
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [participant, setParticipant] = useState<Participant | null>(null);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isPartnerTyping, setIsPartnerTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 초기 데이터 로드
  useEffect(() => {
    fetchConversation();
  }, [params.id]);

  // 소켓 연결 및 이벤트 리스너
  useEffect(() => {
    if (!isConnected) return;

    // 스레드 참가
    joinThread(params.id);

    // 새 메시지 수신
    const unsubMessage = on('new_message', (data: any) => {
      if (data.threadId === params.id) {
        setMessages(prev => [...prev, data.message]);
        // 상대방 메시지면 읽음 처리
        if (data.message.senderId !== user?.id) {
          markAsRead(params.id);
        }
      }
    });

    // 읽음 상태 업데이트
    const unsubRead = on('messages_read', (data: any) => {
      if (data.threadId === params.id) {
        setMessages(prev => prev.map(m => ({ ...m, isRead: true })));
      }
    });

    // 타이핑 상태
    const unsubTyping = on('user_typing', (data: any) => {
      if (data.threadId === params.id && data.userId !== user?.id) {
        setIsPartnerTyping(data.isTyping);
      }
    });

    return () => {
      leaveThread(params.id);
      unsubMessage();
      unsubRead();
      unsubTyping();
    };
  }, [isConnected, params.id, user?.id]);

  // 스크롤
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchConversation = async () => {
    try {
      const res = await api.get('/dm/threads/' + params.id);
      setParticipant(res.data.data.partner);
      setMessages(res.data.data.messages || []);
      // 읽음 처리
      if (isConnected) markAsRead(params.id);
    } catch {
      setParticipant({ id: 'user1', name: '사용자', profileImageUrl: null });
      setMessages([]);
    } finally {
      setIsLoading(false);
    }
  };

  // 타이핑 핸들러
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);

    // 타이핑 표시
    if (isConnected) {
      setTyping(params.id, true);

      // 2초 후 타이핑 종료
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      typingTimeoutRef.current = setTimeout(() => {
        setTyping(params.id, false);
      }, 2000);
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim() || isSending) return;

    const content = input.trim();
    setInput('');
    setIsSending(true);

    // 타이핑 종료
    if (isConnected) {
      setTyping(params.id, false);
    }

    try {
      if (isConnected) {
        // 웹소켓으로 전송
        await socketSend(params.id, content);
      } else {
        // HTTP 폴백
        const res = await api.post('/dm/threads/' + params.id + '/messages', { content });
        setMessages(prev => [...prev, res.data.data]);
      }
    } catch (error) {
      console.error('메시지 전송 실패:', error);
      setInput(content); // 실패 시 복원
    } finally {
      setIsSending(false);
    }
  };

  const formatTime = (d: string) => new Date(d).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });

  return (
    <AuthGuard>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#f5f5f5' }}>
        {/* 헤더 */}
        <header style={{ padding: '12px 16px', background: '#fff', borderBottom: '1px solid #eee', display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => router.back()} style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer' }}>←</button>
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
            {participant?.profileImageUrl ? (
              <img src={participant.profileImageUrl} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
            ) : '👤'}
          </div>
          <div>
            <div style={{ fontWeight: 600 }}>{participant?.name}</div>
            {isConnected && (
              <div style={{ fontSize: 12, color: '#22c55e' }}>● 연결됨</div>
            )}
          </div>
        </header>

        {/* 메시지 목록 */}
        <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
          {isLoading ? (
            <div style={{ textAlign: 'center', color: '#999' }}>로딩 중...</div>
          ) : messages.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#999', marginTop: 40 }}>
              대화를 시작해보세요!
            </div>
          ) : (
            messages.map(msg => (
              <div key={msg.id} style={{ display: 'flex', justifyContent: msg.senderId === user?.id ? 'flex-end' : 'flex-start', marginBottom: 8 }}>
                <div style={{ maxWidth: '70%', display: 'flex', flexDirection: msg.senderId === user?.id ? 'row-reverse' : 'row', alignItems: 'flex-end', gap: 6 }}>
                  <div style={{ 
                    padding: '10px 14px', 
                    borderRadius: msg.senderId === user?.id ? '16px 16px 4px 16px' : '16px 16px 16px 4px', 
                    background: msg.senderId === user?.id ? '#0f62fe' : '#fff', 
                    color: msg.senderId === user?.id ? '#fff' : '#333', 
                    fontSize: 14 
                  }}>
                    {msg.content}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: msg.senderId === user?.id ? 'flex-end' : 'flex-start', gap: 2 }}>
                    <span style={{ fontSize: 11, color: '#999' }}>{formatTime(msg.createdAt)}</span>
                    {msg.senderId === user?.id && msg.isRead && (
                      <span style={{ fontSize: 10, color: '#22c55e' }}>읽음</span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
          
          {/* 타이핑 표시 */}
          {isPartnerTyping && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#999', fontSize: 13 }}>
              <span>입력 중</span>
              <span style={{ animation: 'pulse 1s infinite' }}>...</span>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* 입력창 */}
        <div style={{ padding: '12px 16px', background: '#fff', borderTop: '1px solid #eee', display: 'flex', gap: 8 }}>
          <input 
            value={input} 
            onChange={handleInputChange} 
            onKeyPress={e => e.key === 'Enter' && handleSendMessage()} 
            placeholder="메시지 입력..." 
            style={{ flex: 1, padding: '12px 16px', border: '1px solid #eee', borderRadius: 24, fontSize: 14, outline: 'none' }} 
          />
          <button 
            onClick={handleSendMessage} 
            disabled={!input.trim() || isSending} 
            style={{ 
              padding: '12px 20px', 
              background: input.trim() && !isSending ? '#0f62fe' : '#ccc', 
              color: '#fff', 
              border: 'none', 
              borderRadius: 24, 
              fontWeight: 600, 
              cursor: input.trim() && !isSending ? 'pointer' : 'default' 
            }}
          >
            {isSending ? '...' : '전송'}
          </button>
        </div>
      </div>
    </AuthGuard>
  );
}