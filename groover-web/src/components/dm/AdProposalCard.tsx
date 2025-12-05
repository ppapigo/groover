// src/components/dm/AdProposalCard.tsx
'use client';

import { useState } from 'react';

interface AdProposalCardProps {
  proposal: {
    id: string;
    advertiser: string;
    title: string;
    amount: number;
    description?: string;
    status: 'pending' | 'accepted' | 'rejected' | 'completed';
  };
  onAccept?: (id: string) => void;
  onReject?: (id: string) => void;
}

export default function AdProposalCard({ proposal, onAccept, onReject }: AdProposalCardProps) {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleAccept = async () => {
    if (onAccept) {
      setIsProcessing(true);
      onAccept(proposal.id);
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (onReject) {
      setIsProcessing(true);
      onReject(proposal.id);
      setIsProcessing(false);
    }
  };

  const statusLabels: Record<string, { text: string; color: string; bg: string }> = {
    pending: { text: '대기중', color: '#f59e0b', bg: '#fef3c7' },
    accepted: { text: '수락됨', color: '#22c55e', bg: '#dcfce7' },
    rejected: { text: '거절됨', color: '#ef4444', bg: '#fee2e2' },
    completed: { text: '완료', color: '#0f62fe', bg: '#dbeafe' },
  };

  const status = statusLabels[proposal.status];

  return (
    <div
      style={{
        background: '#f8faff',
        border: '1px solid #e0e7ff',
        borderRadius: '12px',
        padding: '16px',
        margin: '8px 0',
      }}
    >
      {/* 헤더 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '18px' }}>💼</span>
          <span style={{ fontWeight: '600', fontSize: '14px' }}>{proposal.advertiser}</span>
        </div>
        <span
          style={{
            fontSize: '11px',
            fontWeight: '500',
            color: status.color,
            background: status.bg,
            padding: '4px 8px',
            borderRadius: '999px',
          }}
        >
          {status.text}
        </span>
      </div>

      {/* 내용 */}
      <h4 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '8px' }}>
        {proposal.title}
      </h4>
      {proposal.description && (
        <p style={{ fontSize: '13px', color: '#666', marginBottom: '12px' }}>
          {proposal.description}
        </p>
      )}

      {/* 금액 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          marginBottom: '16px',
        }}
      >
        <span style={{ fontSize: '13px', color: '#666' }}>광고비</span>
        <span style={{ fontSize: '18px', fontWeight: '700', color: '#0f62fe' }}>
          {proposal.amount.toLocaleString()}원
        </span>
      </div>

      {/* 버튼 (대기중일 때만) */}
      {proposal.status === 'pending' && (
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={handleReject}
            disabled={isProcessing}
            style={{
              flex: 1,
              padding: '10px',
              background: '#f5f5f5',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              cursor: 'pointer',
            }}
          >
            거절하기
          </button>
          <button
            onClick={handleAccept}
            disabled={isProcessing}
            style={{
              flex: 1,
              padding: '10px',
              background: '#0f62fe',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            수락하기
          </button>
        </div>
      )}

      {/* 수락 후 안내 */}
      {proposal.status === 'accepted' && (
        <p style={{ fontSize: '12px', color: '#22c55e', textAlign: 'center' }}>
          ✅ 광고를 수락하셨습니다. 완료 후 정산됩니다.
        </p>
      )}
    </div>
  );
}
