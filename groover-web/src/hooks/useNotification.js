// src/hooks/useNotification.ts
'use client';
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { notificationApi } from '@/lib/notification-api';
export function useNotifications() {
    return useInfiniteQuery({
        queryKey: ['notifications'],
        queryFn: ({ pageParam }) => notificationApi.getNotifications(pageParam),
        getNextPageParam: (lastPage) => lastPage.data?.hasMore ? lastPage.data?.nextCursor : undefined,
        initialPageParam: undefined,
    });
}
export function useUnreadCount() {
    return useQuery({
        queryKey: ['notifications', 'unread'],
        queryFn: () => notificationApi.getUnreadCount(),
        refetchInterval: 30000,
    });
}
export function useMarkAsRead() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (notificationId) => notificationApi.markAsRead(notificationId),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
    });
}
