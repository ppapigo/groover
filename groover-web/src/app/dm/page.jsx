// src/app/dm/page.tsx
'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AppHeader from '@/components/layout/AppHeader';
import { AuthGuard } from '@/components/auth/AuthGuard';
import DmMenu from '@/components/dm/DmMenu';
import ReportModal from '@/components/dm/ReportModal';
import { Plus, Search, X } from 'lucide-react';
import api from '@/lib/api';
function ThreadCard({ thread, onMenuOpen }) {
    const formatTime = (dateString) => {
        if (!dateString)
            return '';
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        if (diffDays === 0) {
            return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
        }
        else if (diffDays === 1) {
            return '어제';
        }
        else if (diffDays < 7) {
            return `${diffDays}일 전`;
        }
        else {
            return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
        }
    };
    return (<div className={`
        flex items-center gap-3 p-4 bg-white rounded-card transition-all
        ${thread.isBlocked ? 'opacity-60' : 'active:bg-card-soft'}
      `}>
      <Link href={thread.isBlocked ? '#' : `/messages/${thread.id}`} className="flex items-center gap-3 flex-1 min-w-0">
        <div className="relative w-14 h-14 rounded-full flex-shrink-0 flex items-center justify-center text-2xl bg-card-soft overflow-hidden">
          {thread.partner.profileImageUrl ? (<img src={thread.partner.profileImageUrl} alt={thread.partner.name} className="w-full h-full object-cover"/>) : ('👤')}
          
          {thread.unreadCount > 0 && (<span className="absolute -top-0.5 -right-0.5 min-w-[22px] h-[22px] px-1.5 bg-error text-white text-xs font-bold rounded-full flex items-center justify-center">
              {thread.unreadCount > 99 ? '99+' : thread.unreadCount}
            </span>)}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-text-primary truncate">
              {thread.partner.name}
            </span>
            {thread.isBlocked && (<span className="flex-shrink-0 px-2 py-0.5 text-[10px] font-medium text-text-tertiary bg-card-soft rounded">
                차단됨
              </span>)}
            <span className="flex-shrink-0 text-xs text-text-tertiary ml-auto">
              {formatTime(thread.lastMessageAt)}
            </span>
          </div>
          <p className={`
            text-sm truncate
            ${thread.unreadCount > 0 ? 'text-text-primary font-medium' : 'text-text-secondary'}
          `}>
            {thread.lastMessage}
          </p>
        </div>
      </Link>

      <button onClick={(e) => onMenuOpen(thread, e)} className="flex-shrink-0 w-10 h-10 flex items-center justify-center text-text-tertiary hover:bg-card-soft rounded-full transition-colors">
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <circle cx="12" cy="6" r="2"/>
          <circle cx="12" cy="12" r="2"/>
          <circle cx="12" cy="18" r="2"/>
        </svg>
      </button>
    </div>);
}
export default function DmPage() {
    const router = useRouter();
    const [threads, setThreads] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showMenu, setShowMenu] = useState(false);
    const [showReport, setShowReport] = useState(false);
    const [selectedThread, setSelectedThread] = useState(null);
    const [showNewChat, setShowNewChat] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    useEffect(() => {
        fetchThreads();
    }, []);
    const fetchThreads = async () => {
        try {
            const res = await api.get('/dm/threads');
            setThreads(res.data.data?.items || []);
        }
        catch (error) {
            console.error('Failed to fetch threads:', error);
        }
        finally {
            setIsLoading(false);
        }
    };
    const handleSearch = async (query) => {
        setSearchQuery(query);
        if (!query.trim()) {
            setSearchResults([]);
            return;
        }
        setIsSearching(true);
        try {
            const res = await api.get(`/users/search?q=${encodeURIComponent(query)}`);
            setSearchResults(res.data.data || res.data || []);
        }
        catch (error) {
            console.error('Failed to search users:', error);
        }
        finally {
            setIsSearching(false);
        }
    };
    const handleStartChat = async (targetUserId) => {
        try {
            const res = await api.post('/dm/start', { targetUserId });
            const threadId = res.data.data?.id || res.data.id;
            setShowNewChat(false);
            setSearchQuery('');
            setSearchResults([]);
            router.push(`/messages/${threadId}`);
        }
        catch (error) {
            console.error('Failed to start chat:', error);
            alert('대화를 시작할 수 없습니다.');
        }
    };
    const handleMenuOpen = (thread, e) => {
        e.preventDefault();
        e.stopPropagation();
        setSelectedThread(thread);
        setShowMenu(true);
    };
    const handleBlock = async () => {
        if (!selectedThread)
            return;
        try {
            await api.post('/dm/block', { targetUserId: selectedThread.partner.id });
            setThreads(threads.map(t => t.id === selectedThread.id ? { ...t, isBlocked: true } : t));
            setShowMenu(false);
            alert(`${selectedThread.partner.name}님을 차단했습니다.`);
        }
        catch (error) {
            console.error('Failed to block user:', error);
        }
    };
    const handleUnblock = async () => {
        if (!selectedThread)
            return;
        try {
            await api.post('/dm/unblock', { targetUserId: selectedThread.partner.id });
            setThreads(threads.map(t => t.id === selectedThread.id ? { ...t, isBlocked: false } : t));
            setShowMenu(false);
            alert(`${selectedThread.partner.name}님의 차단을 해제했습니다.`);
        }
        catch (error) {
            console.error('Failed to unblock user:', error);
        }
    };
    const handleReport = async (type, description) => {
        if (!selectedThread)
            return;
        try {
            await api.post('/dm/report', {
                targetUserId: selectedThread.partner.id,
                type,
                description,
            });
            setShowReport(false);
            setShowMenu(false);
            alert('신고가 접수되었습니다.');
        }
        catch (error) {
            console.error('Failed to report:', error);
        }
    };
    const totalUnread = threads.reduce((sum, t) => sum + t.unreadCount, 0);
    return (<AuthGuard>
      <div className="min-h-screen bg-background">
        <AppHeader />
        
        {isLoading ? (<div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>) : (<>
            <div className="bg-white border-b border-border">
              <div className="px-5 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h1 className="text-xl font-bold text-text-primary">메시지</h1>
                    {totalUnread > 0 && (<span className="badge-error">{totalUnread}</span>)}
                  </div>
                  
                  <button onClick={() => setShowNewChat(true)} className="w-10 h-10 flex items-center justify-center text-white bg-primary hover:bg-primary-dark rounded-full transition-colors">
                    <Plus size={24}/>
                  </button>
                </div>
              </div>
            </div>

            <div className="px-4 py-3 space-y-2 pb-24">
              {threads.length > 0 ? (threads.map((thread, index) => (<div key={thread.id} className="animate-slide-up" style={{ animationDelay: `${index * 0.05}s` }}>
                    <ThreadCard thread={thread} onMenuOpen={handleMenuOpen}/>
                  </div>))) : (<div className="flex flex-col items-center justify-center py-20">
                  <div className="text-6xl mb-4">💬</div>
                  <p className="text-text-secondary mb-4">아직 메시지가 없습니다</p>
                  <button onClick={() => setShowNewChat(true)} className="px-6 py-3 bg-primary text-white rounded-full font-medium">
                    새 대화 시작하기
                  </button>
                </div>)}
            </div>
          </>)}

        {/* 새 대화 시작 모달 */}
        {showNewChat && (<div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
            <div className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl max-h-[80vh] flex flex-col">
              <div className="flex items-center justify-between p-4 border-b">
                <h2 className="text-lg font-bold">새 대화</h2>
                <button onClick={() => {
                setShowNewChat(false);
                setSearchQuery('');
                setSearchResults([]);
            }} className="p-2">
                  <X size={24}/>
                </button>
              </div>
              
              <div className="p-4">
                <div className="relative">
                  <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-tertiary"/>
                  <input type="text" value={searchQuery} onChange={(e) => handleSearch(e.target.value)} placeholder="이름으로 검색..." className="w-full pl-12 pr-4 py-3 bg-card-soft rounded-full text-[15px] outline-none focus:ring-2 focus:ring-primary" autoFocus/>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-4 pb-4">
                {isSearching ? (<div className="text-center py-8 text-text-secondary">검색 중...</div>) : searchResults.length > 0 ? (<div className="space-y-2">
                    {searchResults.map((user) => (<button key={user.id} onClick={() => handleStartChat(user.id)} className="w-full flex items-center gap-3 p-3 hover:bg-card-soft rounded-xl transition-colors">
                        <div className="w-12 h-12 rounded-full bg-card-soft flex items-center justify-center text-xl overflow-hidden">
                          {user.profileImageUrl ? (<img src={user.profileImageUrl} alt={user.name} className="w-full h-full object-cover"/>) : ('👤')}
                        </div>
                        <span className="font-medium">{user.name}</span>
                      </button>))}
                  </div>) : searchQuery ? (<div className="text-center py-8 text-text-secondary">검색 결과가 없습니다</div>) : (<div className="text-center py-8 text-text-secondary">사용자 이름을 검색하세요</div>)}
              </div>
            </div>
          </div>)}

        {showMenu && selectedThread && (<DmMenu isBlocked={selectedThread.isBlocked || false} onBlock={handleBlock} onUnblock={handleUnblock} onReport={() => {
                setShowMenu(false);
                setShowReport(true);
            }} onClose={() => setShowMenu(false)}/>)}

        <ReportModal isOpen={showReport} onClose={() => setShowReport(false)} targetUser={selectedThread?.partner.name || ''} onSubmit={handleReport}/>
      </div>
    </AuthGuard>);
}
