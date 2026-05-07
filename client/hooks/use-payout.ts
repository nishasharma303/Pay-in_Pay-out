import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────
export type PayoutMode = 'IMPS' | 'NEFT' | 'UPI';

export interface PayoutPayload {
  amount: number;
  mode: PayoutMode;
  beneficiaryName: string;
  accountNumber?: string;
  ifscCode?: string;
  bankName?: string;
  upiId?: string;
  remarks?: string;
}

export interface CommissionRule {
  id: string;
  role: string;
  serviceType: string;
  isPercentage: boolean;
  value: number;
  isActive: boolean;
}

// ─── Pay-Out hooks ────────────────────────────────────────────────────────────
export const useInitiatePayout = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: PayoutPayload) => {
      const { data } = await api.post('/pay-out/initiate', payload);
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['wallet'] });
      qc.invalidateQueries({ queryKey: ['payout'] });
      qc.invalidateQueries({ queryKey: ['ledger'] });
    },
  });
};

export const useVerifyUpi = () =>
  useMutation({
    mutationFn: async (upiId: string) => {
      const { data } = await api.post('/pay-out/verify-upi', { upiId });
      return data.data as { valid: boolean; name: string | null; upiId: string };
    },
  });

export const usePayOutHistory = (page = 1) =>
  useQuery({
    queryKey: ['payout', 'history', page],
    queryFn: async () => {
      const { data } = await api.get('/pay-out/history', { params: { page, limit: 15 } });
      return data;
    },
  });

export const useRetryPayout = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post(`/pay-out/${id}/retry`);
      return data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['payout'] }),
  });
};

// ─── Commission hooks ─────────────────────────────────────────────────────────
export const useMyCommissions = (page = 1) =>
  useQuery({
    queryKey: ['commissions', 'my', page],
    queryFn: async () => {
      const { data } = await api.get('/commissions/my', { params: { page, limit: 20 } });
      return data;
    },
  });

export const useCommissionRules = () =>
  useQuery<CommissionRule[]>({
    queryKey: ['commissions', 'rules'],
    queryFn: async () => {
      const { data } = await api.get('/commissions/rules');
      return data.data;
    },
  });

export const useCommissionReport = () =>
  useQuery({
    queryKey: ['commissions', 'report'],
    queryFn: async () => {
      const { data } = await api.get('/commissions/report');
      return data.data;
    },
  });

export const useUpsertRule = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Omit<CommissionRule, 'id'>) => {
      const { data } = await api.post('/commissions/rules', payload);
      return data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['commissions', 'rules'] }),
  });
};

export const useToggleRule = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.patch(`/commissions/rules/${id}/toggle`);
      return data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['commissions', 'rules'] }),
  });
};
