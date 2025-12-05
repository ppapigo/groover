// src/hooks/useEscrow.ts

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { escrowApi } from '@/lib/escrow-api';

export function useMyDeals(role: 'creator' | 'advertiser', status?: string, page: number = 1) {
  return useQuery({
    queryKey: ['deals', role, status, page],
    queryFn: () => escrowApi.getMyDeals(role, status, page),
    staleTime: 1000 * 60 * 2,
  });
}

export function useDeal(dealId: string) {
  return useQuery({
    queryKey: ['deal', dealId],
    queryFn: () => escrowApi.getDeal(dealId),
    enabled: !!dealId,
  });
}

export function useAcceptProposal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dealId: string) => escrowApi.acceptProposal(dealId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['deals'] }),
  });
}

export function useRejectProposal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dealId: string) => escrowApi.rejectProposal(dealId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['deals'] }),
  });
}

export function usePayDeal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ dealId, paymentId }: { dealId: string; paymentId: string }) =>
      escrowApi.payDeal(dealId, paymentId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['deals'] }),
  });
}

export function useSubmitContent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ dealId, dto }: { dealId: string; dto: { url: string; note?: string } }) =>
      escrowApi.submitContent(dealId, dto),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['deals'] }),
  });
}

export function useConfirmContent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dealId: string) => escrowApi.confirmContent(dealId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['deals'] }),
  });
}

export function useRejectContent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ dealId, dto }: { dealId: string; dto: { reason: string } }) =>
      escrowApi.rejectContent(dealId, dto),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['deals'] }),
  });
}
