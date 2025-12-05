// src/components/dm/DmMenu.tsx
'use client';

import { useState } from 'react';

interface DmMenuProps {
  isBlocked: boolean;
  onBlock: () => void;
  onUnblock: () => void;
  onReport: () => void;
  onClose: () => void;
}

export default function DmMenu({ isBlocked, onBlock, onUnblock, onReport, onClose }: DmMenuProps) {
  return (
    <>
      {/* 배경 */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.3)',
          zIndex: 999,
        }}
        onClick={onClose}
      />
      
      {/* 메뉴 */}
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          width: '100%',
          maxWidth: '480px',
          background: '#fff',
          borderTopLeftRadius: '16px',
          borderTopRightRadius: '16px',
          padding: '8px 0 24px',
          zIndex: 1000,
        }}
      >
        {/* 핸들 */}
        <div
          style={{
            width: '40px',
            height: '4px',
            background: '#ddd',
            borderRadius: '2px',
            margin: '8px auto 16px',
          }}
        />

        {/* 메뉴 항목 */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {isBlocked ? (
            <button
              onClick={() => { onUnblock(); onClose(); }}
              style={{
                padding: '16px 24px',
                background: 'none',
                border: 'none',
                fontSize: '15px',
                textAlign: 'left',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              <span style={{ fontSize: '18px' }}>🔓</span>
              차단 해제
            </button>
          ) : (
            <button
              onClick={() => { onBlock(); onClose(); }}
              style={{
                padding: '16px 24px',
                background: 'none',
                border: 'none',
                fontSize: '15px',
                textAlign: 'left',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              <span style={{ fontSize: '18px' }}>🚫</span>
              사용자 차단하기
            </button>
          )}

          <button
            onClick={() => { onReport(); onClose(); }}
            style={{
              padding: '16px 24px',
              background: 'none',
              border: 'none',
              fontSize: '15px',
              textAlign: 'left',
              cursor: 'pointer',
              color: '#ef4444',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <span style={{ fontSize: '18px' }}>🚨</span>
            신고하기
          </button>
        </div>

        {/* 취소 버튼 */}
        <div style={{ padding: '8px 16px 0' }}>
          <button
            onClick={onClose}
            style={{
              width: '100%',
              padding: '14px',
              background: '#f5f5f5',
              border: 'none',
              borderRadius: '10px',
              fontSize: '15px',
              cursor: 'pointer',
            }}
          >
            취소
          </button>
        </div>
      </div>
    </>
  );
}
