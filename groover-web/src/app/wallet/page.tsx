// src/app/wallet/page.tsx
'use client';

import { useState } from 'react';
import AppHeader from '@/components/layout/AppHeader';

const mockWallet = {
  availableBalance: 285000,    // 출금 가능 금액
  pendingBalance: 150000,      // 진행 중 광고 예정 수익
  totalEarned: 1250000,
  totalWithdrawn: 880000,
  isVerified: true,
  bankName: '카카오뱅크',
  bankAccount: '3333-12-3456789',
};

// 진행 중인 광고 딜
const pendingDeals = [
  { 
    id: '1', 
    advertiser: '뷰티브랜드A', 
    title: '신제품 세럼 리뷰', 
    amount: 100000, 
    status: 'in_progress',
    acceptedAt: '2024.12.01',
  },
  { 
    id: '2', 
    advertiser: '캠핑샵', 
    title: '겨울 텐트 리뷰', 
    amount: 50000, 
    status: 'accepted',
    acceptedAt: '2024.12.03',
  },
];

const transactions = [
  { id: '1', type: 'ad_reward', desc: '뷰티브랜드A - 스킨케어 세트 리뷰', amount: 85000, date: '2024.12.04', balance: 285000 },
  { id: '2', type: 'payout', desc: '출금 (카카오뱅크 ****6789)', amount: -200000, date: '2024.12.01', balance: 200000 },
  { id: '3', type: 'ad_reward', desc: '캠핑용품샵 - 난로 협찬 리뷰', amount: 150000, date: '2024.11.28', balance: 400000 },
  { id: '4', type: 'ad_reward', desc: '육아맘스토어 - 젖병소독기 리뷰', amount: 100000, date: '2024.11.20', balance: 250000 },
  { id: '5', type: 'payout', desc: '출금 (카카오뱅크 ****6789)', amount: -150000, date: '2024.11.15', balance: 150000 },
];

const statusLabels: Record<string, { text: string; color: string; bg: string }> = {
  accepted: { text: '수락됨', color: '#f59e0b', bg: '#fef3c7' },
  in_progress: { text: '진행중', color: '#0f62fe', bg: '#dbeafe' },
  completed: { text: '완료', color: '#22c55e', bg: '#dcfce7' },
};

