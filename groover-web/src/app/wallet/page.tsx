// src/app/wallet/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AppHeader from '@/components/layout/AppHeader';
import api from '@/lib/api';

interface Wallet {
  id: string;
  balance: number;
  pendingBalance: number;
  totalEarned: number;
  totalWithdrawn: number;
  isVerified: boolean;
  bankName: string | null;
  bankAccount: string | null;
  accountHolder: string | null;
}

interface Transaction {
  id: string;
  type: string;
  amount: number;
  balance: number;
  description: string;
  createdAt: string;
}

interface Withdrawal {
  id: string;
  amount: number;
  fee: number;
  netAmount: number;
  status: string;
  createdAt: string;
}

const statusLabels: Record<string, { text: string; color: string; bg: string }> = {
  PENDING: { text: '대기중', color: '#f59e0b', bg: '#fef3c7' },
  PROCESSING: { text: '처리중', color: '#0f62fe', bg: '#dbeafe' },
  COMPLETED: { text: '완료', color: '#22c55e', bg: '#dcfce7' },
  REJECTED: { text: '거절', color: '#ef4444', bg: '#fee2e2' },
  FAILED: { text: '실패', color: '#ef4444', bg: '#fee2e2' },
};

export default function WalletPage() {
  const router = useRouter();
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'transactions' | 'withdrawals'>('transactions');
  
  // 출금 모달
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState('');
  const [payoutLoading, setPayoutLoading] = useState(false);
  
  // 계좌 등록 모달
  const [showBankModal, setShowBankModal] = useState(false);
  const [bankName, setBankName] = useState('');
  const [bankAccount, setBankAccount] = useState('');
  const [accountHolder, setAccountHolder] = useState('');
  const [bankLoading, setBankLoading] = useState(false);

  useEffect(() => {
    fetchWalletData();
  }, []);

  const fetchWalletData = async () => {
    try {
      setIsLoading(true);
      const [walletRes, transactionsRes, withdrawalsRes] = await Promise.all([
        api.get('/wallet'),
        api.get('/wallet/transactions'),
        api.get('/wallet/withdrawals'),
      ]);
      
      setWallet(walletRes.data.data);
      setTransactions(transactionsRes.data.data.transactions || []);
      setWithdrawals(withdrawalsRes.data.data.withdrawals || []);
    } catch (error: any) {
      if (error.response?.status === 401) {
        router.push('/login');
      }
      console.error('지갑 데이터 로드 실패:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePayoutRequest = async () => {
    const amount = parseInt(payoutAmount);
    if (isNaN(amount) || amount < 10000) {
      alert('최소 출금 금액은 10,000원입니다.');
      return;
    }
    if (!wallet || amount > wallet.balance) {
      alert('출금 가능 금액을 초과했습니다.');
      return;
    }

    try {
      setPayoutLoading(true);
      await api.post('/wallet/withdraw', { amount });
      alert(`${amount.toLocaleString()}원 출금 요청이 완료되었습니다.\n영업일 기준 1-3일 내 입금됩니다.`);
      setShowPayoutModal(false);
      setPayoutAmount('');
      fetchWalletData();
    } catch (error: any) {
      alert(error.response?.data?.message || '출금 요청 실패');
    } finally {
      setPayoutLoading(false);
    }
  };

  const handleBankUpdate = async () => {
    if (!bankName || !bankAccount || !accountHolder) {
      alert('모든 정보를 입력해주세요.');
      return;
    }

    try {
      setBankLoading(true);
      await api.put('/wallet/bank-account', {
        bankName,
        bankAccount,
        accountHolder,
      });
      alert('계좌 정보가 등록되었습니다.');
      setShowBankModal(false);
      fetchWalletData();
    } catch (error: any) {
      alert(error.response?.data?.message || '계좌 등록 실패');
    } finally {
      setBankLoading(false);
    }
  };

  const maskAccount = (account: string | null) => {
    if (!account) return '';
    if (account.length > 4) {
      return '****' + account.slice(-4);
    }
    return account;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <>
        <AppHeader />
        <div style={{ padding: '40px', textAlign: 'center' }}>
          <p>로딩 중...</p>
        </div>
      </>
    );
  }

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
            {(wallet?.balance || 0).toLocaleString()}원
          </p>
          <p style={{ fontSize: '13px', color: '#6ee7b7' }}>
            + 대기 중: {(wallet?.pendingBalance || 0).toLocaleString()}원
          </p>
          <button
            onClick={() => {
              if (!wallet?.bankName) {
                alert('먼저 출금 계좌를 등록해주세요.');
                setShowBankModal(true);
                return;
              }
              if (!wallet?.isVerified) {
                alert('계좌 인증이 필요합니다.');
                return;
              }
              setShowPayoutModal(true);
            }}
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
          {wallet?.bankName ? (
            <>
              <div>
                <p style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>정산 계좌</p>
                <p style={{ fontSize: '14px', fontWeight: '600' }}>
                  {wallet.bankName} {maskAccount(wallet.bankAccount)}
                </p>
              </div>
              <span
                style={{
                  fontSize: '11px',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  background: wallet.isVerified ? '#dcfce7' : '#fee2e2',
                  color: wallet.isVerified ? '#22c55e' : '#ef4444',
                }}
              >
                {wallet.isVerified ? '✓ 인증완료' : '미인증'}
              </span>
            </>
          ) : (
            <button
              onClick={() => setShowBankModal(true)}
              style={{
                width: '100%',
                padding: '12px',
                background: 'none',
                border: '1px dashed #ccc',
                borderRadius: '8px',
                color: '#666',
                cursor: 'pointer',
              }}
            >
              + 출금 계좌 등록하기
            </button>
          )}
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
              {(wallet?.totalEarned || 0).toLocaleString()}원
            </p>
          </div>
          <div style={{ padding: '16px', background: '#fff', border: '1px solid #eee', borderRadius: '12px' }}>
            <p style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>총 출금</p>
            <p style={{ fontSize: '18px', fontWeight: '700' }}>
              {(wallet?.totalWithdrawn || 0).toLocaleString()}원
            </p>
          </div>
        </div>

        {/* 탭 */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          <button
            onClick={() => setActiveTab('transactions')}
            style={{
              flex: 1,
              padding: '12px',
              border: 'none',
              borderRadius: '10px',
              background: activeTab === 'transactions' ? '#0f62fe' : '#f5f5f5',
              color: activeTab === 'transactions' ? '#fff' : '#666',
              fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            거래 내역
          </button>
          <button
            onClick={() => setActiveTab('withdrawals')}
            style={{
              flex: 1,
              padding: '12px',
              border: 'none',
              borderRadius: '10px',
              background: activeTab === 'withdrawals' ? '#0f62fe' : '#f5f5f5',
              color: activeTab === 'withdrawals' ? '#fff' : '#666',
              fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            출금 내역
          </button>
        </div>

        {/* 거래 내역 */}
        {activeTab === 'transactions' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {transactions.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#999', padding: '40px' }}>
                거래 내역이 없습니다.
              </p>
            ) : (
              transactions.map((tx) => (
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
                        background: tx.amount > 0 ? '#dcfce7' : '#fee2e2',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '16px',
                      }}
                    >
                      {tx.amount > 0 ? '💰' : '💸'}
                    </div>
                    <div>
                      <p style={{ fontSize: '13px', fontWeight: '500' }}>{tx.description}</p>
                      <p style={{ fontSize: '11px', color: '#999' }}>{formatDate(tx.createdAt)}</p>
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
              ))
            )}
          </div>
        )}

        {/* 출금 내역 */}
        {activeTab === 'withdrawals' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {withdrawals.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#999', padding: '40px' }}>
                출금 내역이 없습니다.
              </p>
            ) : (
              withdrawals.map((w) => {
                const status = statusLabels[w.status] || statusLabels.PENDING;
                return (
                  <div
                    key={w.id}
                    style={{
                      padding: '14px',
                      background: '#fff',
                      border: '1px solid #eee',
                      borderRadius: '10px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ fontSize: '14px', fontWeight: '600' }}>
                        {w.amount.toLocaleString()}원
                      </span>
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
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '12px', color: '#999' }}>
                        실수령액: {w.netAmount.toLocaleString()}원
                      </span>
                      <span style={{ fontSize: '12px', color: '#999' }}>
                        {formatDate(w.createdAt)}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
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
              출금 가능: {(wallet?.balance || 0).toLocaleString()}원
            </p>

            <div style={{ marginBottom: '16px' }}>
              <p style={{ fontSize: '13px', color: '#666', marginBottom: '8px' }}>출금 금액</p>
              <input
                type="number"
                value={payoutAmount}
                onChange={(e) => setPayoutAmount(e.target.value)}
                placeholder="최소 10,000원"
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
                {wallet?.bankName} {maskAccount(wallet?.bankAccount || null)}
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
                disabled={payoutLoading}
                style={{
                  flex: 1,
                  padding: '14px',
                  background: payoutLoading ? '#ccc' : '#0f62fe',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '10px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: payoutLoading ? 'not-allowed' : 'pointer',
                }}
              >
                {payoutLoading ? '처리중...' : '출금 요청'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 계좌 등록 모달 */}
      {showBankModal && (
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
          onClick={() => setShowBankModal(false)}
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
            <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '20px' }}>
              🏦 출금 계좌 등록
            </h3>

            <div style={{ marginBottom: '16px' }}>
              <p style={{ fontSize: '13px', color: '#666', marginBottom: '8px' }}>은행</p>
              <select
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  fontSize: '14px',
                  outline: 'none',
                }}
              >
                <option value="">은행 선택</option>
                <option value="카카오뱅크">카카오뱅크</option>
                <option value="토스뱅크">토스뱅크</option>
                <option value="국민은행">국민은행</option>
                <option value="신한은행">신한은행</option>
                <option value="우리은행">우리은행</option>
                <option value="하나은행">하나은행</option>
                <option value="농협은행">농협은행</option>
                <option value="기업은행">기업은행</option>
                <option value="SC제일은행">SC제일은행</option>
                <option value="씨티은행">씨티은행</option>
              </select>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <p style={{ fontSize: '13px', color: '#666', marginBottom: '8px' }}>계좌번호</p>
              <input
                type="text"
                value={bankAccount}
                onChange={(e) => setBankAccount(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="- 없이 숫자만 입력"
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  fontSize: '14px',
                  outline: 'none',
                }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <p style={{ fontSize: '13px', color: '#666', marginBottom: '8px' }}>예금주</p>
              <input
                type="text"
                value={accountHolder}
                onChange={(e) => setAccountHolder(e.target.value)}
                placeholder="예금주명"
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  fontSize: '14px',
                  outline: 'none',
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setShowBankModal(false)}
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
                onClick={handleBankUpdate}
                disabled={bankLoading}
                style={{
                  flex: 1,
                  padding: '14px',
                  background: bankLoading ? '#ccc' : '#0f62fe',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '10px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: bankLoading ? 'not-allowed' : 'pointer',
                }}
              >
                {bankLoading ? '등록중...' : '등록하기'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}