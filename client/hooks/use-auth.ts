import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { useRouter } from 'next/navigation';

interface LoginPayload    { email: string; password: string; }
interface RegisterPayload { name: string; email: string; phone: string; password: string; }

export const useLogin = () => {
  const { setAuth } = useAuthStore();
  const router = useRouter();
  return useMutation({
    mutationFn: async (payload: LoginPayload) => {
      const { data } = await api.post('/auth/login', payload);
      return data.data as { user: any; accessToken: string; refreshToken?: string };
    },
    onSuccess: (data) => {
      if (data.refreshToken && typeof window !== 'undefined') {
        localStorage.setItem('pf_refresh', data.refreshToken);
      }
      setAuth(data.user, data.accessToken);
      router.push('/dashboard/overview');
    },
  });
};

export const useRegister = () => {
  const { setAuth } = useAuthStore();
  const router = useRouter();
  return useMutation({
    mutationFn: async (payload: RegisterPayload) => {
      const { data } = await api.post('/auth/register', payload);
      return { result: data.data, credentials: { email: payload.email, password: payload.password } };
    },
    onSuccess: async ({ credentials }) => {
      // Clear stale tokens
      if (typeof window !== 'undefined') {
        localStorage.removeItem('pf_refresh');
        localStorage.removeItem('payflow-auth');
      }
      // Auto-login immediately after registration
      try {
        const { data } = await api.post('/auth/login', credentials);
        const loginData = data.data;
        if (loginData.refreshToken && typeof window !== 'undefined') {
          localStorage.setItem('pf_refresh', loginData.refreshToken);
        }
        setAuth(loginData.user, loginData.accessToken);
        router.push('/dashboard/overview');
      } catch {
        router.push('/auth/login?registered=true');
      }
    },
  });
};

export const useLogout = () => {
  const { logout } = useAuthStore();
  const router = useRouter();
  const queryClient = useQueryClient();
  const clearAll = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('pf_refresh');
      localStorage.removeItem('payflow-auth');
    }
    logout();
    queryClient.clear();
    router.push('/auth/login');
  };
  return useMutation({
    mutationFn: async () => api.post('/auth/logout').catch(() => {}),
    onSuccess: clearAll,
    onError:   clearAll,
  });
};

export const useMe = () => {
  const { isAuthenticated, setUser } = useAuthStore();
  return useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const { data } = await api.get('/auth/me');
      setUser(data.data);
      return data.data;
    },
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
};

export const useWallet = () => {
  const { isAuthenticated } = useAuthStore();
  return useQuery({
    queryKey: ['wallet'],
    queryFn: async () => {
      const { data } = await api.get('/wallet/balance');
      return data.data as { primaryBalance: number; secondaryBalance: number; holdBalance: number; totalBalance: number };
    },
    enabled: isAuthenticated,
    refetchInterval: 30000,
    retry: 1,
  });
};

export const useLedger = (params?: { page?: number; limit?: number; type?: string }) => {
  const { isAuthenticated } = useAuthStore();
  return useQuery({
    queryKey: ['ledger', params],
    queryFn: async () => {
      const { data } = await api.get('/wallet/ledger', { params });
      return data;
    },
    enabled: isAuthenticated,
    retry: 1,
  });
};