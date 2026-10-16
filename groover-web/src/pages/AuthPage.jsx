import { useState } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import ErrorNotice from '@/components/ErrorNotice';

function destination(value) {
  return value && /^\/(?!\/)/.test(value) && !/[\\\r\n]/.test(value) && !/^\/(login|signup)([/?#]|$)/.test(value) ? value : '/profile';
}

export default function AuthPage({ signup = false }) {
  const { user, isLoading, login, register } = useAuth();
  const [params] = useSearchParams();
  const redirect = destination(params.get('redirect'));
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    const values = Object.fromEntries(new FormData(event.currentTarget));
    setBusy(true);
    setError(null);
    try {
      if (signup) await register({ userId: values.userId.trim(), email: values.email.trim(), name: values.name.trim(), password: values.password });
      else {
        const identifier = values.identifier.trim();
        await login({ [identifier.includes('@') ? 'email' : 'userId']: identifier, password: values.password });
      }
    } catch (err) { setError(err); }
    finally { setBusy(false); }
  }

  if (isLoading) return <div className="full-loading" role="status">로그인 정보를 확인하는 중…</div>;
  if (user) return <Navigate replace to={redirect} />;
  return <div className="form-page auth-page">
    <span className="section-label">WELCOME TO GROOVER</span><h1>{signup ? '경험을 함께 나눠요.' : '다시 만나 반가워요.'}</h1>
    <p className="muted">{signup ? '계정을 만들고 나만의 리뷰를 기록해보세요.' : '로그인하고 리뷰와 댓글을 남겨보세요.'}</p>
    <form onSubmit={submit} className="stack-form">
      {signup ? <>
        <label>아이디<input name="userId" required minLength={4} maxLength={30} pattern="[a-zA-Z0-9_]{4,30}" title="영문, 숫자, 밑줄로 4~30자" autoComplete="username" /></label>
        <label>이메일<input name="email" type="email" required autoComplete="email" /></label>
        <label>이름<input name="name" required maxLength={50} autoComplete="name" /></label>
      </> : <label>이메일 또는 아이디<input name="identifier" required autoComplete="username" /></label>}
      <label>비밀번호<input name="password" type="password" required minLength={signup ? 8 : undefined} maxLength={72} autoComplete={signup ? 'new-password' : 'current-password'} /></label>
      {signup && <p className="muted">비밀번호는 8~72자로 입력해주세요.</p>}
      <ErrorNotice error={error} />
      <button className="primary-cta" disabled={busy}>{busy ? '처리 중…' : signup ? '회원가입' : '로그인'}</button>
    </form>
    <p className="auth-switch">{signup ? '이미 계정이 있나요?' : '처음 오셨나요?'} <Link to={`${signup ? '/login' : '/signup'}?redirect=${encodeURIComponent(redirect)}`}>{signup ? '로그인' : '회원가입'}</Link></p>
  </div>;
}