export default function WalletPage() {
  const [activeTab, setActiveTab] = useState<'all' | 'earning' | 'payout'>('all');
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState('');

  const filteredTransactions = transactions.filter(tx => {
    if (activeTab === 'all') return true;
    if (activeTab === 'earning') return tx.type === 'ad_reward';
    if (activeTab === 'payout') return tx.type === 'payout';
    return true;
  });

  const handlePayoutRequest = () => {
    const amount = parseInt(payoutAmount);
    if (isNaN(amount) || amount < 50000) {
      alert('최소 출금 금액은 50,000원입니다.');
      return;
    }
    if (amount > mockWallet.availableBalance) {
      alert('출금 가능 금액을 초과했습니다.');
      return;
    }
    alert(`${amount.toLocaleString()}원 출금 요청이 완료되었습니다.\n영업일 기준 1-3일 내 입금됩니다.`);
    setShowPayoutModal(false);
    setPayoutAmount('');
  };

  const maskAccount = (account: string) => {
    const parts = account.split('-');
    if (parts.length >= 3) {
      return `${parts[0]}-****-${parts[parts.length - 1].slice(-4)}`;
    }
    return account;
  };

  return (
    <>
      <AppHeader />
      <div style={{ padding: '16px', paddingBottom: '80px' }}>
        {/* 잔액 카드 */}
        <div
          style={{
            background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
            borderRadius: '16px',
            padding: '24px',
            color: '#fff',
            marginBottom: '16px',
          }}
        >
          <p style={{ fontSize: '13px', color: '#aaa', marginBottom: '4px' }}>
            출금 가능 금액
          </p>
          <p style={{ fontSize: '32px', fontWeight: '700', marginBottom: '8px' }}>
            {mockWallet.availableBalance.toLocaleString()}원
          </p>
          <p style={{ fontSize: '13px', color: '#6ee7b7' }}>
            + 진행 중 예정 수익: {mockWallet.pendingBalance.toLocaleString()}원
          </p>
          <button
            onClick={() => setShowPayoutModal(true)}
            style={{
              marginTop: '16px',
              padding: '12px 24px',
              background: '#fff',
              color: '#1a1a2e',
              border: 'none',
              borderRadius: '10px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              width: '100%',
            }}
          >
            출금 요청
          </button>
        </div>

        {/* 계좌 정보 */}
        <div
          style={{
            padding: '16px',
            background: '#f8f9fa',
            borderRadius: '12px',
            marginBottom: '16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <p style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>정산 계좌</p>
            <p style={{ fontSize: '14px', fontWeight: '600' }}>
              {mockWallet.bankName} {maskAccount(mockWallet.bankAccount)}
            </p>
          </div>
          <span
            style={{
              fontSize: '11px',
              padding: '4px 8px',
              borderRadius: '4px',
              background: mockWallet.isVerified ? '#dcfce7' : '#fee2e2',
              color: mockWallet.isVerified ? '#22c55e' : '#ef4444',
            }}
          >
            {mockWallet.isVerified ? '✓ 인증완료' : '미인증'}
          </span>
        </div>

        {/* 통계 */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '12px',
            marginBottom: '24px',
          }}
        >
          <div style={{ padding: '16px', background: '#fff', border: '1px solid #eee', borderRadius: '12px' }}>
            <p style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>총 수익</p>
            <p style={{ fontSize: '18px', fontWeight: '700', color: '#22c55e' }}>
              {mockWallet.totalEarned.toLocaleString()}원
            </p>
          </div>
          <div style={{ padding: '16px', background: '#fff', border: '1px solid #eee', borderRadius: '12px' }}>
            <p style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>총 출금</p>
            <p style={{ fontSize: '18px', fontWeight: '700' }}>
              {mockWallet.totalWithdrawn.toLocaleString()}원
            </p>
          </div>
        </div>

        {/* 진행 중인 광고 */}
        {pendingDeals.length > 0 && (
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>
              📢 진행 중인 광고
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {pendingDeals.map((deal) => {
                const status = statusLabels[deal.status];
                return (
                  <div
                    key={deal.id}
                    style={{
                      padding: '14px',
                      background: '#fff',
                      border: '1px solid #eee',
                      borderRadius: '12px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                      <div>
                        <p style={{ fontSize: '14px', fontWeight: '600' }}>{deal.title}</p>
                        <p style={{ fontSize: '12px', color: '#666' }}>{deal.advertiser}</p>
                      </div>
                      <span
                        style={{
                          fontSize: '11px',
                          padding: '4px 8px',
                          borderRadius: '999px',
                          background: status.bg,
                          color: status.color,
                        }}
                      >
                        {status.text}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '12px', color: '#999' }}>수락일: {deal.acceptedAt}</span>
                      <span style={{ fontSize: '15px', fontWeight: '700', color: '#0f62fe' }}>
                        +{deal.amount.toLocaleString()}원
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
            <p style={{ fontSize: '11px', color: '#999', marginTop: '8px', textAlign: 'center' }}>
              광고 완료 후 정산됩니다
            </p>
          </div>
        )}

        {/* 거래 내역 */}
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>
            📋 거래 내역
          </h3>

          {/* 필터 탭 */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
            {[
              { key: 'all', label: '전체' },
              { key: 'earning', label: '수익' },
              { key: 'payout', label: '출금' },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as typeof activeTab)}
                style={{
                  padding: '8px 16px',
                  fontSize: '13px',
                  border: 'none',
                  borderRadius: '999px',
                  background: activeTab === tab.key ? '#0f62fe' : '#f5f5f5',
                  color: activeTab === tab.key ? '#fff' : '#666',
                  cursor: 'pointer',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* 거래 목록 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {filteredTransactions.map((tx) => (
              <div
                key={tx.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '14px',
                  background: '#fff',
                  border: '1px solid #eee',
                  borderRadius: '10px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      background: tx.type === 'ad_reward' ? '#dcfce7' : '#fee2e2',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '16px',
                    }}
                  >
                    {tx.type === 'ad_reward' ? '💰' : '💸'}
                  </div>
                  <div>
                    <p style={{ fontSize: '13px', fontWeight: '500' }}>{tx.desc}</p>
                    <p style={{ fontSize: '11px', color: '#999' }}>{tx.date}</p>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p
                    style={{
                      fontSize: '14px',
                      fontWeight: '600',
                      color: tx.amount > 0 ? '#22c55e' : '#333',
                    }}
                  >
                    {tx.amount > 0 ? '+' : ''}{tx.amount.toLocaleString()}원
                  </p>
                  <p style={{ fontSize: '11px', color: '#999' }}>
                    잔액 {tx.balance.toLocaleString()}원
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 출금 모달 */}
      {showPayoutModal && (
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
          onClick={() => setShowPayoutModal(false)}
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
            <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '8px' }}>
              💸 출금 요청
            </h3>
            <p style={{ fontSize: '13px', color: '#666', marginBottom: '20px' }}>
              출금 가능: {mockWallet.availableBalance.toLocaleString()}원
            </p>

            <div style={{ marginBottom: '16px' }}>
              <p style={{ fontSize: '13px', color: '#666', marginBottom: '8px' }}>출금 금액</p>
              <input
                type="number"
                value={payoutAmount}
                onChange={(e) => setPayoutAmount(e.target.value)}
                placeholder="최소 50,000원"
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  fontSize: '16px',
                  outline: 'none',
                }}
              />
            </div>

            <div
              style={{
                padding: '12px',
                background: '#f8f9fa',
                borderRadius: '8px',
                marginBottom: '20px',
              }}
            >
              <p style={{ fontSize: '12px', color: '#666' }}>입금 계좌</p>
              <p style={{ fontSize: '14px', fontWeight: '600' }}>
                {mockWallet.bankName} {maskAccount(mockWallet.bankAccount)}
              </p>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setShowPayoutModal(false)}
                style={{
                  flex: 1,
                  padding: '14px',
                  background: '#f5f5f5',
                  border: 'none',
                  borderRadius: '10px',
                  fontSize: '14px',
                  cursor: 'pointer',
                }}
              >
                취소
              </button>
              <button
                onClick={handlePayoutRequest}
                style={{
                  flex: 1,
                  padding: '14px',
                  background: '#0f62fe',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '10px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                출금 요청
              </button>
            </div>

            <p style={{ fontSize: '11px', color: '#999', marginTop: '12px', textAlign: 'center' }}>
              영업일 기준 1-3일 내 입금됩니다
            </p>
          </div>
        </div>
      )}
    </>
  );
}
