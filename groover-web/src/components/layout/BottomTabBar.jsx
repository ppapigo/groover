import { Link } from 'react-router-dom';
import { useLocation } from 'react-router-dom';
import { Home, Search, Compass, UserRound } from 'lucide-react';
const tabs = [{ href: '/', icon: Home, label: '홈' }, { href: '/blog', icon: Compass, label: '탐색' }, { href: '/search', icon: Search, label: '검색' }, { href: '/profile', icon: UserRound, label: '내 정보' }];
export default function BottomTabBar() { const path = useLocation().pathname; return <nav className="bottom-nav">{tabs.map(t => { const I = t.icon; const active = t.href === '/' ? path === '/' : path.startsWith(t.href); return <Link key={t.href} to={t.href} className={active ? 'active' : ''}><I size={21}/><span>{t.label}</span></Link>; })}</nav>; }
