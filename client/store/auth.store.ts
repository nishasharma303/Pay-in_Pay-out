import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user:            null,
      accessToken:     null,
      isAuthenticated: false,

      setAuth: (user, accessToken, refreshToken) => {
        // Store refresh token and access token in localStorage as backup
        if (typeof window !== 'undefined') {
          if (refreshToken) {
            localStorage.setItem('pf_refresh', refreshToken);
          }
          if (accessToken) {
            localStorage.setItem('pf_access', accessToken);
          }
        }
        set({ user, accessToken, isAuthenticated: true });
      },

      setAccessToken: (accessToken) => {
        // Also update localStorage when access token is refreshed
        if (typeof window !== 'undefined' && accessToken) {
          localStorage.setItem('pf_access', accessToken);
        }
        set({ accessToken });
      },

      setUser: (user) => set({ user }),

      logout: () => {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('pf_refresh');
          localStorage.removeItem('pf_access');
        }
        set({ user: null, accessToken: null, isAuthenticated: false });
      },
    }),
    {
      name: 'payflow-auth',
      // Only persist user info — access token lives in memory and localStorage separately
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
    }
  )
);