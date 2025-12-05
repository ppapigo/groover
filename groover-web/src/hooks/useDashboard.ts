// src/hooks/useDashboard.ts

'use client';

import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '@/lib/api';

export function useCreatorStats() {
  return useQuery({
    queryKey: ['dashboard', 'creator'],
    queryFn: () => dashboardApi.getCreatorStats(),
    staleTime: 1000 * 60 * 5,
  });
}

export function useAdvertiserStats() {
  return useQuery({
    queryKey: ['dashboard', 'advertiser'],
    queryFn: () => dashboardApi.getAdvertiserStats(),
    staleTime: 1000 * 60 * 5,
  });
}

export function useStatsRange(days: number = 7) {
  return useQuery({
    queryKey: ['dashboard', 'stats', days],
    queryFn: () => dashboardApi.getStatsRange(days),
    staleTime: 1000 * 60 * 5,
  });
}

export function useEarningsRange(days: number = 7) {
  return useQuery({
    queryKey: ['dashboard', 'earnings', days],
    queryFn: () => dashboardApi.getEarningsRange(days),
    staleTime: 1000 * 60 * 5,
  });
}

export function useRecentActivity(limit: number = 10) {
  return useQuery({
    queryKey: ['dashboard', 'activity', limit],
    queryFn: () => dashboardApi.getRecentActivity(limit),
    staleTime: 1000 * 60 * 2,
  });
}
