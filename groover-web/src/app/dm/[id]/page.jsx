// src/app/dm/[id]/page.tsx
'use client';
import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { ChevronLeft, MoreVertical, Plus, Send } from 'lucide-react';
import DmMenu from '@/components/dm/DmMenu';
import ReportModal from '@/components/dm/ReportModal';
function MessageBubble({ message, currentUserId }) {
    const isMe = message.sender?.id === currentUserId;
    const formatTime = (dateString) => {
        return new Date(dateString).toLocaleTimeString('ko-KR', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };
    return (<div className={`flex ${isMe ? 'justify-end' : 'justify-start'} animate-slide-up`}>
      <div className={`flex items-end gap-1.5 max-w-[75%] ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
        <div className={`
            px-4 py-2.5 text-[15px] leading-relaxed
            ${isMe
            ? 'bg-primary text-white rounded-[20px] rounded-br-md'
            : 'bg-card-soft text-text-primary rounded-[20px] rounded-bl-md'}
          `}>
          {message.content}
        </div>
        <div className={`flex flex-col gap-0.5 ${isMe ? 'items-end' : 'items-start'}`}>
          {isMe && !message.isRead && (<span className="text-[11px] text-yellow-500 font-semibold">1</span>)}
          <span className="text-[11px] text-text-tertiary">
            {formatTime(message.createdAt)}
          </span>
        </div>
      </div>
    </div>);
}
export default function DmChatPage({ params }) {
    const [messages, setMessages] = useState([]);
    const [partner, setPartner] = useState(null);
    const [currentUserId, setCurrentUserId] = useState('');
    const [input, setInput] = useState('');
    const [isBlocked, setIsBlocked] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const [showReport, setShowReport] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);
    useEffect(() => {
        const fetchData = async () => {
            try {
                // 현재 사용자 정보
                const userRes = await fetch('/api/v1/auth/me');
                const userData = await userRes.json();
                setCurrentUserId(userData.data?.id || userData.id);
                // 스레드 정보
                const threadRes = await fetch(`/api/v1/dm/threads/${params.id}`);
                const threadData = await threadRes.json();
                setPartner(threadData.data?.partner);
                // 메시지 목록
                const messagesRes = await fetch(`/api/v1/dm/threads/${params.id}/messages`);
                const messagesData = await messagesRes.json();
                setMessages(messagesData.data?.items || []);
            }
            catch (error) {
                console.error('Failed to fetch DM data:', error);
            }
            finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [params.id]);
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);
    const sendMessage = async () => {
        if (!input.trim() || isBlocked || !currentUserId)
            return;
        const tempMessage = {
            id: `temp-${Date.now()}`,
            threadId: params.id,
            sender: { id: currentUserId, name: '' },
            content: input.trim(),
            messageType: 'TEXT',
            isRead: false,
            createdAt: new Date().toISOString(),
        };
        setMessages(prev => [...prev, tempMessage]);
        const messageContent = input.trim();
        setInput('');
        inputRef.current?.focus();
        try {
            const res = await fetch(`/api/v1/dm/threads/${params.id}/messages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: messageContent }),
            });
            const result = await res.json();
            setMessages(prev => prev.map(msg => msg.id === tempMessage.id ? result.data : msg));
        }
        catch (error) {
            console.error('Failed to send message:', error);
            setMessages(prev => prev.filter(msg => msg.id !== tempMessage.id));
        }
    };
    const handleBlock = async () => {
        if (!partner)
            return;
        try {
            await fetch('/api/v1/dm/block', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ targetUserId: partner.id }),
            });
            setIsBlocked(true);
            setShowMenu(false);
            alert(`${partner.name}님을 차단했습니다.`);
        }
        catch (error) {
            console.error('Failed to block:', error);
        }
    };
    const handleUnblock = async () => {
        if (!partner)
            return;
        try {
            await fetch('/api/v1/dm/unblock', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ targetUserId: partner.id }),
            });
            setIsBlocked(false);
            setShowMenu(false);
            alert(`${partner.name}님의 차단을 해제했습니다.`);
        }
        catch (error) {
            console.error('Failed to unblock:', error);
        }
    };
    const handleReport = async (type, description) => {
        if (!partner)
            return;
        try {
            await fetch('/api/v1/dm/report', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ targetUserId: partner.id, type, description }),
            });
            setShowReport(false);
            alert('신고가 접수되었습니다.');
        }
        catch (error) {
            console.error('Failed to report:', error);
        }
    };
    if (isLoading) {
        return (<div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>);
    }
    return (<div className="flex flex-col h-screen bg-background">
      <header className="flex-shrink-0 bg-white border-b border-border safe-area-pt">
        <div className="flex items-center justify-between h-14 px-4">
          <div className="flex items-center gap-3">
            <Link href="/dm" className="p-2 -ml-2">
              <ChevronLeft size={24}/>
            </Link>

            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-primary-light flex items-center justify-center text-lg overflow-hidden">
                {partner?.profileImageUrl ? (<img src={partner.profileImageUrl} alt={partner.name} className="w-full h-full object-cover"/>) : ('👤')}
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-text-primary">{partner?.name}</span>
                {isBlocked && (<span className="px-2 py-0.5 text-[10px] font-medium text-text-tertiary bg-card-soft rounded">
                    차단됨
                  </span>)}
              </div>
            </div>
          </div>

          <button onClick={() => setShowMenu(true)} className="p-2 -mr-2">
            <MoreVertical size={24}/>
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.length > 0 && (<div className="flex items-center justify-center my-4">
            <span className="px-3 py-1 bg-card-soft text-text-tertiary text-xs rounded-full">
              오늘
            </span>
          </div>)}

        {messages.map((msg) => (<MessageBubble key={msg.id} message={msg} currentUserId={currentUserId}/>))}
        <div ref={messagesEndRef}/>
      </div>

      {isBlocked ? (<div className="flex-shrink-0 bg-card-soft border-t border-border px-5 py-4 safe-area-pb">
          <div className="text-center">
            <p className="text-sm text-text-secondary mb-3">이 사용자를 차단했습니다</p>
            <button onClick={handleUnblock} className="btn-secondary text-sm">
              차단 해제
            </button>
          </div>
        </div>) : (<div className="flex-shrink-0 bg-white border-t border-border px-4 py-3 safe-area-pb">
          <div className="flex items-center gap-2">
            <button className="w-10 h-10 flex-shrink-0 flex items-center justify-center text-text-tertiary hover:bg-card-soft rounded-full transition-colors">
              <Plus size={24}/>
            </button>

            <div className="flex-1">
              <input ref={inputRef} type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && sendMessage()} placeholder="메시지 입력..." className="w-full px-4 py-2.5 bg-card-soft rounded-full text-[15px] placeholder:text-text-tertiary focus:ring-2 focus:ring-primary focus:ring-opacity-20 outline-none"/>
            </div>

            <button onClick={sendMessage} disabled={!input.trim()} className={`
                w-10 h-10 flex-shrink-0 rounded-full flex items-center justify-center transition-all
                ${input.trim()
                ? 'bg-primary text-white shadow-sm active:scale-95'
                : 'bg-card-soft text-text-tertiary'}
              `}>
              <Send size={20}/>
            </button>
          </div>
        </div>)}

      {showMenu && (<DmMenu isBlocked={isBlocked} onBlock={handleBlock} onUnblock={handleUnblock} onReport={() => {
                setShowMenu(false);
                setShowReport(true);
            }} onClose={() => setShowMenu(false)}/>)}

      <ReportModal isOpen={showReport} onClose={() => setShowReport(false)} targetUser={partner?.name || ''} onSubmit={handleReport}/>
    </div>);
}
