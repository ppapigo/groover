// src/app/profile/ads/page.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import AppHeader from '@/components/layout/AppHeader';

interface AdDeal {
  id: string;
  advertiser: string;
  title: string;
  description: string;
  amount: number;
  status: 'proposed' | 'accepted' | 'in_progress' | 'completed' | 'rejected' | 'cancelled';
  createdAt: string;
  completedAt?: string;
  conversationId: string;
}

const mockDeals: AdDeal[] = [
  {
    id: '1',
    advertiser: '뷰티브랜드A',
    title: '신제품 세럼 리뷰',
    description: '히알루론산 세럼 사용 후기 작성',
    amount: 100000,
    status: 'in_progress',
    createdAt: '2024.12.01',
    conversationId: '1',
  },
  {
    id: '2',
    advertiser: '캠핑샵',
    title: '겨울 텐트 리뷰',
    description: '4인용 텐트 설치 및 사용 후기',
    amount: 50000,
    status: 'accepted',
    createdAt: '2024.12.03',
    conversationId: '2',
  },
  {
    id: '3',
    advertiser: '육아맘스토어',
    title: '젖병소독기 리뷰',
    description: '신제품 UV 젖병 소독기 후기',
    amount: 80000,
    status: 'proposed',
    createdAt: '2024.12.04',
    conversationId: '3',
  },
  {
    id: '4',
    advertiser: '뷰티브랜드A',
    title: '스킨케어 세트 리뷰',
    description: '기초 스킨케어 3종 세트 후기',
    amount: 85000,
    status: 'completed',
    createdAt: '2024.11.20',
    completedAt: '2024.12.04',
    conversationId: '1',
  },
  {
    id: '5',
    advertiser: '캠핑용품샵',
    title: '난로 협찬 리뷰',
    description: '휴대용 가스 난로 사용 후기',
    amount: 150000,
    status: 'completed',
    createdAt: '2024.11.15',
    completedAt: '2024.11.28',
    conversationId: '4',
  },
  {
    id: '6',
    advertiser: '패션몰',
    title: '겨울 패딩 협찬',
    description: '롱패딩 착용 후기',
    amount: 50000,
    status: 'rejected',
    createdAt: '2024.11.10',
    conversationId: '5',
  },
];

const statusLabels: Record<string, { text: string; color: string; bg: string }> = {
  proposed: { text: '대기중', color: '#f59e0b', bg: '#fef3c7' },
  accepted: { text: '수락됨', color: '#3b82f6', bg: '#dbeafe' },
  in_progress: { text: '진행중', color: '#0f62fe', bg: '#dbeafe' },
  completed: { text: '완료', color: '#22c55e', bg: '#dcfce7' },
  rejected: { text: '거절됨', color: '#ef4444', bg: '#fee2e2' },
  cancelled: { text: '취소됨', color: '#6b7280', bg: '#f3f4f6' },
};

type TabType = 'all' | 'pending' | 'active' | 'completed';

