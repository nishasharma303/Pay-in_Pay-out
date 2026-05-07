import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────
export interface PayInOrder {
  transaction: { id: string; amount: number; status: string };
  order: { id: string; amount: number; currency: string; keyId: string };
}

export interface WalletAnalytics {
  daily: Array<{ date: string; credit: number; debit: number }>;
  totalCredit: number;
  totalDebit: number;
  days: number;
}

// ─── Wallet hooks ─────────────────────────────────────────────────────────────
export const useWalletAnalytics = (days = 30) =>
  useQuery<WalletAnalytics>({
    queryKey: ['wallet', 'analytics', days],
    queryFn: async () => {
      const { data } = await api.get('/wallet/analytics', { params: { days } });
      return data.data;
    },
  });

export const useAdminTopUp = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { userId: string; amount: number; note?: string }) => {
      const { data } = await api.post('/wallet/admin-topup', payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['wallet'] });
      qc.invalidateQueries({ queryKey: ['users'] });
    },
  });
};

// ─── Pay-In hooks ─────────────────────────────────────────────────────────────
export const useCreatePayInOrder = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { amount: number; description?: string }) => {
      const { data } = await api.post('/pay-in/order', payload);
      return data.data as PayInOrder;
    },
  });
};

export const useConfirmPayment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { orderId: string; paymentId: string; signature: string }) => {
      const { data } = await api.post('/pay-in/confirm', payload);
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['wallet'] });
      qc.invalidateQueries({ queryKey: ['ledger'] });
      qc.invalidateQueries({ queryKey: ['payin'] });
    },
  });
};

export const usePayInHistory = (page = 1) =>
  useQuery({
    queryKey: ['payin', 'history', page],
    queryFn: async () => {
      const { data } = await api.get('/pay-in/history', { params: { page, limit: 15 } });
      return data;
    },
  });
