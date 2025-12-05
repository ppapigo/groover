// src/app/dashboard/page.tsx

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useCreatorStats, useAdvertiserStats, useRecentActivity } from '@/hooks/useDashboard';
import { formatCurrency, formatRelativeTime, formatDealStatus, getStatusColor } from '@/lib/utils';

type UserRole = 'creator' | 'advertiser';

export default function DashboardPage() {
  const [role, setRole] = useState<UserRole>('creator');

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* 헤더 */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl">🎵</span>
              <span className="font-bold text-lg">Groover</span>
            </div>
            {/* 역할 전환 */}
            <div className="flex gap-1 bg-gray-100 p-1 rounded-lg text-sm">
              <button
                onClick={() => setRole('creator')}
                className={`px-3 py-1 rounded-md transition-colors ${
                  role === 'creator' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'
                }`}
              >
                크리에이터
              </button>
              <button
                onClick={() => setRole('advertiser')}
                className={`px-3 py-1 rounded-md transition-colors ${
                  role === 'advertiser' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'
                }`}
              >
                광고주
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* 콘텐츠 */}
      <main className="max-w-2xl mx-auto px-4 py-4">
        {role === 'creator' ? <CreatorDashboard /> : <AdvertiserDashboard />}
      </main>

      {/* 하단 네비게이션 */}
      <BottomNav />
    </div>
  );
}

