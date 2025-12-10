// src/app/profile/ads/page.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import AppHeader from '@/components/layout/AppHeader';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';

interface AdDeal {
  id: string;
  advertiser: {
    id: string;
    name: string;
  };
  title: string;
  description: string;
  totalAmount: number;
  creatorAmount: number;
  status: string;
  createdAt: string;
  settledAt?: string;
  conversationId?: string;
}

const statusLabels: Record<string, { text: string; color: string; bg: string }> = {
  PROPOSED: { text: '대기중', color: '#f59e0b', bg: '#fef3c7' },
  ACCEPTED: { text: '수락됨', color: '#3b82f6', bg: '#dbeafe' },
  PAID: { text: '결제완료', color: '#8b5cf6', bg: '#ede9fe' },
  SUBMITTED: { text: '제출완료', color: '#06b6d4', bg: '#cffafe' },
  CONFIRMED: { text: '승인완료', color: '#10b981', bg: '#d1fae5' },
  SETTLED: { text: '정산완료', color: '#22c55e', bg: '#dcfce7' },
  REJECTED: { text: '거절됨', color: '#ef4444', bg: '#fee2e2' },
  CANCELLED: { text: '취소됨', color: '#6b7280', bg: '#f3f4f6' },
  REFUNDED: { text: '환불됨', color: '#f97316', bg: '#ffedd5' },
  EXPIRED: { text: '만료됨', color: '#6b7280', bg: '#f3f4f6' },
};

type TabType = 'all' | 'pending' | 'active' | 'completed';

export default function AdsManagePage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [deals, setDeals] = useState<AdDeal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDeals();
  }, []);

  const fetchDeals = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/deals/creator');
      setDeals(res.data.data || []);
    } catch (err: any) {
      console.error('광고 제안 불러오기 실패:', err);
      setError('데이터를 불러오는데 실패했습니다.');
      setDeals([]);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredDeals = deals.filter(deal => {
    if (activeTab === 'all') return true;
    if (activeTab === 'pending') return deal.status === 'PROPOSED';
    if (activeTab === 'active') return ['ACCEPTED', 'PAID', 'SUBMITTED'].includes(deal.status);
    if (activeTab === 'completed') return ['CONFIRMED', 'SETTLED', 'REJECTED', 'CANCELLED', 'REFUNDED', 'EXPIRED'].includes(deal.status);
    return true;
  });

  const handleAccept = async (dealId: string) => {
    try {
      await api.post(`/deals/${dealId}/accept`);
      alert('광고 제안을 수락했습니다!');
      fetchDeals();
    } catch (err) {
      alert('수락에 실패했습니다.');
    }
  };

  const handleReject = async (dealId: string) => {
    try {
      await api.post(`/deals/${dealId}/reject`);
      fetchDeals();
    } catch (err) {
      alert('거절에 실패했습니다.');
    }
  };

  const stats = {
    pending: deals.filter(d => d.status === 'PROPOSED').length,
    active: deals.filter(d => ['ACCEPTED', 'PAID', 'SUBMITTED'].includes(d.status)).length,
    completed: deals.filter(d => ['CONFIRMED', 'SETTLED'].includes(d.status)).length,
    totalEarned: deals
      .filter(d => d.status === 'SETTLED')
      .reduce((sum, d) => sum + (d.creatorAmount || 0), 0),
  };

  if (isLoading) {
    return (
      <>
        <AppHeader />
        <div style={{ padding: '40px', textAlign: 'center' }}>로딩 중...</div>
      </>
    );
  }

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
            <p style={{ fontSize: '24px', fontWeight: '700' }}>
              {stats.totalEarned >= 10000 
                ? `${(stats.totalEarned / 10000).toFixed(0)}만` 
                : `${stats.totalEarned.toLocaleString()}원`}
            </p>
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

        {/* 에러 표시 */}
        {error && (
          <div style={{ padding: '20px', textAlign: 'center', color: '#e53e3e' }}>
            {error}
          </div>
        )}

        {/* 제안 목록 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filteredDeals.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>
              <p style={{ fontSize: '40px', marginBottom: '8px' }}>📭</p>
              <p>해당하는 광고 제안이 없습니다</p>
            </div>
          ) : (
            filteredDeals.map((deal) => {
              const status = statusLabels[deal.status] || { text: deal.status, color: '#666', bg: '#f5f5f5' };
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
                      <p style={{ fontSize: '13px', color: '#666' }}>{deal.advertiser?.name || '광고주'}</p>
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
                  {deal.description && (
                    <p style={{ fontSize: '13px', color: '#666', marginBottom: '12px' }}>
                      {deal.description}
                    </p>
                  )}

                  {/* 금액 + 날짜 */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <span style={{ fontSize: '17px', fontWeight: '700', color: '#0f62fe' }}>
                      {(deal.creatorAmount || deal.totalAmount || 0).toLocaleString()}원
                    </span>
                    <span style={{ fontSize: '12px', color: '#999' }}>
                      {deal.status === 'SETTLED' && deal.settledAt 
                        ? `완료: ${new Date(deal.settledAt).toLocaleDateString('ko-KR')}` 
                        : `제안: ${new Date(deal.createdAt).toLocaleDateString('ko-KR')}`
                      }
                    </span>
                  </div>

                  {/* 버튼 */}
                  {deal.status === 'PROPOSED' && (
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
                  {['ACCEPTED', 'PAID', 'SUBMITTED'].includes(deal.status) && deal.conversationId && (
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
                  {deal.status === 'SETTLED' && (
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