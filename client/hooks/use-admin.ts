import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth.store';
import { api } from '@/lib/api';

export const useAdminStats = () => {
  const { user } = useAuthStore();
  const isAdmin = ['SUPER_ADMIN', 'ADMIN'].includes(user?.role || '');
  return useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: async () => { const { data } = await api.get('/admin/stats'); return data.data; },
    enabled: isAdmin,
    refetchInterval: 60000,
  });
};

export const useAuditLogs = (page = 1, action?: string) =>
  useQuery({
    queryKey: ['admin', 'audit', page, action],
    queryFn: async () => {
      const { data } = await api.get('/admin/audit-logs', { params: { page, limit: 30, action } });
      return data;
    },
  });

export const useTxReport = (from?: string, to?: string) =>
  useQuery({
    queryKey: ['admin', 'report', from, to],
    queryFn: async () => {
      const { data } = await api.get('/admin/reports/transactions', { params: { from, to } });
      return data.data;
    },
  });

export const useSystemHealth = () =>
  useQuery({
    queryKey: ['admin', 'health'],
    queryFn: async () => { const { data } = await api.get('/admin/health'); return data.data; },
    refetchInterval: 30000,
  });

export const useSuperStats = () => {
  const { user } = useAuthStore();
  return useQuery({
    queryKey: ['admin', 'super', 'stats'],
    queryFn: async () => { const { data } = await api.get('/admin/super/stats'); return data.data; },
    enabled: user?.role === 'SUPER_ADMIN',
  });
};

export const useMasterWallet = () => {
  const { user } = useAuthStore();
  return useQuery({
    queryKey: ['admin', 'super', 'master-wallet'],
    queryFn: async () => { const { data } = await api.get('/admin/super/master-wallet'); return data.data; },
    enabled: user?.role === 'SUPER_ADMIN',
  });
};

export const useFeatureFlags = () => {
  const { user } = useAuthStore();
  return useQuery({
    queryKey: ['admin', 'super', 'flags'],
    queryFn: async () => { const { data } = await api.get('/admin/super/flags'); return data.data; },
    enabled: user?.role === 'SUPER_ADMIN',
  });
};
