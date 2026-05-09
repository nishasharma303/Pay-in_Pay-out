import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { setCookie, removeCookie } from '@/lib/cookies';

export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'CLIENT' | 'AGENT';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  isActive: boolean;
  isVerified: boolean;
  wallet?: { primaryBalance: number; secondaryBalance: number; holdBalance: number } | null;
  kyc?: { status: string } | null;
}

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  setAuth: (user: AuthUser, accessToken: string, refreshToken?: string) => void;
  setAccessToken: (token: string) => void;
  setUser: (user: AuthUser) => void;
  logout: () => void;
  hydrate: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user:            null,
      accessToken:     null,
      isAuthenticated: false,

      hydrate: () => {
        if (typeof window !== 'undefined') {
          const storedAccess = localStorage.getItem('pf_access');
          const storedUser = localStorage.getItem('payflow-auth');
          if (storedAccess || storedUser) {
            const user = storedUser ? JSON.parse(storedUser).state?.user : null;
            set({
              accessToken: storedAccess || null,
              user: user || null,
              isAuthenticated: !!storedAccess && !!user,
            });
          }
        }
      },

      setAuth: (user, accessToken, refreshToken) => {
        // Store in localStorage (for components)
        if (typeof window !== 'undefined') {
          if (refreshToken) {
            localStorage.setItem('pf_refresh', refreshToken);
            setCookie('pf_refresh', refreshToken, 7); // ← Set cookie for middleware
          }
          if (accessToken) {
            localStorage.setItem('pf_access', accessToken);
            setCookie('pf_access', accessToken, 1); // Access token expires in 1 day
          }
        }
        set({ user, accessToken, isAuthenticated: true });
      },

      setAccessToken: (accessToken) => {
        if (typeof window !== 'undefined' && accessToken) {
          localStorage.setItem('pf_access', accessToken);
          setCookie('pf_access', accessToken, 1);
        }
        set({ accessToken });
      },

      setUser: (user) => set({ user }),

      logout: () => {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('pf_refresh');
          localStorage.removeItem('pf_access');
          removeCookie('pf_refresh');
          removeCookie('pf_access');
        }
        set({ user: null, accessToken: null, isAuthenticated: false });
      },
    }),
    {
      name: 'payflow-auth',
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
    }
  )
);