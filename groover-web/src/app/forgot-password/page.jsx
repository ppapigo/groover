// src/app/forgot-password/page.tsx
'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
export default function ForgotPasswordPage() {
    const router = useRouter();
    const [step, setStep] = useState('phone');
    const [phone, setPhone] = useState('');
    const [verifyCode, setVerifyCode] = useState('');
    const [password, setPassword] = useState('');
    const [passwordConfirm, setPasswordConfirm] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [timer, setTimer] = useState(0);
    useEffect(() => {
        if (timer > 0) {
            const interval = setInterval(() => setTimer((t) => t - 1), 1000);
            return () => clearInterval(interval);
        }
    }, [timer]);
    const formatPhone = (value) => {
        const numbers = value.replace(/[^0-9]/g, '');
        if (numbers.length <= 3)
            return numbers;
        if (numbers.length <= 7)
            return `${numbers.slice(0, 3)}-${numbers.slice(3)}`;
        return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7, 11)}`;
    };
    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };
    const handleSendCode = async () => {
        if (phone.replace(/-/g, '').length !== 11) {
            setError('올바른 전화번호를 입력해주세요.');
            return;
        }
        setIsLoading(true);
        setError('');
        try {
            // Mock
            console.log('Mock: 인증번호 전송', phone);
            setStep('verify');
            setTimer(180);
        }
        finally {
            setIsLoading(false);
        }
    };
    const handleVerifyCode = async () => {
        if (verifyCode.length !== 6) {
            setError('6자리 인증번호를 입력해주세요.');
            return;
        }
        setIsLoading(true);
        setError('');
        try {
            // Mock: 123456이면 성공
            if (verifyCode === '123456') {
                setStep('reset');
            }
            else {
                setError('인증번호가 일치하지 않습니다. (테스트: 123456)');
            }
        }
        finally {
            setIsLoading(false);
        }
    };
    const handleResetPassword = async () => {
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
            // Mock
            console.log('Mock: 비밀번호 재설정', { phone, password });
            setStep('complete');
        }
        finally {
            setIsLoading(false);
        }
    };
    const renderStep = () => {
        switch (step) {
            case 'phone':
                return (<>
            <h2 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '8px' }}>
              비밀번호 찾기
            </h2>
            <p style={{ fontSize: '14px', color: '#666', marginBottom: '32px' }}>
              가입하신 전화번호를 입력해주세요.
            </p>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '8px' }}>
                전화번호
              </label>
              <input type="tel" value={phone} onChange={(e) => setPhone(formatPhone(e.target.value))} placeholder="010-0000-0000" maxLength={13} style={{
                        width: '100%',
                        padding: '14px 16px',
                        border: '1px solid #ddd',
                        borderRadius: '10px',
                        fontSize: '16px',
                        outline: 'none',
                    }}/>
            </div>

            <button onClick={handleSendCode} disabled={isLoading || phone.replace(/-/g, '').length !== 11} style={{
                        width: '100%',
                        padding: '16px',
                        background: phone.replace(/-/g, '').length === 11 ? '#0f62fe' : '#ccc',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '10px',
                        fontSize: '16px',
                        fontWeight: '600',
                        cursor: phone.replace(/-/g, '').length === 11 ? 'pointer' : 'not-allowed',
                    }}>
              {isLoading ? '전송 중...' : '인증번호 받기'}
            </button>
          </>);
            case 'verify':
                return (<>
            <h2 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '8px' }}>
              인증번호 입력
            </h2>
            <p style={{ fontSize: '14px', color: '#666', marginBottom: '32px' }}>
              {phone}로 전송된 인증번호를 입력해주세요.
            </p>

            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <label style={{ fontSize: '13px', fontWeight: '500' }}>인증번호</label>
                {timer > 0 && <span style={{ fontSize: '13px', color: '#ef4444' }}>{formatTime(timer)}</span>}
              </div>
              <input type="text" value={verifyCode} onChange={(e) => setVerifyCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))} placeholder="6자리 숫자" maxLength={6} style={{
                        width: '100%',
                        padding: '14px 16px',
                        border: '1px solid #ddd',
                        borderRadius: '10px',
                        fontSize: '20px',
                        letterSpacing: '8px',
                        textAlign: 'center',
                        outline: 'none',
                    }}/>
            </div>

            <button onClick={handleVerifyCode} disabled={isLoading || verifyCode.length !== 6} style={{
                        width: '100%',
                        padding: '16px',
                        background: verifyCode.length === 6 ? '#0f62fe' : '#ccc',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '10px',
                        fontSize: '16px',
                        fontWeight: '600',
                        cursor: verifyCode.length === 6 ? 'pointer' : 'not-allowed',
                    }}>
              {isLoading ? '확인 중...' : '확인'}
            </button>

            <p style={{ marginTop: '16px', fontSize: '12px', color: '#999', textAlign: 'center' }}>
              테스트 인증번호: 123456
            </p>
          </>);
            case 'reset':
                return (<>
            <h2 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '8px' }}>
              새 비밀번호 설정
            </h2>
            <p style={{ fontSize: '14px', color: '#666', marginBottom: '32px' }}>
              사용하실 새 비밀번호를 입력해주세요.
            </p>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '8px' }}>
                새 비밀번호
              </label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="6자 이상" style={{
                        width: '100%',
                        padding: '14px 16px',
                        border: '1px solid #ddd',
                        borderRadius: '10px',
                        fontSize: '16px',
                        outline: 'none',
                    }}/>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '8px' }}>
                비밀번호 확인
              </label>
              <input type="password" value={passwordConfirm} onChange={(e) => setPasswordConfirm(e.target.value)} placeholder="비밀번호 재입력" style={{
                        width: '100%',
                        padding: '14px 16px',
                        border: '1px solid #ddd',
                        borderRadius: '10px',
                        fontSize: '16px',
                        outline: 'none',
                    }}/>
            </div>

            <button onClick={handleResetPassword} disabled={isLoading || password.length < 6 || password !== passwordConfirm} style={{
                        width: '100%',
                        padding: '16px',
                        background: password.length >= 6 && password === passwordConfirm ? '#0f62fe' : '#ccc',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '10px',
                        fontSize: '16px',
                        fontWeight: '600',
                        cursor: password.length >= 6 && password === passwordConfirm ? 'pointer' : 'not-allowed',
                    }}>
              {isLoading ? '변경 중...' : '비밀번호 변경'}
            </button>
          </>);
            case 'complete':
                return (<div style={{ textAlign: 'center', padding: '40px 0' }}>
            <div style={{ fontSize: '60px', marginBottom: '16px' }}>✅</div>
            <h2 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '8px' }}>
              비밀번호 변경 완료
            </h2>
            <p style={{ fontSize: '14px', color: '#666', marginBottom: '32px' }}>
              새 비밀번호로 로그인해주세요.
            </p>

            <button onClick={() => router.push('/login')} style={{
                        width: '100%',
                        padding: '16px',
                        background: '#0f62fe',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '10px',
                        fontSize: '16px',
                        fontWeight: '600',
                        cursor: 'pointer',
                    }}>
              로그인하기
            </button>
          </div>);
        }
    };
    return (<div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#fff' }}>
      {/* 헤더 */}
      <header style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        {step !== 'complete' && (<button onClick={() => {
                if (step === 'phone')
                    router.push('/login');
                else if (step === 'verify')
                    setStep('phone');
                else if (step === 'reset')
                    setStep('verify');
            }} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' }}>
            ←
          </button>)}
        <span style={{ fontSize: '16px', fontWeight: '600' }}>비밀번호 찾기</span>
      </header>

      {/* 콘텐츠 */}
      <div style={{ flex: 1, padding: '24px' }}>
        {error && (<div style={{
                padding: '12px',
                background: '#fee2e2',
                color: '#ef4444',
                borderRadius: '8px',
                fontSize: '13px',
                marginBottom: '16px',
            }}>
            {error}
          </div>)}
        {renderStep()}
      </div>
    </div>);
}
