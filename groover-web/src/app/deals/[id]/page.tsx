// src/app/deals/[id]/page.tsx

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useDeal, useAcceptProposal, useRejectProposal, usePayDeal, useSubmitContent, useConfirmContent, useRejectContent } from '@/hooks/useEscrow';
import { formatCurrency, formatRelativeTime, formatDealStatus, getStatusColor } from '@/lib/utils';

type UserRole = 'creator' | 'advertiser';

export default function DealDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [role, setRole] = useState<UserRole>('creator');
  const { data: deal, isLoading, error } = useDeal(params.id);

  const [submitUrl, setSubmitUrl] = useState('');
  const [submitNote, setSubmitNote] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);

  const acceptMutation = useAcceptProposal();
  const rejectProposalMutation = useRejectProposal();
  const payMutation = usePayDeal();
  const submitMutation = useSubmitContent();
  const confirmMutation = useConfirmContent();
  const rejectContentMutation = useRejectContent();

  const isActionLoading = acceptMutation.isPending || rejectProposalMutation.isPending || 
    payMutation.isPending || submitMutation.isPending || confirmMutation.isPending || rejectContentMutation.isPending;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (error || !deal) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-2">거래를 찾을 수 없습니다</p>
          <Link href="/deals" className="text-blue-600">목록으로</Link>
        </div>
      </div>
    );
  }

  const otherParty = role === 'creator' ? deal?.data?.advertiser : deal?.data?.creator;
  const amount = role === 'creator' ? deal?.data?.creatorAmount : deal?.data?.totalAmount;

  const handleAccept = async () => {
    if (confirm('제안을 수락하시겠습니까?')) {
      await acceptMutation.mutateAsync(deal?.data?.id);
    }
  };

  const handleRejectProposal = async () => {
    if (confirm('제안을 거절하시겠습니까?')) {
      await rejectProposalMutation.mutateAsync(deal?.data?.id);
    }
  };

  const handlePay = async () => {
    const paymentId = `pay_${Date.now()}`;
    if (confirm(`${formatCurrency(deal?.data?.totalAmount)}을 결제하시겠습니까?`)) {
      await payMutation.mutateAsync({ dealId: deal?.data?.id, paymentId });
    }
  };

  const handleSubmit = async () => {
    if (!submitUrl) {
      alert('URL을 입력해주세요.');
      return;
    }
    await submitMutation.mutateAsync({ dealId: deal?.data?.id, dto: { url: submitUrl, note: submitNote } });
  };

  const handleConfirm = async () => {
    if (confirm('콘텐츠를 승인하시겠습니까?')) {
      await confirmMutation.mutateAsync(deal?.data?.id);
    }
  };

  const handleRejectContent = async () => {
    if (!rejectReason) {
      alert('거절 사유를 입력해주세요.');
      return;
    }
    await rejectContentMutation.mutateAsync({ dealId: deal?.data?.id, dto: { reason: rejectReason } });
    setShowRejectModal(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-6">
      {/* 헤더 */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <button onClick={() => router.back()} className="text-gray-500">
              ← 뒤로
            </button>
            {/* 역할 전환 */}
            <div className="flex gap-1 bg-gray-100 p-1 rounded-lg text-sm">
              <button
                onClick={() => setRole('creator')}
                className={`px-3 py-1 rounded-md ${role === 'creator' ? 'bg-white shadow-sm' : 'text-gray-500'}`}
              >
                크리에이터
              </button>
              <button
                onClick={() => setRole('advertiser')}
                className={`px-3 py-1 rounded-md ${role === 'advertiser' ? 'bg-white shadow-sm' : 'text-gray-500'}`}
              >
                광고주
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* 콘텐츠 */}
      <main className="max-w-2xl mx-auto px-4 py-4 space-y-4">
        {/* 제목 & 상태 */}
        <div className="bg-white rounded-xl p-4">
          <div className="flex items-start justify-between">
            <h1 className="text-lg font-bold text-gray-900">{deal?.data?.title}</h1>
            <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(deal?.data?.status)}`}>
              {formatDealStatus(deal?.data?.status)}
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-1">{formatRelativeTime(deal?.data?.createdAt)}</p>
        </div>

        {/* 상대방 정보 */}
        <div className="bg-white rounded-xl p-4">
          <p className="text-sm text-gray-500 mb-2">{role === 'creator' ? '광고주' : '크리에이터'}</p>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
              {otherParty.name?.charAt(0) || '?'}
            </div>
            <div>
              <p className="font-medium">{otherParty.name || '이름 없음'}</p>
              <p className="text-sm text-gray-500">{otherParty.email}</p>
            </div>
          </div>
        </div>

        {/* 금액 */}
        <div className="bg-white rounded-xl p-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-500">{role === 'creator' ? '예상 수익' : '광고 비용'}</p>
              <p className="text-2xl font-bold">{formatCurrency(amount)}</p>
            </div>
            {role === 'creator' && (
              <div className="text-right text-sm text-gray-500">
                <p>총액: {formatCurrency(deal?.data?.totalAmount)}</p>
                <p>수수료: {formatCurrency(deal?.data?.platformFee)}</p>
              </div>
            )}
          </div>
        </div>

        {/* 설명 */}
        <div className="bg-white rounded-xl p-4">
          <p className="text-sm text-gray-500 mb-2">설명</p>
          <p className="text-gray-900 whitespace-pre-wrap">{deal?.data?.description}</p>
        </div>

        {/* 요구사항 */}
        {deal?.data?.requirements && (
          <div className="bg-white rounded-xl p-4">
            <p className="text-sm text-gray-500 mb-2">요구사항</p>
            <p className="text-gray-900 whitespace-pre-wrap">{deal?.data?.requirements}</p>
          </div>
        )}

        {/* 제출된 콘텐츠 */}
        {deal?.data?.submittedUrl && (
          <div className="bg-blue-50 rounded-xl p-4">
            <p className="text-sm text-blue-600 font-medium mb-2">📎 제출된 콘텐츠</p>
            <a href={deal?.data?.submittedUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 break-all">
              {deal?.data?.submittedUrl}
            </a>
            {deal?.data?.submittedNote && <p className="text-sm text-gray-600 mt-2">{deal?.data?.submittedNote}</p>}
          </div>
        )}

        {/* 거절 사유 */}
        {deal?.data?.rejectionReason && (
          <div className="bg-red-50 rounded-xl p-4">
            <p className="text-sm text-red-600 font-medium mb-2">❌ 거절 사유</p>
            <p className="text-gray-900">{deal?.data?.rejectionReason}</p>
          </div>
        )}

        {/* 액션 버튼 */}
        <div className="space-y-3">
          {/* 크리에이터 - 수락/거절 */}
          {role === 'creator' && deal?.data?.status === 'PROPOSED' && (
            <div className="flex gap-3">
              <button onClick={handleAccept} disabled={isActionLoading}
                className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-medium disabled:opacity-50">
                수락하기
              </button>
              <button onClick={handleRejectProposal} disabled={isActionLoading}
                className="flex-1 py-3 bg-gray-200 text-gray-700 rounded-xl font-medium disabled:opacity-50">
                거절하기
              </button>
            </div>
          )}

          {/* 광고주 - 결제 */}
          {role === 'advertiser' && deal?.data?.status === 'ACCEPTED' && (
            <button onClick={handlePay} disabled={isActionLoading}
              className="w-full py-3 bg-purple-600 text-white rounded-xl font-medium disabled:opacity-50">
              {formatCurrency(deal?.data?.totalAmount)} 결제하기
            </button>
          )}

          {/* 크리에이터 - 제출 */}
          {role === 'creator' && deal?.data?.status === 'PAID' && (
            <div className="bg-white rounded-xl p-4 space-y-3">
              <div>
                <label className="text-sm text-gray-500">콘텐츠 URL *</label>
                <input
                  type="url"
                  value={submitUrl}
                  onChange={(e) => setSubmitUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full mt-1 px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="text-sm text-gray-500">메모 (선택)</label>
                <textarea
                  value={submitNote}
                  onChange={(e) => setSubmitNote(e.target.value)}
                  rows={2}
                  className="w-full mt-1 px-3 py-2 border rounded-lg"
                />
              </div>
              <button onClick={handleSubmit} disabled={isActionLoading || !submitUrl}
                className="w-full py-3 bg-blue-600 text-white rounded-xl font-medium disabled:opacity-50">
                제출하기
              </button>
              {deal?.data?.submitDeadline && (
                <p className="text-sm text-center text-orange-600">
                  ⏰ 제출 기한: {new Date(deal?.data?.submitDeadline).toLocaleDateString('ko-KR')}
                </p>
              )}
            </div>
          )}

          {/* 광고주 - 승인/수정요청 */}
          {role === 'advertiser' && deal?.data?.status === 'SUBMITTED' && (
            <div className="space-y-3">
              <button onClick={handleConfirm} disabled={isActionLoading}
                className="w-full py-3 bg-green-600 text-white rounded-xl font-medium disabled:opacity-50">
                ✓ 승인하기
              </button>
              <button onClick={() => setShowRejectModal(true)} disabled={isActionLoading}
                className="w-full py-3 bg-red-100 text-red-600 rounded-xl font-medium disabled:opacity-50">
                ✕ 수정 요청
              </button>
              {deal?.data?.confirmDeadline && (
                <p className="text-sm text-center text-orange-600">
                  ⏰ 확인 기한: {new Date(deal?.data?.confirmDeadline).toLocaleDateString('ko-KR')}
                </p>
              )}
            </div>
          )}

          {/* 완료 상태 */}
          {(deal?.data?.status === 'SETTLED' || deal?.data?.status === 'CONFIRMED') && (
            <div className="text-center py-4">
              <p className="text-4xl mb-2">✅</p>
              <p className="text-green-600 font-medium">거래가 완료되었습니다!</p>
            </div>
          )}
        </div>
      </main>

      {/* 수정 요청 모달 */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-5">
            <h3 className="text-lg font-bold mb-4">수정 요청</h3>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="수정이 필요한 부분을 설명해주세요"
              rows={4}
              className="w-full px-3 py-2 border rounded-lg"
            />
            <div className="flex gap-3 mt-4">
              <button onClick={() => setShowRejectModal(false)}
                className="flex-1 py-2 bg-gray-200 rounded-lg">
                취소
              </button>
              <button onClick={handleRejectContent} disabled={!rejectReason}
                className="flex-1 py-2 bg-red-600 text-white rounded-lg disabled:opacity-50">
                수정 요청
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
