// src/app/dm/[id]/page.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
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

export default function DmChatPage({ params }: { params: { id: string } }) {
  const [messages, setMessages] = useState<Message[]>(mockMessages);
  const [input, setInput] = useState('');
  const [isBlocked, setIsBlocked] = useState(partner.isBlocked);
  const [showMenu, setShowMenu] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = () => {
    if (!input.trim() || isBlocked) return;
    setMessages([
      ...messages,
      {
        id: Date.now().toString(),
        role: 'me',
        text: input,
        time: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
    setInput('');
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
    alert(`${partner.name}님을 차단했습니다.`);
  };

  const handleUnblock = () => {
    setIsBlocked(false);
    alert(`${partner.name}님의 차단을 해제했습니다.`);
  };

  const handleReport = (type: string, description: string) => {
    console.log('Report:', { targetUser: partner.name, type, description });
    alert('신고가 접수되었습니다. 검토 후 조치하겠습니다.');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {/* 헤더 */}
      <header
        style={{
          padding: '14px 16px',
          borderBottom: '1px solid #eee',
          background: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <a href="/dm" style={{ fontSize: '20px', textDecoration: 'none' }}>←</a>
          <span style={{ fontWeight: '600' }}>{partner.name}</span>
          {isBlocked && (
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
        </div>
        <button
          onClick={() => setShowMenu(true)}
          style={{
            padding: '8px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: '18px',
          }}
        >
          ⋯
        </button>
      </header>

      {/* 메시지 영역 */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}
      >
        {messages.map((msg) => {
          // 광고 제안 카드
          if (msg.role === 'proposal' && msg.proposal) {
            return (
              <AdProposalCard
                key={msg.id}
                proposal={msg.proposal}
                onAccept={handleAcceptProposal}
                onReject={handleRejectProposal}
              />
            );
          }

          // 일반 메시지
          return (
            <div
              key={msg.id}
              style={{
                alignSelf: msg.role === 'me' ? 'flex-end' : 'flex-start',
                maxWidth: '75%',
              }}
            >
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: '16px',
                  borderBottomRightRadius: msg.role === 'me' ? '4px' : '16px',
                  borderBottomLeftRadius: msg.role === 'other' ? '4px' : '16px',
                  background: msg.role === 'me' ? '#0f62fe' : '#f1f3f5',
                  color: msg.role === 'me' ? '#fff' : '#333',
                  fontSize: '14px',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {msg.text}
              </div>
              <p
                style={{
                  fontSize: '11px',
                  color: '#999',
                  marginTop: '4px',
                  textAlign: msg.role === 'me' ? 'right' : 'left',
                }}
              >
                {msg.time}
              </p>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* 입력창 - 차단 시 비활성화 */}
      {isBlocked ? (
        <div
          style={{
            padding: '16px',
            borderTop: '1px solid #eee',
            background: '#f9f9f9',
            textAlign: 'center',
          }}
        >
          <p style={{ fontSize: '13px', color: '#999' }}>
            🚫 이 사용자를 차단했습니다.
          </p>
          <button
            onClick={handleUnblock}
            style={{
              marginTop: '8px',
              padding: '8px 16px',
              fontSize: '13px',
              background: '#fff',
              border: '1px solid #ddd',
              borderRadius: '8px',
              cursor: 'pointer',
            }}
          >
            차단 해제
          </button>
        </div>
      ) : (
        <div
          style={{
            display: 'flex',
            gap: '8px',
            padding: '12px 16px',
            borderTop: '1px solid #eee',
            background: '#fff',
          }}
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="메시지 입력..."
            style={{
              flex: 1,
              padding: '10px 16px',
              border: '1px solid #ddd',
              borderRadius: '20px',
              fontSize: '14px',
              outline: 'none',
            }}
          />
          <button
            onClick={sendMessage}
            style={{
              padding: '10px 16px',
              background: '#0f62fe',
              color: '#fff',
              border: 'none',
              borderRadius: '20px',
              fontSize: '14px',
              cursor: 'pointer',
            }}
          >
            전송
          </button>
        </div>
      )}

      {/* 메뉴 */}
      {showMenu && (
        <DmMenu
          isBlocked={isBlocked}
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
        targetUser={partner.name}
        onSubmit={handleReport}
      />
    </div>
  );
}
