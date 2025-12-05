// src/lib/escrow-api.ts

import { api } from './api';

export type DealStatus = 
  | 'PROPOSED' | 'ACCEPTED' | 'REJECTED' | 'PAID' 
  | 'SUBMITTED' | 'CONFIRMED' | 'SETTLED' | 'CANCELLED' | 'REFUNDED';

export interface AdDeal {
  id: string;
  title: string;
  description: string;
  requirements?: string;
  status: DealStatus;
  totalAmount: number;
  platformFee: number;
  creatorAmount: number;
  advertiserId: string;
  advertiser: { id: string; name: string; email: string };
  creatorId: string;
  creator: { id: string; name: string; email: string };
  submittedUrl?: string;
  submittedNote?: string;
  submittedAt?: string;
  submitDeadline?: string;
  confirmDeadline?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DealListResponse {
  items: AdDeal[];
  total: number;
  page: number;
  totalPages: number;
}

export const escrowApi = {
  getMyDeals: (role: 'creator' | 'advertiser', status?: string, page: number = 1) =>
    api.get<DealListResponse>(`/escrow/deals?role=${role}${status ? `&status=${status}` : ''}&page=${page}`),
  getDeal: (dealId: string) => api.get<AdDeal>(`/escrow/deals/${dealId}`),
  createProposal: (dto: any) => api.post<AdDeal>('/escrow/propose', dto),
  acceptProposal: (dealId: string) => api.post<AdDeal>(`/escrow/deals/${dealId}/accept`),
  rejectProposal: (dealId: string) => api.post<AdDeal>(`/escrow/deals/${dealId}/reject`),
  payDeal: (dealId: string, paymentId: string) => api.post<AdDeal>(`/escrow/deals/${dealId}/pay`, { paymentId }),
  submitContent: (dealId: string, dto: { url: string; note?: string }) => api.post<AdDeal>(`/escrow/deals/${dealId}/submit`, dto),
  confirmContent: (dealId: string) => api.post<AdDeal>(`/escrow/deals/${dealId}/confirm`),
  rejectContent: (dealId: string, dto: { reason: string }) => api.post<AdDeal>(`/escrow/deals/${dealId}/reject-content`, dto),
};
