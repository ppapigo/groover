'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';

interface Message { id: string; content: string; senderId: string; createdAt: string; }
interface Participant { id: string; name: string; profileImageUrl: string | null; }

export default function ChatPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [participant, setParticipant] = useState<Participant | null>(null);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { fetchConversation(); }, [params.id]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const fetchConversation = async () => {
    try {
      const res = await api.get('/dm/conversations/' + params.id);
      setParticipant(res.data.data.participant);
      setMessages(res.data.data.messages || []);
    } catch {
      setParticipant({ id: 'user1', name: '육아맘', profileImageUrl: null });
      setMessages([
        { id: '1', content: '안녕하세요!', senderId: 'user1', createdAt: new Date(Date.now() - 3600000).toISOString() },
        { id: '2', content: '안녕하세요! 반갑습니다~', senderId: 'me', createdAt: new Date(Date.now() - 3500000).toISOString() },
        { id: '3', content: '육아템 글 정말 도움이 많이 됐어요', senderId: 'user1', createdAt: new Date(Date.now() - 60000).toISOString() },
      ]);
    } finally { setIsLoading(false); }
  };

  const sendMessage = async () => {
    if (!input.trim()) return;
    const content = input.trim();
    setInput('');
    const tempMsg: Message = { id: 'temp-' + Date.now(), content, senderId: 'me', createdAt: new Date().toISOString() };
    setMessages(prev => [...prev, tempMsg]);
    try { await api.post('/dm/conversations/' + params.id + '/messages', { content }); } catch {}
  };

  const formatTime = (d: string) => new Date(d).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });

  return (
    <AuthGuard>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#f5f5f5' }}>
        <header style={{ padding: '12px 16px', background: '#fff', borderBottom: '1px solid #eee', display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => router.back()} style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer' }}>←</button>
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>👤</div>
          <span style={{ fontWeight: 600 }}>{participant?.name}</span>
        </header>
        <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
          {isLoading ? <div style={{ textAlign: 'center', color: '#999' }}>로딩 중...</div> : messages.map(msg => (
            <div key={msg.id} style={{ display: 'flex', justifyContent: msg.senderId === 'me' ? 'flex-end' : 'flex-start', marginBottom: 8 }}>
              <div style={{ maxWidth: '70%', display: 'flex', flexDirection: msg.senderId === 'me' ? 'row-reverse' : 'row', alignItems: 'flex-end', gap: 6 }}>
                <div style={{ padding: '10px 14px', borderRadius: msg.senderId === 'me' ? '16px 16px 4px 16px' : '16px 16px 16px 4px', background: msg.senderId === 'me' ? '#0f62fe' : '#fff', color: msg.senderId === 'me' ? '#fff' : '#333', fontSize: 14 }}>{msg.content}</div>
                <span style={{ fontSize: 11, color: '#999' }}>{formatTime(msg.createdAt)}</span>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
        <div style={{ padding: '12px 16px', background: '#fff', borderTop: '1px solid #eee', display: 'flex', gap: 8 }}>
          <input value={input} onChange={e => setInput(e.target.value)} onKeyPress={e => e.key === 'Enter' && sendMessage()} placeholder="메시지 입력..." style={{ flex: 1, padding: '12px 16px', border: '1px solid #eee', borderRadius: 24, fontSize: 14, outline: 'none' }} />
          <button onClick={sendMessage} disabled={!input.trim()} style={{ padding: '12px 20px', background: input.trim() ? '#0f62fe' : '#ccc', color: '#fff', border: 'none', borderRadius: 24, fontWeight: 600, cursor: input.trim() ? 'pointer' : 'default' }}>전송</button>
        </div>
      </div>
    </AuthGuard>
  );
}