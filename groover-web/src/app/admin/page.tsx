// src/app/admin/page.tsx

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { formatCurrency, formatRelativeTime } from '@/lib/utils';

// 관리자 API 타입
interface PlatformStats {
  totalUsers: number;
  newUsersThisMonth: number;
  totalDeals: number;
  completedDeals: number;
  activeDeals: number;
  totalTransactionVolume: number;
  totalPlatformFees: number;
  monthlyPlatformFees: number;
  pendingReports: number;
  directTradeAttempts: number;
}

interface UserItem {
  id: string;
  email: string;
  name: string | null;
  warningCount: number;
  adMatchingSuspended: boolean;
  createdAt: string;
  totalEarnings: number;
  completedDeals: number;
}

interface ReportItem {
  id: string;
  reporter: { name: string; email: string };
  reported: { name: string; email: string };
  reason: string;
  status: string;
  createdAt: string;
  messageContent?: string;
}

// 관리자 API
const adminApi = {
  getStats: () => api.get<PlatformStats>('/admin/stats'),
  getUsers: (page: number = 1, search?: string) =>
    api.get<{ items: UserItem[]; total: number; totalPages: number }>(
      `/admin/users?page=${page}${search ? `&search=${search}` : ''}`
    ),
  getReports: (status?: string) =>
    api.get<{ items: ReportItem[]; total: number }>(
      `/admin/reports${status ? `?status=${status}` : ''}`
    ),
  suspendUser: (userId: string, days: number, reason: string) =>
    api.post(`/admin/users/${userId}/suspend`, { days, reason }),
  warnUser: (userId: string, type: string, reason: string) =>
    api.post(`/admin/users/${userId}/warn`, { type, reason }),
  processReport: (reportId: string, status: string, punishUser?: boolean) =>
    api.patch(`/admin/reports/${reportId}`, { status, punishUser }),
};

type Tab = 'stats' | 'users' | 'reports';

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>('stats');

  return (
    <div className="min-h-screen bg-gray-100">
      {/* 헤더 */}
      <header className="bg-gray-900 text-white">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl">⚙️</span>
              <span className="font-bold text-lg">관리자 패널</span>
            </div>
            <Link href="/" className="text-sm text-gray-400 hover:text-white">
              ← 사이트로
            </Link>
          </div>

          {/* 탭 */}
          <div className="flex gap-4 mt-4">
            <button
              onClick={() => setTab('stats')}
              className={`pb-2 border-b-2 transition-colors ${
                tab === 'stats' ? 'border-white text-white' : 'border-transparent text-gray-400'
              }`}
            >
              📊 통계
            </button>
            <button
              onClick={() => setTab('users')}
              className={`pb-2 border-b-2 transition-colors ${
                tab === 'users' ? 'border-white text-white' : 'border-transparent text-gray-400'
              }`}
            >
              👥 유저
            </button>
            <button
              onClick={() => setTab('reports')}
              className={`pb-2 border-b-2 transition-colors ${
                tab === 'reports' ? 'border-white text-white' : 'border-transparent text-gray-400'
              }`}
            >
              🚨 신고
            </button>
          </div>
        </div>
      </header>

      {/* 콘텐츠 */}
      <main className="max-w-4xl mx-auto px-4 py-6">
        {tab === 'stats' && <StatsTab />}
        {tab === 'users' && <UsersTab />}
        {tab === 'reports' && <ReportsTab />}
      </main>
    </div>
  );
}

