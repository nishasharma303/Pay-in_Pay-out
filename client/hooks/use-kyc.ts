import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────
export type KycStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface KycDetail {
  id: string;
  userId: string;
  panNumber?: string;
  aadhaarNumber?: string;
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
  accountHolder?: string;
  panImageUrl?: string;
  aadhaarFrontUrl?: string;
  aadhaarBackUrl?: string;
  selfieUrl?: string;
  status: KycStatus;
  reviewNote?: string;
  reviewedAt?: string;
  createdAt: string;
  user?: { id: string; name: string; email: string; phone: string; role: string };
}

export interface KycStats {
  pending: number;
  approved: number;
  rejected: number;
  total: number;
}

// ─── Agent hooks ──────────────────────────────────────────────────────────────
export const useMyKyc = () =>
  useQuery<KycDetail | null>({
    queryKey: ['kyc', 'me'],
    queryFn: async () => {
      const { data } = await api.get('/kyc/me');
      return data.data;
    },
  });

export const useSubmitKyc = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (formData: FormData) => {
      const { data } = await api.post('/kyc/submit', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data.data as KycDetail;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['kyc', 'me'] });
      qc.invalidateQueries({ queryKey: ['me'] });
    },
  });
};

// ─── Admin hooks ──────────────────────────────────────────────────────────────
export const useKycStats = () =>
  useQuery<KycStats>({
    queryKey: ['kyc', 'stats'],
    queryFn: async () => {
      const { data } = await api.get('/kyc/stats');
      return data.data;
    },
  });

export const useKycList = (params?: { status?: string; page?: number; limit?: number }) =>
  useQuery({
    queryKey: ['kyc', 'list', params],
    queryFn: async () => {
      const { data } = await api.get('/kyc', { params });
      return data;
    },
  });

export const useKycDetail = (id: string) =>
  useQuery<KycDetail>({
    queryKey: ['kyc', id],
    queryFn: async () => {
      const { data } = await api.get(`/kyc/${id}`);
      return data.data;
    },
    enabled: !!id,
  });

export const useReviewKyc = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      status,
      reviewNote,
    }: {
      id: string;
      status: 'APPROVED' | 'REJECTED';
      reviewNote?: string;
    }) => {
      const { data } = await api.patch(`/kyc/${id}/review`, { status, reviewNote });
      return data.data as KycDetail;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['kyc'] });
      qc.invalidateQueries({ queryKey: ['users'] });
      qc.invalidateQueries({ queryKey: ['me'] });
    },
  });
};