export default function AdsManagePage() {
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [deals, setDeals] = useState(mockDeals);

  const filteredDeals = deals.filter(deal => {
    if (activeTab === 'all') return true;
    if (activeTab === 'pending') return deal.status === 'proposed';
    if (activeTab === 'active') return ['accepted', 'in_progress'].includes(deal.status);
    if (activeTab === 'completed') return ['completed', 'rejected', 'cancelled'].includes(deal.status);
    return true;
  });

  const handleAccept = (dealId: string) => {
    setDeals(deals.map(d => 
      d.id === dealId ? { ...d, status: 'accepted' as const } : d
    ));
    alert('광고 제안을 수락했습니다!');
  };

  const handleReject = (dealId: string) => {
    setDeals(deals.map(d => 
      d.id === dealId ? { ...d, status: 'rejected' as const } : d
    ));
  };

  const stats = {
    pending: deals.filter(d => d.status === 'proposed').length,
    active: deals.filter(d => ['accepted', 'in_progress'].includes(d.status)).length,
    completed: deals.filter(d => d.status === 'completed').length,
    totalEarned: deals
      .filter(d => d.status === 'completed')
      .reduce((sum, d) => sum + d.amount, 0),
  };

  return (
    <>
      <AppHeader />
      <div style={{ padding: '16px', paddingBottom: '80px' }}>
        {/* 헤더 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
          <Link href="/profile" style={{ fontSize: '20px', textDecoration: 'none' }}>←</Link>
          <h1 style={{ fontSize: '20px', fontWeight: '700' }}>광고 제안 관리</h1>
        </div>

        {/* 통계 카드 */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '10px',
            marginBottom: '20px',
          }}
        >
          <div style={{ padding: '14px', background: '#fef3c7', borderRadius: '12px' }}>
            <p style={{ fontSize: '24px', fontWeight: '700', color: '#f59e0b' }}>{stats.pending}</p>
            <p style={{ fontSize: '12px', color: '#92400e' }}>대기중</p>
          </div>
          <div style={{ padding: '14px', background: '#dbeafe', borderRadius: '12px' }}>
            <p style={{ fontSize: '24px', fontWeight: '700', color: '#0f62fe' }}>{stats.active}</p>
            <p style={{ fontSize: '12px', color: '#1e40af' }}>진행중</p>
          </div>
          <div style={{ padding: '14px', background: '#dcfce7', borderRadius: '12px' }}>
            <p style={{ fontSize: '24px', fontWeight: '700', color: '#22c55e' }}>{stats.completed}</p>
            <p style={{ fontSize: '12px', color: '#166534' }}>완료</p>
          </div>
          <div style={{ padding: '14px', background: '#f3f4f6', borderRadius: '12px' }}>
            <p style={{ fontSize: '24px', fontWeight: '700' }}>{(stats.totalEarned / 10000).toFixed(0)}만</p>
            <p style={{ fontSize: '12px', color: '#6b7280' }}>총 수익</p>
          </div>
        </div>

        {/* 탭 */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', overflowX: 'auto' }}>
          {[
            { key: 'all', label: '전체' },
            { key: 'pending', label: `대기중 (${stats.pending})` },
            { key: 'active', label: `진행중 (${stats.active})` },
            { key: 'completed', label: '완료' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as TabType)}
              style={{
                padding: '8px 16px',
                fontSize: '13px',
                border: 'none',
                borderRadius: '999px',
                background: activeTab === tab.key ? '#0f62fe' : '#f5f5f5',
                color: activeTab === tab.key ? '#fff' : '#666',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* 제안 목록 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filteredDeals.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>
              <p style={{ fontSize: '40px', marginBottom: '8px' }}>📭</p>
              <p>해당하는 광고 제안이 없습니다</p>
            </div>
          ) : (
            filteredDeals.map((deal) => {
              const status = statusLabels[deal.status];
              return (
                <div
                  key={deal.id}
                  style={{
                    padding: '16px',
                    background: '#fff',
                    border: '1px solid #eee',
                    borderRadius: '12px',
                  }}
                >
                  {/* 헤더 */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                    <div>
                      <p style={{ fontSize: '15px', fontWeight: '600', marginBottom: '4px' }}>{deal.title}</p>
                      <p style={{ fontSize: '13px', color: '#666' }}>{deal.advertiser}</p>
                    </div>
                    <span
                      style={{
                        fontSize: '11px',
                        padding: '4px 10px',
                        borderRadius: '999px',
                        background: status.bg,
                        color: status.color,
                        fontWeight: '500',
                      }}
                    >
                      {status.text}
                    </span>
                  </div>

                  {/* 설명 */}
                  <p style={{ fontSize: '13px', color: '#666', marginBottom: '12px' }}>
                    {deal.description}
                  </p>

                  {/* 금액 + 날짜 */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <span style={{ fontSize: '17px', fontWeight: '700', color: '#0f62fe' }}>
                      {deal.amount.toLocaleString()}원
                    </span>
                    <span style={{ fontSize: '12px', color: '#999' }}>
                      {deal.status === 'completed' && deal.completedAt 
                        ? `완료: ${deal.completedAt}` 
                        : `제안: ${deal.createdAt}`
                      }
                    </span>
                  </div>

                  {/* 버튼 */}
                  {deal.status === 'proposed' && (
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button
                        onClick={() => handleReject(deal.id)}
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
                        거절
                      </button>
                      <button
                        onClick={() => handleAccept(deal.id)}
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
                        수락
                      </button>
                    </div>
                  )}

                  {/* 진행중일 때 DM 바로가기 */}
                  {['accepted', 'in_progress'].includes(deal.status) && (
                    <Link
                      href={`/dm/${deal.conversationId}`}
                      style={{
                        display: 'block',
                        textAlign: 'center',
                        padding: '10px',
                        background: '#f8f9fa',
                        borderRadius: '8px',
                        fontSize: '13px',
                        color: '#0f62fe',
                        textDecoration: 'none',
                      }}
                    >
                      💬 광고주와 대화하기
                    </Link>
                  )}

                  {/* 완료 시 정산 안내 */}
                  {deal.status === 'completed' && (
                    <div
                      style={{
                        padding: '10px',
                        background: '#dcfce7',
                        borderRadius: '8px',
                        fontSize: '12px',
                        color: '#166534',
                        textAlign: 'center',
                      }}
                    >
                      ✅ 정산 완료
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </>
  );
}