function CreatorDashboard() {
  const { data: stats, isLoading } = useCreatorStats();
  const { data: activities } = useRecentActivity(5);

  if (isLoading) return <LoadingSkeleton />;

  return (
    <div className="space-y-4">
      {/* 잔액 카드 */}
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl p-5 text-white">
        <p className="text-sm opacity-80">출금 가능 잔액</p>
        <p className="text-3xl font-bold mt-1">{formatCurrency(stats?.availableBalance || 0)}</p>
        <p className="text-sm opacity-80 mt-2">대기 중: {formatCurrency(stats?.pendingBalance || 0)}</p>
        <button className="mt-4 px-4 py-2 bg-white/20 rounded-lg text-sm font-medium">
          출금하기
        </button>
      </div>

      {/* 통계 그리드 */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard title="7일 조회수" value={stats?.views7d || 0} />
        <StatCard title="7일 클릭수" value={stats?.clicks7d || 0} />
        <StatCard title="7일 수익" value={stats?.earnings7d || 0} type="currency" />
        <StatCard title="총 수익" value={stats?.totalEarnings || 0} type="currency" />
      </div>

      {/* 거래 현황 */}
      <div className="bg-white rounded-xl p-4">
        <h3 className="font-semibold text-gray-900 mb-3">거래 현황</h3>
        <div className="flex justify-between text-center">
          <div>
            <p className="text-2xl font-bold text-blue-600">{stats?.pendingProposals || 0}</p>
            <p className="text-xs text-gray-500">대기 중</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-purple-600">{stats?.activeDeals || 0}</p>
            <p className="text-xs text-gray-500">진행 중</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-green-600">{stats?.completedDeals || 0}</p>
            <p className="text-xs text-gray-500">완료</p>
          </div>
        </div>
      </div>

      {/* 최근 활동 */}
      <div className="bg-white rounded-xl p-4">
        <h3 className="font-semibold text-gray-900 mb-3">최근 활동</h3>
        {activities?.length === 0 ? (
          <p className="text-gray-400 text-center py-4">활동이 없습니다</p>
        ) : (
          <div className="space-y-3">
            {activities?.slice(0, 5).map((activity) => (
              <div key={activity.id} className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{activity.title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`px-2 py-0.5 rounded-full text-xs ${getStatusColor(activity.status)}`}>
                      {formatDealStatus(activity.status)}
                    </span>
                    <span className="text-xs text-gray-400">{formatRelativeTime(activity.updatedAt)}</span>
                  </div>
                </div>
                <p className="text-sm font-semibold text-gray-900">{formatCurrency(activity.amount)}</p>
              </div>
            ))}
          </div>
        )}
        <Link href="/deals" className="block text-center text-sm text-blue-600 mt-3">
          전체보기 →
        </Link>
      </div>
    </div>
  );
}

function AdvertiserDashboard() {
  const { data: stats, isLoading } = useAdvertiserStats();
  const { data: activities } = useRecentActivity(5);

  if (isLoading) return <LoadingSkeleton />;

  return (
    <div className="space-y-4">
      {/* 지출 카드 */}
      <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-2xl p-5 text-white">
        <p className="text-sm opacity-80">총 광고 지출</p>
        <p className="text-3xl font-bold mt-1">{formatCurrency(stats?.totalSpent || 0)}</p>
        <p className="text-sm opacity-80 mt-2">이번 달: {formatCurrency(stats?.monthlySpent || 0)}</p>
        <Link href="/deals/new" className="inline-block mt-4 px-4 py-2 bg-white/20 rounded-lg text-sm font-medium">
          새 광고 만들기
        </Link>
      </div>

      {/* 통계 그리드 */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard title="진행 중" value={stats?.activeDeals || 0} />
        <StatCard title="완료" value={stats?.completedDeals || 0} />
        <StatCard title="대기 중 제안" value={stats?.pendingProposals || 0} />
        <StatCard title="확인 필요" value={stats?.pendingConfirmation || 0} highlight={stats?.pendingConfirmation > 0} />
      </div>

      {/* 확인 필요 알림 */}
      {stats?.pendingConfirmation > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
          <p className="font-medium text-orange-800">
            ⚠️ {stats.pendingConfirmation}개의 콘텐츠가 확인을 기다리고 있습니다
          </p>
          <p className="text-sm text-orange-600 mt-1">72시간 내 미확인시 자동 승인</p>
          <Link href="/deals?status=SUBMITTED" className="text-sm text-orange-700 font-medium mt-2 inline-block">
            확인하기 →
          </Link>
        </div>
      )}

      {/* 최근 활동 */}
      <div className="bg-white rounded-xl p-4">
        <h3 className="font-semibold text-gray-900 mb-3">최근 활동</h3>
        {activities?.length === 0 ? (
          <p className="text-gray-400 text-center py-4">활동이 없습니다</p>
        ) : (
          <div className="space-y-3">
            {activities?.slice(0, 5).map((activity) => (
              <div key={activity.id} className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{activity.title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`px-2 py-0.5 rounded-full text-xs ${getStatusColor(activity.status)}`}>
                      {formatDealStatus(activity.status)}
                    </span>
                    <span className="text-xs text-gray-400">{formatRelativeTime(activity.updatedAt)}</span>
                  </div>
                </div>
                <p className="text-sm font-semibold text-gray-900">{formatCurrency(activity.amount)}</p>
              </div>
            ))}
          </div>
        )}
        <Link href="/deals" className="block text-center text-sm text-blue-600 mt-3">
          전체보기 →
        </Link>
      </div>
    </div>
  );
}

function StatCard({ title, value, type = 'number', highlight = false }: { 
  title: string; 
  value: number; 
  type?: 'number' | 'currency';
  highlight?: boolean;
}) {
  return (
    <div className={`bg-white rounded-xl p-4 ${highlight ? 'ring-2 ring-orange-400' : ''}`}>
      <p className="text-sm text-gray-500">{title}</p>
      <p className={`text-xl font-bold mt-1 ${highlight ? 'text-orange-600' : 'text-gray-900'}`}>
        {type === 'currency' ? formatCurrency(value) : value.toLocaleString()}
      </p>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="bg-gray-200 rounded-2xl h-40" />
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gray-200 rounded-xl h-20" />
        <div className="bg-gray-200 rounded-xl h-20" />
        <div className="bg-gray-200 rounded-xl h-20" />
        <div className="bg-gray-200 rounded-xl h-20" />
      </div>
      <div className="bg-gray-200 rounded-xl h-32" />
    </div>
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
        <Link href="/deals" className="flex-1 py-3 text-center text-gray-400">
          <span className="text-xl">💼</span>
          <p className="text-xs mt-1">거래</p>
        </Link>
        <Link href="/dashboard" className="flex-1 py-3 text-center text-blue-600">
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
