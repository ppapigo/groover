import { Link } from 'react-router-dom';
import { Search, PenLine, UserRound } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
export default function AppHeader() {
    const pathname = useLocation().pathname;
    const { user } = useAuth();
    return (<header className="site-header">
      <div className="site-header-inner">
        <Link to="/" className="brand"><span className="brand-mark">G</span><span>groover</span></Link>
        <nav className="desktop-nav" aria-label="주요 메뉴">
          <Link className={pathname === '/' ? 'active' : ''} to="/">홈</Link>
          <Link className={pathname.startsWith('/blog') ? 'active' : ''} to="/blog">리뷰 탐색</Link>
          <Link className={pathname.startsWith('/search') ? 'active' : ''} to="/search">검색</Link>
        </nav>
        <div className="header-actions">
          <Link className="icon-button" to="/search" aria-label="검색"><Search size={19}/></Link>
          <Link className="write-button" to="/write"><PenLine size={17}/> 리뷰 쓰기</Link>
          <Link className="profile-button" to={user ? '/profile' : '/login'} aria-label={user ? '프로필' : '로그인'}>
            <UserRound size={19}/><span>{user?.name || '로그인'}</span>
          </Link>
        </div>
      </div>
    </header>);
}
