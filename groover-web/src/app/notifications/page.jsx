// src/app/notifications/page.tsx
'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useNotifications, useUnreadCount, useMarkAsRead } from '@/hooks/useNotification';
import { formatRelativeTime } from '@/lib/utils';
import { notificationConfig } from '@/lib/notification-api';
export default function NotificationsPage() {
    const router = useRouter();
    const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useNotifications();
    const { data: unreadData } = useUnreadCount();
    const markAsRead = useMarkAsRead();
    const notifications = data?.pages.flatMap(page => page.data?.items) || [];
    const unreadCount = unreadData?.data?.count || 0;
    const handleNotificationClick = (notification) => {
        if (!notification.isRead) {
            markAsRead.mutate(notification.id);
        }
        if (notification.targetType === 'deal' && notification.targetId) {
            router.push(`/deals/${notification.targetId}`);
        }
    };
    return (<div className="min-h-screen bg-gray-50 pb-20">
      {/* 헤더 */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-bold text-lg">알림</h1>
              {unreadCount > 0 && (<p className="text-sm text-gray-500">{unreadCount}개의 새 알림</p>)}
            </div>
            {unreadCount > 0 && (<button onClick={() => markAsRead.mutate(undefined)} disabled={markAsRead.isPending} className="text-sm text-blue-600 disabled:opacity-50">
                모두 읽음
              </button>)}
          </div>
        </div>
      </header>

      {/* 콘텐츠 */}
      <main className="max-w-2xl mx-auto">
        {isLoading && (<div className="p-4 space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (<div key={i} className="bg-white rounded-xl p-4 animate-pulse">
                <div className="flex gap-3">
                  <div className="w-10 h-10 bg-gray-200 rounded-full"/>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"/>
                    <div className="h-3 bg-gray-200 rounded w-full"/>
                  </div>
                </div>
              </div>))}
          </div>)}

        {!isLoading && notifications.length === 0 && (<div className="text-center py-12">
            <p className="text-4xl mb-3">🔔</p>
            <p className="text-gray-500">알림이 없습니다</p>
          </div>)}

        {!isLoading && notifications.length > 0 && (<div className="divide-y divide-gray-100">
            {notifications.map((notification) => {
                const config = notificationConfig[notification.type] || {
                    icon: '📌',
                    bgColor: 'bg-gray-100',
                };
                return (<div key={notification.id} onClick={() => handleNotificationClick(notification)} className={`px-4 py-3 cursor-pointer transition-colors ${notification.isRead ? 'bg-white' : 'bg-blue-50'} hover:bg-gray-50`}>
                  <div className="flex gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${config.bgColor}`}>
                      <span className="text-lg">{config.icon}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`font-medium ${notification.isRead ? 'text-gray-900' : 'text-gray-900'}`}>
                        {notification.title}
                      </p>
                      <p className={`text-sm mt-0.5 ${notification.isRead ? 'text-gray-500' : 'text-gray-600'}`}>
                        {notification.message}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {formatRelativeTime(notification.createdAt)}
                      </p>
                    </div>
                    {!notification.isRead && (<div className="w-2 h-2 bg-blue-600 rounded-full mt-2"/>)}
                  </div>
                </div>);
            })}

            {/* 더보기 */}
            {hasNextPage && (<button onClick={() => fetchNextPage()} disabled={isFetchingNextPage} className="w-full py-4 text-sm text-gray-500 hover:bg-gray-50 disabled:opacity-50">
                {isFetchingNextPage ? '로딩중...' : '더 불러오기'}
              </button>)}
          </div>)}
      </main>

      {/* 하단 네비게이션 */}
      <BottomNav unreadCount={unreadCount}/>
    </div>);
}
function BottomNav({ unreadCount }) {
    return (<nav className="fixed bottom-0 left-0 right-0 bg-white border-t">
      <div className="max-w-2xl mx-auto flex">
        <Link href="/" className="flex-1 py-3 text-center text-gray-400">
          <span className="text-xl">🏠</span>
          <p className="text-xs mt-1">홈</p>
        </Link>
        <Link href="/deals" className="flex-1 py-3 text-center text-gray-400">
          <span className="text-xl">💼</span>
          <p className="text-xs mt-1">거래</p>
        </Link>
        <Link href="/dashboard" className="flex-1 py-3 text-center text-gray-400">
          <span className="text-xl">📊</span>
          <p className="text-xs mt-1">통계</p>
        </Link>
        <Link href="/notifications" className="flex-1 py-3 text-center text-blue-600 relative">
          <span className="text-xl">🔔</span>
          {unreadCount > 0 && (<span className="absolute top-2 right-1/4 w-4 h-4 bg-red-500 rounded-full text-white text-xs flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>)}
          <p className="text-xs mt-1">알림</p>
        </Link>
      </div>
    </nav>);
}
