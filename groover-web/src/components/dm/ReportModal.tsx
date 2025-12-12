// src/components/dm/ReportModal.tsx
'use client';

import { useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetUser: string;
  onSubmit: (type: string, description: string) => void;
}

const reportTypes = [
  { value: 'spam', label: '광고/스팸' },
  { value: 'scam', label: '사기/금전 요구' },
  { value: 'abuse', label: '욕설/비하 표현' },
  { value: 'other', label: '기타' },
];

export default function ReportModal({ isOpen, onClose, targetUser, onSubmit }: ReportModalProps) {
  const [selectedType, setSelectedType] = useState('');
  const [description, setDescription] = useState('');

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (!selectedType) {
      alert('신고 유형을 선택해주세요.');
      return;
    }
    onSubmit(selectedType, description);
    setSelectedType('');
    setDescription('');
    onClose();
  };

  return (
    <div
      style={{
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
        padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: '16px',
          padding: '24px',
          width: '100%',
          maxWidth: '360px',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <AlertTriangle size={20} color="#ef4444" />
          <h3 style={{ fontSize: '18px', fontWeight: '700' }}>
            신고하기
          </h3>
        </div>
        <p style={{ fontSize: '13px', color: '#666', marginBottom: '20px' }}>
          {targetUser}님을 신고합니다.
        </p>

        {/* 신고 유형 */}
        <div style={{ marginBottom: '16px' }}>
          <p style={{ fontSize: '14px', fontWeight: '500', marginBottom: '10px' }}>
            신고 유형
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {reportTypes.map((type) => (
              <label
                key={type.value}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 12px',
                  border: `1px solid ${selectedType === type.value ? '#0f62fe' : '#ddd'}`,
                  borderRadius: '8px',
                  cursor: 'pointer',
                  background: selectedType === type.value ? '#f0f7ff' : '#fff',
                }}
              >
                <input
                  type="radio"
                  name="reportType"
                  value={type.value}
                  checked={selectedType === type.value}
                  onChange={(e) => setSelectedType(e.target.value)}
                  style={{ accentColor: '#0f62fe' }}
                />
                <span style={{ fontSize: '14px' }}>{type.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* 상세 설명 */}
        <div style={{ marginBottom: '20px' }}>
          <p style={{ fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>
            상세 내용 (선택)
          </p>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="추가로 알려주실 내용이 있으시면 적어주세요."
            style={{
              width: '100%',
              padding: '10px 12px',
              border: '1px solid #ddd',
              borderRadius: '8px',
              fontSize: '14px',
              resize: 'none',
              height: '80px',
              outline: 'none',
            }}
          />
        </div>

        {/* 버튼 */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: '12px',
              background: '#f5f5f5',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              cursor: 'pointer',
            }}
          >
            취소
          </button>
          <button
            onClick={handleSubmit}
            style={{
              flex: 1,
              padding: '12px',
              background: '#ef4444',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            신고하기
          </button>
        </div>
      </div>
    </div>
  );
}