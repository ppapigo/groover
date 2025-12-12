// src/app/dm/[id]/page.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { ChevronLeft, MoreVertical, Plus, Send } from 'lucide-react';
import DmMenu from '@/components/dm/DmMenu';
import ReportModal from '@/components/dm/ReportModal';

interface Message {
  id: string;
  role: 'me' | 'other';
  text: string;
  time: string;
}

const partner = {
  id: '1',
  name: '쇼핑러버',
  isBlocked: false,
  profileImage: '',
};

const mockMessages: Message[] = [
  { id: '1', role: 'other', text: '안녕하세요! 쇼핑러버입니다.', time: '14:00' },
  { id: '2', role: 'other', text: '작성해주신 리뷰 글 보고 연락드렸어요.', time: '14:01' },
  { id: '3', role: 'me', text: '안녕하세요! 어떤 내용인가요?', time: '14:05' },
  { id: '4', role: 'other', text: '제품 사용 후기 공유해주실 수 있나요?', time: '14:10' },
];

interface MessageBubbleProps {
  message: Message;
}

function MessageBubble({ message }: MessageBubbleProps) {
  const isMe = message.role === 'me';

  return (
    <div className={`flex ${isMe ? 'justify-end' : 'justify-start'} animate-slide-up`}>
      <div className={`max-w-[75%] ${isMe ? 'order-2' : ''}`}>
        <div
          className={`
            px-4 py-2.5 text-[15px] leading-relaxed
            ${isMe
              ? 'bg-primary text-white rounded-[20px] rounded-br-md'
              : 'bg-card-soft text-text-primary rounded-[20px] rounded-bl-md'
            }
          `}
        >
          {message.text}
        </div>
        <p className={`text-[11px] text-text-tertiary mt-1 ${isMe ? 'text-right' : 'text-left'}`}>
          {message.time}
        </p>
      </div>
    </div>
  );
}

export default function DmChatPage({ params }: { params: { id: string } }) {
  const [messages, setMessages] = useState<Message[]>(mockMessages);
  const [input, setInput] = useState('');
  const [isBlocked, setIsBlocked] = useState(partner.isBlocked);
  const [showMenu, setShowMenu] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = () => {
    if (!input.trim() || isBlocked) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      role: 'me',
      text: input.trim(),
      time: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages([...messages, newMessage]);
    setInput('');
    inputRef.current?.focus();
  };

  const handleBlock = () => {
    setIsBlocked(true);
    setShowMenu(false);
    alert(`${partner.name}님을 차단했습니다.`);
  };

  const handleUnblock = () => {
    setIsBlocked(false);
    setShowMenu(false);
    alert(`${partner.name}님의 차단을 해제했습니다.`);
  };

  const handleReport = (type: string, description: string) => {
    console.log('Report:', { targetUser: partner.name, type, description });
    setShowReport(false);
    alert('신고가 접수되었습니다. 검토 후 조치하겠습니다.');
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* 헤더 */}
      <header className="flex-shrink-0 bg-white border-b border-border safe-area-pt">
        <div className="flex items-center justify-between h-14 px-4">
          <div className="flex items-center gap-3">
            <Link href="/dm" className="p-2 -ml-2">
              <ChevronLeft size={24} />
            </Link>

            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-primary-light flex items-center justify-center text-lg">
                👤
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-text-primary">{partner.name}</span>
                  {isBlocked && (
                    <span className="px-2 py-0.5 text-[10px] font-medium text-text-tertiary bg-card-soft rounded">
                      차단됨
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <button onClick={() => setShowMenu(true)} className="p-2 -mr-2">
            <MoreVertical size={24} />
          </button>
        </div>
      </header>

      {/* 메시지 영역 */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        <div className="flex items-center justify-center my-4">
          <span className="px-3 py-1 bg-card-soft text-text-tertiary text-xs rounded-full">
            오늘
          </span>
        </div>

        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* 입력 영역 */}
      {isBlocked ? (
        <div className="flex-shrink-0 bg-card-soft border-t border-border px-5 py-4 safe-area-pb">
          <div className="text-center">
            <p className="text-sm text-text-secondary mb-3">
              이 사용자를 차단했습니다
            </p>
            <button onClick={handleUnblock} className="btn-secondary text-sm">
              차단 해제
            </button>
          </div>
        </div>
      ) : (
        <div className="flex-shrink-0 bg-white border-t border-border px-4 py-3 safe-area-pb">
          <div className="flex items-center gap-2">
            <button className="w-10 h-10 flex-shrink-0 flex items-center justify-center text-text-tertiary hover:bg-card-soft rounded-full transition-colors">
              <Plus size={24} />
            </button>

            <div className="flex-1 relative">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="메시지 입력..."
                className="w-full px-4 py-2.5 bg-card-soft rounded-full text-[15px] placeholder:text-text-tertiary focus:ring-2 focus:ring-primary focus:ring-opacity-20 outline-none"
              />
            </div>

            <button
              onClick={sendMessage}
              disabled={!input.trim()}
              className={`
                w-10 h-10 flex-shrink-0 rounded-full flex items-center justify-center transition-all
                ${input.trim()
                  ? 'bg-primary text-white shadow-sm active:scale-95'
                  : 'bg-card-soft text-text-tertiary'
                }
              `}
            >
              <Send size={20} />
            </button>
          </div>
        </div>
      )}

      {/* 메뉴 모달 */}
      {showMenu && (
        <DmMenu
          isBlocked={isBlocked}
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
        targetUser={partner.name}
        onSubmit={handleReport}
      />
    </div>
  );
}