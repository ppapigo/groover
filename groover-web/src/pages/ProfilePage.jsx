import { Link, useNavigate } from 'react-router-dom';
import { FileText, LogOut, PenLine } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useState } from 'react';
import ErrorNotice from '@/components/ErrorNotice';

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState(null);
  const [pending, setPending] = useState(false);
  async function signOut() {
    setPending(true); setError(null);
    try { await logout(); navigate('/', { replace: true }); }
    catch (failure) { setError(failure); }
    finally { setPending(false); }
  }
  return <div className="form-page">
    <span className="section-label">MY GROOVER</span><h1>{user.name}님의 기록</h1><p className="muted">@{user.userId} · {user.email}</p>
    <div className="profile-links">
      <Link to="/profile/posts"><FileText size={20} /> 내 리뷰</Link>
      <Link to="/profile/drafts"><FileText size={20} /> 임시저장</Link>
      <Link to="/write"><PenLine size={20} /> 새 리뷰 작성</Link>
    </div>
    <ErrorNotice error={error} />
    <button className="secondary-cta" disabled={pending} onClick={signOut}><LogOut size={18} /> 로그아웃</button>
  </div>;
}