function StatsTab() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: () => adminApi.getStats(),
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl p-4 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-20 mb-2" />
            <div className="h-8 bg-gray-200 rounded w-16" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 주요 지표 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
       <StatCard label="총 유저" value={stats?.data?.totalUsers || 0} />
        <StatCard label="이번 달 신규" value={stats?.data?.newUsersThisMonth || 0} color="blue" />
          <StatCard label="총 거래" value={stats?.data?.totalDeals || 0} />
        <StatCard label="진행 중" value={stats?.data?.activeDeals || 0} color="purple" />
      </div>

      {/* 수익 */}
      <div className="bg-white rounded-xl p-5">
        <h3 className="font-semibold text-gray-900 mb-4">💰 수익 현황</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500">총 거래액</p>
            <p className="text-xl font-bold">{formatCurrency(stats?.totalTransactionVolume || 0)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">총 수수료</p>
            <p className="text-xl font-bold text-green-600">{formatCurrency(stats?.totalPlatformFees || 0)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">이번 달 수수료</p>
            <p className="text-xl font-bold">{formatCurrency(stats?.monthlyPlatformFees || 0)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">완료 거래</p>
            <p className="text-xl font-bold">{stats?.completedDeals || 0}건</p>
          </div>
        </div>
      </div>

      {/* 경고 */}
      <div className="grid grid-cols-2 gap-4">
        <div className={`bg-white rounded-xl p-5 ${(stats?.pendingReports || 0) > 0 ? 'ring-2 ring-red-400' : ''}`}>
          <p className="text-sm text-gray-500">대기 중인 신고</p>
          <p className="text-2xl font-bold text-red-600">{stats?.pendingReports || 0}</p>
        </div>
        <div className="bg-white rounded-xl p-5">
          <p className="text-sm text-gray-500">직거래 시도 (이번 달)</p>
          <p className="text-2xl font-bold text-orange-600">{stats?.directTradeAttempts || 0}</p>
        </div>
      </div>
    </div>
  );
}

function UsersTab() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'users', page, search],
    queryFn: () => adminApi.getUsers(page, search || undefined),
  });

  const suspendMutation = useMutation({
    mutationFn: ({ userId, days, reason }: { userId: string; days: number; reason: string }) =>
      adminApi.suspendUser(userId, days, reason),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'users'] }),
  });

  const handleSuspend = (userId: string) => {
    const days = prompt('정지 기간 (일):', '7');
    const reason = prompt('정지 사유:');
    if (days && reason) {
      suspendMutation.mutate({ userId, days: parseInt(days), reason });
    }
  };

  return (
    <div className="space-y-4">
      {/* 검색 */}
      <div className="flex gap-2">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="이메일 또는 이름 검색..."
          className="flex-1 px-4 py-2 border rounded-lg"
        />
        <button
          onClick={() => setPage(1)}
          className="px-4 py-2 bg-gray-900 text-white rounded-lg"
        >
          검색
        </button>
      </div>

      {/* 유저 목록 */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-xl p-4 animate-pulse">
              <div className="h-5 bg-gray-200 rounded w-1/2 mb-2" />
              <div className="h-4 bg-gray-200 rounded w-1/3" />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {data?.items.map((user) => (
            <div key={user.id} className="bg-white rounded-xl p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium">{user.name || '이름 없음'}</p>
                  <p className="text-sm text-gray-500">{user.email}</p>
                  <div className="flex gap-2 mt-2 text-xs">
                    <span className="px-2 py-0.5 bg-gray-100 rounded">
                      수익: {formatCurrency(user.totalEarnings)}
                    </span>
                    <span className="px-2 py-0.5 bg-gray-100 rounded">
                      거래: {user.completedDeals}건
                    </span>
                    {user.warningCount > 0 && (
                      <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded">
                        경고: {user.warningCount}회
                      </span>
                    )}
                    {user.adMatchingSuspended && (
                      <span className="px-2 py-0.5 bg-red-100 text-red-800 rounded">
                        정지됨
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleSuspend(user.id)}
                  disabled={suspendMutation.isPending}
                  className="text-sm text-red-600 hover:underline disabled:opacity-50"
                >
                  정지
                </button>
              </div>
            </div>
          ))}

          {/* 페이지네이션 */}
          {data && data.totalPages > 1 && (
            <div className="flex justify-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 bg-white rounded-lg disabled:opacity-50"
              >
                이전
              </button>
              <span className="px-4 py-2">{page} / {data.totalPages}</span>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={page === data.totalPages}
                className="px-4 py-2 bg-white rounded-lg disabled:opacity-50"
              >
                다음
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ReportsTab() {
  const [statusFilter, setStatusFilter] = useState<string | undefined>('PENDING');
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'reports', statusFilter],
    queryFn: () => adminApi.getReports(statusFilter),
  });

  const processMutation = useMutation({
    mutationFn: ({ reportId, status, punishUser }: { reportId: string; status: string; punishUser?: boolean }) =>
      adminApi.processReport(reportId, status, punishUser),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'reports'] }),
  });

  const handleProcess = (reportId: string, status: 'RESOLVED' | 'DISMISSED') => {
    const punish = status === 'RESOLVED' && confirm('피신고자를 제재하시겠습니까?');
    processMutation.mutate({ reportId, status, punishUser: punish });
  };

  return (
    <div className="space-y-4">
      {/* 필터 */}
      <div className="flex gap-2">
        {['PENDING', 'RESOLVED', 'DISMISSED'].map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status === statusFilter ? undefined : status)}
            className={`px-3 py-1.5 rounded-full text-sm ${
              statusFilter === status ? 'bg-gray-900 text-white' : 'bg-white text-gray-600'
            }`}
          >
            {status === 'PENDING' ? '대기' : status === 'RESOLVED' ? '처리됨' : '기각'}
          </button>
        ))}
      </div>

      {/* 신고 목록 */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-xl p-4 animate-pulse">
              <div className="h-5 bg-gray-200 rounded w-1/2 mb-2" />
              <div className="h-4 bg-gray-200 rounded w-full" />
            </div>
          ))}
        </div>
      ) : data?.items.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">신고가 없습니다</p>
        </div>
      ) : (
        <div className="space-y-3">
          {data?.items.map((report) => (
            <div key={report.id} className="bg-white rounded-xl p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-sm">
                    <span className="font-medium">{report.reporter.name || report.reporter.email}</span>
                    {' → '}
                    <span className="text-red-600 font-medium">{report.reported.name || report.reported.email}</span>
                  </p>
                  <p className="text-xs text-gray-400">{formatRelativeTime(report.createdAt)}</p>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-xs ${
                  report.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                  report.status === 'RESOLVED' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {report.status === 'PENDING' ? '대기' : report.status === 'RESOLVED' ? '처리됨' : '기각'}
                </span>
              </div>
              <p className="text-sm text-gray-700 mb-2">{report.reason}</p>
              {report.messageContent && (
                <p className="text-sm text-gray-500 bg-gray-50 p-2 rounded mb-3">
                  💬 "{report.messageContent}"
                </p>
              )}
              {report.status === 'PENDING' && (
                <div className="flex gap-2">
                  <button
                    onClick={() => handleProcess(report.id, 'RESOLVED')}
                    disabled={processMutation.isPending}
                    className="px-3 py-1 bg-green-600 text-white rounded text-sm disabled:opacity-50"
                  >
                    처리
                  </button>
                  <button
                    onClick={() => handleProcess(report.id, 'DISMISSED')}
                    disabled={processMutation.isPending}
                    className="px-3 py-1 bg-gray-200 text-gray-700 rounded text-sm disabled:opacity-50"
                  >
                    기각
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color?: string }) {
  const colorClass = color === 'blue' ? 'text-blue-600' : color === 'purple' ? 'text-purple-600' : 'text-gray-900';
  return (
    <div className="bg-white rounded-xl p-4">
      <p className="text-sm text-gray-500">{label}</p>
      <p className={`text-2xl font-bold ${colorClass}`}>{value.toLocaleString()}</p>
    </div>
  );
}
