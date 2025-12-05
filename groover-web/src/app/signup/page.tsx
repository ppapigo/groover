// src/app/signup/page.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

type Step = 'phone' | 'verify' | 'info' | 'complete';

export default function SignupPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [verifyCode, setVerifyCode] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [timer, setTimer] = useState(0);
  const [isVerified, setIsVerified] = useState(false);

  // 타이머
  useEffect(() => {
    if (timer > 0) {
      const interval = setInterval(() => setTimer((t) => t - 1), 1000);
      return () => clearInterval(interval);
    }
  }, [timer]);

  const formatPhone = (value: string) => {
    const numbers = value.replace(/[^0-9]/g, '');
    if (numbers.length <= 3) return numbers;
    if (numbers.length <= 7) return `${numbers.slice(0, 3)}-${numbers.slice(3)}`;
    return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7, 11)}`;
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhone(formatPhone(e.target.value));
  };

  // 인증번호 전송
  const handleSendCode = async () => {
    if (phone.replace(/-/g, '').length !== 11) {
      setError('올바른 전화번호를 입력해주세요.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // TODO: API 호출 POST /auth/send-verification
      const response = await fetch('/api/auth/send-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phone.replace(/-/g, '') }),
      });

      if (!response.ok) throw new Error('인증번호 전송에 실패했습니다.');

      setStep('verify');
      setTimer(180); // 3분
    } catch (err) {
      // Mock: 바로 다음 단계로
      console.log('Mock: 인증번호 전송', phone);
      setStep('verify');
      setTimer(180);
    } finally {
      setIsLoading(false);
    }
  };

  // 인증번호 확인
  const handleVerifyCode = async () => {
    if (verifyCode.length !== 6) {
      setError('6자리 인증번호를 입력해주세요.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // TODO: API 호출 POST /auth/verify-code
      const response = await fetch('/api/auth/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: phone.replace(/-/g, ''),
          code: verifyCode,
        }),
      });

      if (!response.ok) throw new Error('인증번호가 일치하지 않습니다.');

      setIsVerified(true);
      setStep('info');
    } catch (err) {
      // Mock: 123456이면 성공
      if (verifyCode === '123456') {
        setIsVerified(true);
        setStep('info');
      } else {
        setError('인증번호가 일치하지 않습니다. (테스트: 123456)');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // 회원가입 완료
  const handleSignup = async () => {
    if (!name.trim()) {
      setError('이름을 입력해주세요.');
      return;
    }
    if (password.length < 6) {
      setError('비밀번호는 6자 이상이어야 합니다.');
      return;
    }
    if (password !== passwordConfirm) {
      setError('비밀번호가 일치하지 않습니다.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // TODO: API 호출 POST /auth/signup
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: phone.replace(/-/g, ''),
          name,
          password,
        }),
      });

      if (!response.ok) throw new Error('회원가입에 실패했습니다.');

      setStep('complete');
    } catch (err) {
      // Mock: 바로 완료
      console.log('Mock: 회원가입', { phone, name, password });
      setStep('complete');
    } finally {
      setIsLoading(false);
    }
  };

  // 단계별 렌더링
  const renderStep = () => {
    switch (step) {
      case 'phone':
        return (
          <>
            <h2 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '8px' }}>
              전화번호 인증
            </h2>
            <p style={{ fontSize: '14px', color: '#666', marginBottom: '32px' }}>
              본인 확인을 위해 전화번호를 입력해주세요.
            </p>

            <div style={{ marginBottom: '24px' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: '500',
                  marginBottom: '8px',
                }}
              >
                전화번호
              </label>
              <input
                type="tel"
                value={phone}
                onChange={handlePhoneChange}
                placeholder="010-0000-0000"
                maxLength={13}
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  border: '1px solid #ddd',
                  borderRadius: '10px',
                  fontSize: '16px',
                  outline: 'none',
                }}
              />
            </div>

            <button
              onClick={handleSendCode}
              disabled={isLoading || phone.replace(/-/g, '').length !== 11}
              style={{
                width: '100%',
                padding: '16px',
                background: phone.replace(/-/g, '').length === 11 ? '#0f62fe' : '#ccc',
                color: '#fff',
                border: 'none',
                borderRadius: '10px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: phone.replace(/-/g, '').length === 11 ? 'pointer' : 'not-allowed',
              }}
            >
              {isLoading ? '전송 중...' : '인증번호 받기'}
            </button>
          </>
        );

      case 'verify':
        return (
          <>
            <h2 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '8px' }}>
              인증번호 입력
            </h2>
            <p style={{ fontSize: '14px', color: '#666', marginBottom: '32px' }}>
              {phone}로 전송된 인증번호를 입력해주세요.
            </p>

            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label style={{ fontSize: '13px', fontWeight: '500' }}>
                  인증번호
                </label>
                {timer > 0 && (
                  <span style={{ fontSize: '13px', color: '#ef4444' }}>
                    {formatTime(timer)}
                  </span>
                )}
              </div>
              <input
                type="text"
                value={verifyCode}
                onChange={(e) => setVerifyCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                placeholder="6자리 숫자"
                maxLength={6}
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  border: '1px solid #ddd',
                  borderRadius: '10px',
                  fontSize: '20px',
                  letterSpacing: '8px',
                  textAlign: 'center',
                  outline: 'none',
                }}
              />
            </div>

            <button
              onClick={handleVerifyCode}
              disabled={isLoading || verifyCode.length !== 6}
              style={{
                width: '100%',
                padding: '16px',
                background: verifyCode.length === 6 ? '#0f62fe' : '#ccc',
                color: '#fff',
                border: 'none',
                borderRadius: '10px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: verifyCode.length === 6 ? 'pointer' : 'not-allowed',
                marginBottom: '12px',
              }}
            >
              {isLoading ? '확인 중...' : '확인'}
            </button>

            <button
              onClick={() => {
                setTimer(180);
                handleSendCode();
              }}
              disabled={timer > 0}
              style={{
                width: '100%',
                padding: '14px',
                background: 'transparent',
                color: timer > 0 ? '#ccc' : '#0f62fe',
                border: '1px solid',
                borderColor: timer > 0 ? '#eee' : '#0f62fe',
                borderRadius: '10px',
                fontSize: '14px',
                cursor: timer > 0 ? 'not-allowed' : 'pointer',
              }}
            >
              인증번호 재전송
            </button>

            <p style={{ marginTop: '16px', fontSize: '12px', color: '#999', textAlign: 'center' }}>
              테스트 인증번호: 123456
            </p>
          </>
        );

      case 'info':
        return (
          <>
            <h2 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '8px' }}>
              회원 정보 입력
            </h2>
            <p style={{ fontSize: '14px', color: '#666', marginBottom: '32px' }}>
              사용하실 이름과 비밀번호를 입력해주세요.
            </p>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '8px' }}>
                이름 (닉네임)
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="이름 또는 닉네임"
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  border: '1px solid #ddd',
                  borderRadius: '10px',
                  fontSize: '16px',
                  outline: 'none',
                }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '8px' }}>
                비밀번호
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="6자 이상"
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  border: '1px solid #ddd',
                  borderRadius: '10px',
                  fontSize: '16px',
                  outline: 'none',
                }}
              />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '8px' }}>
                비밀번호 확인
              </label>
              <input
                type="password"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                placeholder="비밀번호 재입력"
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  border: '1px solid #ddd',
                  borderRadius: '10px',
                  fontSize: '16px',
                  outline: 'none',
                }}
              />
              {passwordConfirm && password !== passwordConfirm && (
                <p style={{ marginTop: '6px', fontSize: '12px', color: '#ef4444' }}>
                  비밀번호가 일치하지 않습니다.
                </p>
              )}
            </div>

            {/* 약관 동의 */}
            <div
              style={{
                padding: '14px',
                background: '#f8f9fa',
                borderRadius: '10px',
                marginBottom: '24px',
              }}
            >
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer' }}>
                <input type="checkbox" defaultChecked style={{ marginTop: '2px' }} />
                <span style={{ fontSize: '13px', color: '#666' }}>
                  <Link href="/terms" style={{ color: '#0f62fe', textDecoration: 'underline' }}>이용약관</Link> 및{' '}
                  <Link href="/privacy" style={{ color: '#0f62fe', textDecoration: 'underline' }}>개인정보처리방침</Link>에 동의합니다.
                </span>
              </label>
            </div>

            <button
              onClick={handleSignup}
              disabled={isLoading || !name || password.length < 6 || password !== passwordConfirm}
              style={{
                width: '100%',
                padding: '16px',
                background: name && password.length >= 6 && password === passwordConfirm ? '#0f62fe' : '#ccc',
                color: '#fff',
                border: 'none',
                borderRadius: '10px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: name && password.length >= 6 && password === passwordConfirm ? 'pointer' : 'not-allowed',
              }}
            >
              {isLoading ? '가입 중...' : '가입 완료'}
            </button>
          </>
        );

      case 'complete':
        return (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <div style={{ fontSize: '60px', marginBottom: '16px' }}>🎉</div>
            <h2 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '8px' }}>
              가입 완료!
            </h2>
            <p style={{ fontSize: '14px', color: '#666', marginBottom: '32px' }}>
              Groover의 회원이 되신 것을 환영합니다.
              <br />
              지금 바로 쇼핑 리뷰를 시작해보세요!
            </p>

            <button
              onClick={() => router.push('/login')}
              style={{
                width: '100%',
                padding: '16px',
                background: '#0f62fe',
                color: '#fff',
                border: 'none',
                borderRadius: '10px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
              }}
            >
              로그인하기
            </button>
          </div>
        );
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: '#fff',
      }}
    >
      {/* 헤더 */}
      <header
        style={{
          padding: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}
      >
        {step !== 'complete' && (
          <button
            onClick={() => {
              if (step === 'phone') router.push('/login');
              else if (step === 'verify') setStep('phone');
              else if (step === 'info') setStep('verify');
            }}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '20px',
              cursor: 'pointer',
            }}
          >
            ←
          </button>
        )}
        <span style={{ fontSize: '16px', fontWeight: '600' }}>회원가입</span>
      </header>

      {/* 진행률 */}
      {step !== 'complete' && (
        <div style={{ padding: '0 24px', marginBottom: '24px' }}>
          <div
            style={{
              height: '4px',
              background: '#eee',
              borderRadius: '2px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                background: '#0f62fe',
                borderRadius: '2px',
                transition: 'width 0.3s',
                width: step === 'phone' ? '33%' : step === 'verify' ? '66%' : '100%',
              }}
            />
          </div>
        </div>
      )}

      {/* 콘텐츠 */}
      <div style={{ flex: 1, padding: '0 24px' }}>
        {error && (
          <div
            style={{
              padding: '12px',
              background: '#fee2e2',
              color: '#ef4444',
              borderRadius: '8px',
              fontSize: '13px',
              marginBottom: '16px',
            }}
          >
            {error}
          </div>
        )}

        {renderStep()}
      </div>

      {/* 하단 로그인 링크 */}
      {step === 'phone' && (
        <div style={{ padding: '24px', textAlign: 'center' }}>
          <span style={{ fontSize: '14px', color: '#666' }}>
            이미 계정이 있으신가요?{' '}
          </span>
          <Link
            href="/login"
            style={{
              fontSize: '14px',
              color: '#0f62fe',
              fontWeight: '600',
              textDecoration: 'none',
            }}
          >
            로그인
          </Link>
        </div>
      )}
    </div>
  );
}
