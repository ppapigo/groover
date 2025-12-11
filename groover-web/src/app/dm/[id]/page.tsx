// src/app/dm/[id]/page.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import DmMenu from '@/components/dm/DmMenu';
import ReportModal from '@/components/dm/ReportModal';
import AdProposalCard from '@/components/dm/AdProposalCard';

interface Message {
  id: string;
  role: 'me' | 'other' | 'proposal';
  text: string;
  time: string;
  proposal?: {
    id: string;
    advertiser: string;
    title: string;
    amount: number;
    description?: string;
    status: 'pending' | 'accepted' | 'rejected' | 'completed';
  };
}

const partner = {
  id: '1',
  name: '뷰티브랜드A',
  isBlocked: false,
  profileImage: '',
};

const mockMessages: Message[] = [
  { id: '1', role: 'other', text: '안녕하세요! 뷰티브랜드A입니다.', time: '14:00' },
  { id: '2', role: 'other', text: '작성해주신 스킨케어 리뷰 글을 보고 연락드립니다.', time: '14:01' },
  { id: '3', role: 'me', text: '안녕하세요! 어떤 내용인가요?', time: '14:05' },
  {
    id: '4',
    role: 'proposal',
    text: '',
    time: '14:10',
    proposal: {
      id: 'prop-1',
      advertiser: '뷰티브랜드A',
      title: '신제품 세럼 리뷰',
      description: '저희 신제품 히알루론산 세럼을 사용하시고 솔직한 리뷰를 작성해주세요.',
      amount: 100000,
      status: 'pending',
    },
  },
  { id: '5', role: 'other', text: '제안 상세 내용 확인해주세요! 관심 있으시면 수락 부탁드립니다 😊', time: '14:11' },
];

// 메시지 버블 컴포넌트
interface MessageBubbleProps {
  message: Message;
  onAcceptProposal?: (id: string) => void;
  onRejectProposal?: (id: string) => void;
}

function MessageBubble({ message, onAcceptProposal, onRejectProposal }: MessageBubbleProps) {
  if (message.role === 'proposal' && message.proposal) {
    return (
      <div className="my-3 animate-scale-in">
        <AdProposalCard
          proposal={message.proposal}
          onAccept={onAcceptProposal!}
          onReject={onRejectProposal!}
        />
      </div>
    );
  }

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

  const handleAcceptProposal = (proposalId: string) => {
    setMessages(messages.map(msg => {
      if (msg.proposal?.id === proposalId) {
        return {
          ...msg,
          proposal: { ...msg.proposal, status: 'accepted' as const },
        };
      }
      return msg;
    }));
    alert('광고 제안을 수락했습니다! 완료 후 지갑에 정산됩니다.');
  };

  const handleRejectProposal = (proposalId: string) => {
    setMessages(messages.map(msg => {
      if (msg.proposal?.id === proposalId) {
        return {
          ...msg,
          proposal: { ...msg.proposal, status: 'rejected' as const },
        };
      }
      return msg;
    }));
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
              <svg className="w-6 h-6 text-text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-primary-light flex items-center justify-center text-lg">
                💼
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

          <button
            onClick={() => setShowMenu(true)}
            className="p-2 -mr-2"
          >
            <svg className="w-6 h-6 text-text-primary" fill="currentColor" viewBox="0 0 24 24">
              <circle cx="12" cy="6" r="2" />
              <circle cx="12" cy="12" r="2" />
              <circle cx="12" cy="18" r="2" />
            </svg>
          </button>
        </div>
      </header>

      {/* 메시지 영역 */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {/* 날짜 구분선 */}
        <div className="flex items-center justify-center my-4">
          <span className="px-3 py-1 bg-card-soft text-text-tertiary text-xs rounded-full">
            오늘
          </span>
        </div>

        {messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            onAcceptProposal={handleAcceptProposal}
            onRejectProposal={handleRejectProposal}
          />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* 입력 영역 */}
      {isBlocked ? (
        <div className="flex-shrink-0 bg-card-soft border-t border-border px-5 py-4 safe-area-pb">
          <div className="text-center">
            <p className="text-sm text-text-secondary mb-3">
              🚫 이 사용자를 차단했습니다
            </p>
            <button
              onClick={handleUnblock}
              className="btn-secondary text-sm"
            >
              차단 해제
            </button>
          </div>
        </div>
      ) : (
        <div className="flex-shrink-0 bg-white border-t border-border px-4 py-3 safe-area-pb">
          <div className="flex items-center gap-2">
            {/* 추가 기능 버튼 */}
            <button className="w-10 h-10 flex-shrink-0 flex items-center justify-center text-text-tertiary hover:bg-card-soft rounded-full transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>

            {/* 입력창 */}
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

            {/* 전송 버튼 */}
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
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
              </svg>
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
