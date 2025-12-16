// src/app/admin/page.tsx

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { X } from 'lucide-react';

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
  profileImageUrl: string | null;
  warningCount: number;
  suspendedUntil: string | null;
  createdAt: string;
  postCount: number;
  role?: string;
  bio?: string;
  isVerified?: boolean;
}

interface UserDetail extends UserItem {
  followers?: number;
  following?: number;
  posts?: any[];
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

// 유틸 함수
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(value || 0);
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return '방금 전';
  if (minutes < 60) return `${minutes}분 전`;
  if (hours < 24) return `${hours}시간 전`;
  if (days < 7) return `${days}일 전`;
  return date.toLocaleDateString('ko-KR');
}

// 관리자 API
const adminApi = {
  getStats: async () => {
    const res = await api.get('/admin/stats');
    return res.data;
  },
  getUsers: async (page: number = 1, search?: string) => {
    const res = await api.get(`/admin/users?page=${page}${search ? `&search=${search}` : ''}`);
    return res.data;
  },
  getUserDetail: async (userId: string) => {
    const res = await api.get(`/admin/users/${userId}`);
    return res.data;
  },
  getReports: async (status?: string) => {
    const res = await api.get(`/admin/reports${status ? `?status=${status}` : ''}`);
    return res.data;
  },
  suspendUser: (userId: string, days: number, reason: string) =>
    api.post(`/admin/users/${userId}/suspend`, { days, reason }),
  unsuspendUser: (userId: string) =>
    api.post(`/admin/users/${userId}/unsuspend`),
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
      <main className="max-w-4xl mx-auto px-4 py-6 pb-24">
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
        <StatCard label="총 유저" value={stats?.totalUsers} />
        <StatCard label="이번 달 신규" value={stats?.newUsersThisMonth} color="blue" />
        <StatCard label="총 거래" value={stats?.totalDeals} />
        <StatCard label="진행 중" value={stats?.activeDeals} color="purple" />
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
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'users', page, search],
    queryFn: () => adminApi.getUsers(page, search || undefined),
  });

  const { data: userDetail, isLoading: isLoadingDetail } = useQuery({
    queryKey: ['admin', 'user', selectedUser],
    queryFn: () => adminApi.getUserDetail(selectedUser!),
    enabled: !!selectedUser,
  });

  const suspendMutation = useMutation({
    mutationFn: ({ userId, days, reason }: { userId: string; days: number; reason: string }) =>
      adminApi.suspendUser(userId, days, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'user', selectedUser] });
    },
  });

  const unsuspendMutation = useMutation({
    mutationFn: (userId: string) => adminApi.unsuspendUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'user', selectedUser] });
    },
  });

  const warnMutation = useMutation({
    mutationFn: ({ userId, type, reason }: { userId: string; type: string; reason: string }) =>
      adminApi.warnUser(userId, type, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'user', selectedUser] });
    },
  });

  const handleSuspend = (userId: string) => {
    const days = prompt('정지 기간 (일):', '7');
    const reason = prompt('정지 사유:');
    if (days && reason) {
      suspendMutation.mutate({ userId, days: parseInt(days), reason });
    }
  };

  const handleUnsuspend = (userId: string) => {
    if (confirm('정지를 해제하시겠습니까?')) {
      unsuspendMutation.mutate(userId);
    }
  };

  const handleWarn = (userId: string) => {
    const reason = prompt('경고 사유:');
    if (reason) {
      warnMutation.mutate({ userId, type: 'OTHER', reason });
    }
  };

  const users = data?.items || [];
  const totalPages = data?.totalPages || 1;

  return (
    <div className="space-y-4">
      {/* 검색 */}
      <div className="flex gap-2">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && setPage(1)}
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
      ) : users.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">유저가 없습니다</p>
        </div>
      ) : (
        <div className="space-y-3">
          {users.map((user: UserItem) => (
            <div
              key={user.id}
              className="bg-white rounded-xl p-4 cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setSelectedUser(user.id)}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden flex items-center justify-center">
                    {user.profileImageUrl ? (
                      <img src={user.profileImageUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-gray-400">👤</span>
                    )}
                  </div>
                  <div>
                    <p className="font-medium">{user.name || '이름 없음'}</p>
                    <p className="text-sm text-gray-500">{user.email}</p>
                    <div className="flex gap-2 mt-2 text-xs flex-wrap">
                      <span className="px-2 py-0.5 bg-gray-100 rounded">
                        게시글: {user.postCount || 0}개
                      </span>
                      <span className="px-2 py-0.5 bg-gray-100 rounded">
                        가입: {new Date(user.createdAt).toLocaleDateString('ko-KR')}
                      </span>
                      {user.warningCount > 0 && (
                        <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded">
                          경고: {user.warningCount}회
                        </span>
                      )}
                      {user.suspendedUntil && new Date(user.suspendedUntil) > new Date() && (
                        <span className="px-2 py-0.5 bg-red-100 text-red-800 rounded">
                          정지됨
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <span className="text-gray-400 text-sm">상세보기 →</span>
              </div>
            </div>
          ))}

          {/* 페이지네이션 */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 bg-white rounded-lg disabled:opacity-50"
              >
                이전
              </button>
              <span className="px-4 py-2">{page} / {totalPages}</span>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={page === totalPages}
                className="px-4 py-2 bg-white rounded-lg disabled:opacity-50"
              >
                다음
              </button>
            </div>
          )}
        </div>
      )}

      {/* 유저 상세 모달 */}
      {selectedUser && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedUser(null)}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {isLoadingDetail ? (
              <div className="p-6 text-center">로딩 중...</div>
            ) : userDetail ? (
              <>
                {/* 헤더 */}
                <div className="sticky top-0 bg-white border-b px-4 py-3 flex items-center justify-between">
                  <h3 className="font-bold text-lg">유저 상세정보</h3>
                  <button
                    onClick={() => setSelectedUser(null)}
                    className="p-1 hover:bg-gray-100 rounded"
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* 프로필 */}
                <div className="p-4 border-b">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-gray-200 overflow-hidden flex items-center justify-center">
                      {userDetail.profileImageUrl ? (
                        <img src={userDetail.profileImageUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-2xl text-gray-400">👤</span>
                      )}
                    </div>
                    <div>
                      <p className="font-bold text-lg">{userDetail.name || '이름 없음'}</p>
                      <p className="text-sm text-gray-500">{userDetail.email}</p>
                      {userDetail.role && (
                        <span className={`inline-block mt-1 px-2 py-0.5 rounded text-xs ${
                          userDetail.role === 'ADMIN' || userDetail.role === 'SUPER_ADMIN'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {userDetail.role}
                        </span>
                      )}
                    </div>
                  </div>
                  {userDetail.bio && (
                    <p className="mt-3 text-sm text-gray-600">{userDetail.bio}</p>
                  )}
                </div>

                {/* 통계 */}
                <div className="p-4 border-b">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-xl font-bold">{userDetail.postCount || 0}</p>
                      <p className="text-xs text-gray-500">게시글</p>
                    </div>
                    <div>
                      <p className="text-xl font-bold">{userDetail.followers || 0}</p>
                      <p className="text-xs text-gray-500">팔로워</p>
                    </div>
                    <div>
                      <p className="text-xl font-bold">{userDetail.following || 0}</p>
                      <p className="text-xs text-gray-500">팔로잉</p>
                    </div>
                  </div>
                </div>

                {/* 상세 정보 */}
                <div className="p-4 border-b space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">가입일</span>
                    <span>{new Date(userDetail.createdAt).toLocaleDateString('ko-KR')}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">이메일 인증</span>
                    <span className={userDetail.isVerified ? 'text-green-600' : 'text-red-600'}>
                      {userDetail.isVerified ? '완료' : '미완료'}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">경고 횟수</span>
                    <span className={userDetail.warningCount > 0 ? 'text-yellow-600 font-medium' : ''}>
                      {userDetail.warningCount || 0}회
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">정지 상태</span>
                    <span className={userDetail.suspendedUntil && new Date(userDetail.suspendedUntil) > new Date() ? 'text-red-600 font-medium' : 'text-green-600'}>
                      {userDetail.suspendedUntil && new Date(userDetail.suspendedUntil) > new Date()
                        ? `${new Date(userDetail.suspendedUntil).toLocaleDateString('ko-KR')}까지`
                        : '정상'}
                    </span>
                  </div>
                </div>

                {/* 관리 버튼 */}
                <div className="p-4 space-y-2">
                  <div className="flex gap-2">
                    {userDetail.suspendedUntil && new Date(userDetail.suspendedUntil) > new Date() ? (
                      <button
                        onClick={() => handleUnsuspend(userDetail.id)}
                        disabled={unsuspendMutation.isPending}
                        className="flex-1 py-2 bg-green-600 text-white rounded-lg text-sm font-medium disabled:opacity-50"
                      >
                        정지 해제
                      </button>
                    ) : (
                      <button
                        onClick={() => handleSuspend(userDetail.id)}
                        disabled={suspendMutation.isPending}
                        className="flex-1 py-2 bg-red-600 text-white rounded-lg text-sm font-medium disabled:opacity-50"
                      >
                        계정 정지
                      </button>
                    )}
                    <button
                      onClick={() => handleWarn(userDetail.id)}
                      disabled={warnMutation.isPending}
                      className="flex-1 py-2 bg-yellow-500 text-white rounded-lg text-sm font-medium disabled:opacity-50"
                    >
                      경고 부여
                    </button>
                  </div>
                  <Link
                    href={`/profile/${userDetail.id}`}
                    className="block w-full py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium text-center"
                  >
                    프로필 페이지로 이동
                  </Link>
                </div>
              </>
            ) : (
              <div className="p-6 text-center text-gray-500">유저 정보를 불러올 수 없습니다</div>
            )}
          </div>
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

  const reports = data?.items || [];

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
      ) : reports.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">신고가 없습니다</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((report: ReportItem) => (
            <div key={report.id} className="bg-white rounded-xl p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-sm">
                    <span className="font-medium">{report.reporter?.name || report.reporter?.email || '알 수 없음'}</span>
                    {' → '}
                    <span className="text-red-600 font-medium">{report.reported?.name || report.reported?.email || '알 수 없음'}</span>
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

function StatCard({ label, value, color }: { label: string; value?: number; color?: string }) {
  const colorClass = color === 'blue' ? 'text-blue-600' : color === 'purple' ? 'text-purple-600' : 'text-gray-900';
  return (
    <div className="bg-white rounded-xl p-4">
      <p className="text-sm text-gray-500">{label}</p>
      <p className={`text-2xl font-bold ${colorClass}`}>{(value ?? 0).toLocaleString()}</p>
    </div>
  );
}