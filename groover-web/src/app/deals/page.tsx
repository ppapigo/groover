// src/app/deals/page.tsx

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useMyDeals } from '@/hooks/useEscrow';
import { formatCurrency, formatRelativeTime, formatDealStatus, getStatusColor } from '@/lib/utils';
import { AdDeal } from '@/lib/escrow-api';

type UserRole = 'creator' | 'advertiser';

const statusFilters = [
  { label: '전체', value: undefined },
  { label: '제안됨', value: 'PROPOSED' },
  { label: '진행중', value: 'ACTIVE' },
  { label: '완료', value: 'COMPLETED' },
];

export default function DealsPage() {
  const [role, setRole] = useState<UserRole>('creator');
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const [page, setPage] = useState(1);

  const { data, isLoading, error } = useMyDeals(role, statusFilter, page);

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* 헤더 */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <h1 className="font-bold text-lg">
              {role === 'creator' ? '받은 제안' : '보낸 제안'}
            </h1>
            {/* 역할 전환 */}
            <div className="flex gap-1 bg-gray-100 p-1 rounded-lg text-sm">
              <button
                onClick={() => { setRole('creator'); setPage(1); }}
                className={`px-3 py-1 rounded-md transition-colors ${
                  role === 'creator' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'
                }`}
              >
                크리에이터
              </button>
              <button
                onClick={() => { setRole('advertiser'); setPage(1); }}
                className={`px-3 py-1 rounded-md transition-colors ${
                  role === 'advertiser' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'
                }`}
              >
                광고주
              </button>
            </div>
          </div>

          {/* 필터 */}
          <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
            {statusFilters.map((filter) => (
              <button
                key={filter.label}
                onClick={() => { setStatusFilter(filter.value); setPage(1); }}
                className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors ${
                  statusFilter === filter.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* 콘텐츠 */}
      <main className="max-w-2xl mx-auto px-4 py-4">
        {error && (
          <div className="text-center py-8">
            <p className="text-red-500">오류가 발생했습니다</p>
          </div>
        )}

        {isLoading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-xl p-4 animate-pulse">
                <div className="h-5 bg-gray-200 rounded w-3/4 mb-2" />
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-3" />
                <div className="h-4 bg-gray-200 rounded w-full" />
              </div>
            ))}
          </div>
        )}

        {!isLoading && data?.items.length === 0 && (
          <div className="text-center py-12">
            <p className="text-4xl mb-3">📭</p>
            <p className="text-gray-500">거래가 없습니다</p>
          </div>
        )}

        {!isLoading && data && data.items.length > 0 && (
          <div className="space-y-3">
            {data.items.map((deal) => (
              <DealCard key={deal.id} deal={deal} role={role} />
            ))}

            {/* 페이지네이션 */}
            {data.totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-4">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 rounded-lg bg-white text-gray-600 disabled:opacity-50"
                >
                  이전
                </button>
                <span className="px-4 py-2 text-gray-600">
                  {page} / {data.totalPages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(data.totalPages, p + 1))}
                  disabled={page === data.totalPages}
                  className="px-4 py-2 rounded-lg bg-white text-gray-600 disabled:opacity-50"
                >
                  다음
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* 하단 네비게이션 */}
      <BottomNav />
    </div>
  );
}

function DealCard({ deal, role }: { deal: AdDeal; role: UserRole }) {
  const otherParty = role === 'creator' ? deal.advertiser : deal.creator;
  const amount = role === 'creator' ? deal.creatorAmount : deal.totalAmount;

  const now = new Date();
  const isOverdue =
    (deal.status === 'PAID' && deal.submitDeadline && new Date(deal.submitDeadline) < now) ||
    (deal.status === 'SUBMITTED' && deal.confirmDeadline && new Date(deal.confirmDeadline) < now);

  return (
    <Link href={`/deals/${deal.id}`}>
      <div className={`bg-white rounded-xl p-4 ${isOverdue ? 'ring-2 ring-red-400' : ''}`}>
        <div className="flex items-start justify-between mb-2">
          <h3 className="font-semibold text-gray-900 flex-1 truncate">{deal.title}</h3>
          <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${getStatusColor(deal.status)}`}>
            {formatDealStatus(deal.status)}
          </span>
        </div>

        <p className="text-sm text-gray-500 mb-3">
          {otherParty.name || otherParty.email}
        </p>

        <div className="flex items-center justify-between">
          <p className="font-bold text-gray-900">{formatCurrency(amount)}</p>
          <div className="text-right">
            <p className="text-xs text-gray-400">{formatRelativeTime(deal.updatedAt)}</p>
            {isOverdue && <p className="text-xs text-red-600 font-medium">⚠️ 기한 초과</p>}
          </div>
        </div>
      </div>
    </Link>
  );
}

function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t">
      <div className="max-w-2xl mx-auto flex">
        <Link href="/" className="flex-1 py-3 text-center text-gray-400">
          <span className="text-xl">🏠</span>
          <p className="text-xs mt-1">홈</p>
        </Link>
        <Link href="/deals" className="flex-1 py-3 text-center text-blue-600">
          <span className="text-xl">💼</span>
          <p className="text-xs mt-1">거래</p>
        </Link>
        <Link href="/dashboard" className="flex-1 py-3 text-center text-gray-400">
          <span className="text-xl">📊</span>
          <p className="text-xs mt-1">통계</p>
        </Link>
        <Link href="/notifications" className="flex-1 py-3 text-center text-gray-400">
          <span className="text-xl">🔔</span>
          <p className="text-xs mt-1">알림</p>
        </Link>
      </div>
    </nav>
  );
}
