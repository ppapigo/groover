// src/app/messages/[id]/page.tsx
'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { useAuth } from '@/hooks/useAuth';
import { useSocket } from '@/hooks/useSocket';
import api from '@/lib/api';
import imageCompression from 'browser-image-compression';
import { Image, Plus, ArrowLeft } from 'lucide-react';
export default function ChatPage({ params }) {
    const router = useRouter();
    const { user } = useAuth();
    const { isConnected, joinThread, leaveThread, sendMessage: socketSend, markAsRead, setTyping, on } = useSocket();
    const [messages, setMessages] = useState([]);
    const [participant, setParticipant] = useState(null);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSending, setIsSending] = useState(false);
    const [isPartnerTyping, setIsPartnerTyping] = useState(false);
    const [showAttachMenu, setShowAttachMenu] = useState(false);
    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);
    const typingTimeoutRef = useRef(null);
    useEffect(() => {
        fetchConversation();
    }, [params.id]);
    useEffect(() => {
        if (!isConnected)
            return;
        joinThread(params.id);
        const unsubMessage = on('new_message', (data) => {
            if (data.threadId === params.id) {
                setMessages(prev => [...prev, data.message]);
                if (data.message.sender?.id !== user?.id) {
                    markAsRead(params.id);
                }
            }
        });
        const unsubRead = on('messages_read', (data) => {
            if (data.threadId === params.id) {
                setMessages(prev => prev.map(m => ({ ...m, isRead: true })));
            }
        });
        const unsubTyping = on('user_typing', (data) => {
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
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);
    const fetchConversation = async () => {
        try {
            const threadRes = await api.get('/dm/threads/' + params.id);
            setParticipant(threadRes.data.data?.partner || threadRes.data.partner || threadRes.data);
            const messagesRes = await api.get('/dm/threads/' + params.id + '/messages');
            const messagesData = messagesRes.data.data?.items || messagesRes.data.items || messagesRes.data.data || messagesRes.data || [];
            setMessages(Array.isArray(messagesData) ? messagesData : []);
            if (isConnected)
                markAsRead(params.id);
        }
        catch (err) {
            console.error('대화 불러오기 실패:', err);
        }
        finally {
            setIsLoading(false);
        }
    };
    const handleInputChange = (e) => {
        setInput(e.target.value);
        if (isConnected) {
            setTyping(params.id, true);
            if (typingTimeoutRef.current)
                clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = setTimeout(() => setTyping(params.id, false), 2000);
        }
    };
    const handleSendMessage = async () => {
        if (!input.trim() || isSending)
            return;
        const content = input.trim();
        setInput('');
        setIsSending(true);
        if (isConnected)
            setTyping(params.id, false);
        try {
            if (isConnected) {
                await socketSend(params.id, content);
            }
            else {
                const res = await api.post('/dm/threads/' + params.id + '/messages', { content });
                setMessages(prev => [...prev, res.data.data || res.data]);
            }
        }
        catch (error) {
            console.error('메시지 전송 실패:', error);
            setInput(content);
        }
        finally {
            setIsSending(false);
        }
    };
    const handleImageUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file)
            return;
        setShowAttachMenu(false);
        setIsSending(true);
        try {
            const options = { maxSizeMB: 1, maxWidthOrHeight: 1920, useWebWorker: true };
            const compressedFile = await imageCompression(file, options);
            const formData = new FormData();
            formData.append('image', compressedFile);
            const token = localStorage.getItem('accessToken');
            const uploadRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/v1'}/blog/images/upload`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData,
            });
            const uploadData = await uploadRes.json();
            const imageUrl = uploadData.data?.url || uploadData.url;
            const res = await api.post('/dm/threads/' + params.id + '/messages', {
                content: imageUrl,
                messageType: 'image'
            });
            setMessages(prev => [...prev, res.data.data || res.data]);
        }
        catch (error) {
            console.error('이미지 업로드 실패:', error);
            alert('이미지 업로드에 실패했습니다.');
        }
        finally {
            setIsSending(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };
    const formatTime = (d) => new Date(d).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
    const renderMessage = (msg) => {
        const isImage = msg.messageType === 'image' || (msg.content.startsWith('https://') && (msg.content.includes('.jpg') || msg.content.includes('.png') || msg.content.includes('.jpeg') || msg.content.includes('s3.')));
        if (isImage) {
            return (<img src={msg.content} alt="이미지" style={{ maxWidth: '200px', borderRadius: 12, cursor: 'pointer' }} onClick={() => window.open(msg.content, '_blank')}/>);
        }
        return msg.content;
    };
    const isMyMessage = (msg) => msg.sender?.id === user?.id;
    return (<AuthGuard>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#f5f5f5' }}>
        {/* 헤더 */}
        <header style={{ padding: '12px 16px', background: '#fff', borderBottom: '1px solid #eee', display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => router.back()} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
            <ArrowLeft size={24}/>
          </button>
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, overflow: 'hidden' }}>
            {participant?.profileImageUrl ? (<img src={participant.profileImageUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }}/>) : '👤'}
          </div>
          <div>
            <div style={{ fontWeight: 600 }}>{participant?.name}</div>
            {isConnected && <div style={{ fontSize: 12, color: '#22c55e' }}>● 연결됨</div>}
          </div>
        </header>

        {/* 메시지 목록 */}
        <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
          {isLoading ? (<div style={{ textAlign: 'center', color: '#999' }}>로딩 중...</div>) : messages.length === 0 ? (<div style={{ textAlign: 'center', color: '#999', marginTop: 40 }}>대화를 시작해보세요!</div>) : (messages.map(msg => (<div key={msg.id} style={{ display: 'flex', justifyContent: isMyMessage(msg) ? 'flex-end' : 'flex-start', marginBottom: 8 }}>
                <div style={{ maxWidth: '70%', display: 'flex', flexDirection: isMyMessage(msg) ? 'row-reverse' : 'row', alignItems: 'flex-end', gap: 6 }}>
                  <div style={{
                padding: '10px 14px',
                borderRadius: isMyMessage(msg) ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                background: isMyMessage(msg) ? '#0f62fe' : '#fff',
                color: isMyMessage(msg) ? '#fff' : '#333',
                fontSize: 14
            }}>
                    {renderMessage(msg)}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: isMyMessage(msg) ? 'flex-end' : 'flex-start', gap: 2 }}>
                    {isMyMessage(msg) && !msg.isRead && (<span style={{ fontSize: 11, color: '#facc15', fontWeight: 600 }}>1</span>)}
                    <span style={{ fontSize: 11, color: '#999' }}>{formatTime(msg.createdAt)}</span>
                  </div>
                </div>
              </div>)))}
          {isPartnerTyping && (<div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#999', fontSize: 13 }}>
              <span>입력 중...</span>
            </div>)}
          <div ref={messagesEndRef}/>
        </div>

        {/* 첨부 메뉴 - 사진만 */}
        {showAttachMenu && (<div style={{ padding: 16, background: '#fff', borderTop: '1px solid #eee', display: 'flex', gap: 24, justifyContent: 'center' }}>
            <button onClick={() => fileInputRef.current?.click()} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer' }}>
              <div style={{ width: 50, height: 50, borderRadius: '50%', background: '#e8f4ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Image size={24} color="#0f62fe"/>
              </div>
              <span style={{ fontSize: 12, color: '#666' }}>사진</span>
            </button>
          </div>)}

        {/* 입력창 */}
        <div style={{ padding: '12px 16px', background: '#fff', borderTop: '1px solid #eee', display: 'flex', gap: 8, alignItems: 'center' }}>
          <button onClick={() => setShowAttachMenu(!showAttachMenu)} style={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            background: showAttachMenu ? '#0f62fe' : '#f5f5f5',
            color: showAttachMenu ? '#fff' : '#666',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
        }}>
            <Plus size={20}/>
          </button>
          <input value={input} onChange={handleInputChange} onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSendMessage()} placeholder="메시지 입력..." style={{ flex: 1, padding: '12px 16px', border: '1px solid #eee', borderRadius: 24, fontSize: 14, outline: 'none' }}/>
          <button onClick={handleSendMessage} disabled={!input.trim() || isSending} style={{ padding: '12px 20px', background: input.trim() && !isSending ? '#0f62fe' : '#ccc', color: '#fff', border: 'none', borderRadius: 24, fontWeight: 600, cursor: input.trim() && !isSending ? 'pointer' : 'default' }}>
            {isSending ? '...' : '전송'}
          </button>
        </div>

        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }}/>
      </div>
    </AuthGuard>);
}
