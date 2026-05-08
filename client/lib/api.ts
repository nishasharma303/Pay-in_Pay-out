import axios from 'axios';
import { useAuthStore } from '@/store/auth.store';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';

export const api = axios.create({
  baseURL:         `${BASE_URL}/api`,
  withCredentials: true,
  headers:         { 'Content-Type': 'application/json' },
});

// Attach access token - checks both store and localStorage
api.interceptors.request.use((config) => {
  // Try to get token from store first
  let token = useAuthStore.getState().accessToken;
  
  // If not in store, try localStorage as fallback
  if (!token && typeof window !== 'undefined') {
    token = localStorage.getItem('pf_access');
    // If found in localStorage, update the store
    if (token) {
      useAuthStore.getState().setAccessToken(token);
    }
  }
  
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let isRefreshing = false;
let failedQueue: Array<{ resolve: (val: string) => void; reject: (err: unknown) => void }> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach(p => error ? p.reject(error) : p.resolve(token!));
  failedQueue = [];
};

const clearAuthAndRedirect = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('pf_refresh');
    localStorage.removeItem('pf_access');
    localStorage.removeItem('payflow-auth');
  }
  useAuthStore.getState().logout();
  if (typeof window !== 'undefined' && !window.location.pathname.includes('/auth/')) {
    window.location.href = '/auth/login';
  }
};

api.interceptors.response.use(
  res => res,
  async (error) => {
    const originalRequest = error.config;

    // If the refresh endpoint itself fails — logout immediately, no loop
    if (originalRequest.url?.includes('/auth/refresh')) {
      clearAuthAndRedirect();
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        }).catch(err => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const storedRefresh = typeof window !== 'undefined'
          ? localStorage.getItem('pf_refresh')
          : null;

        if (!storedRefresh) {
          throw new Error('No refresh token available');
        }

        const { data } = await axios.post(
          `${BASE_URL}/api/auth/refresh`,
          {},
          {
            withCredentials: true,
            headers: { 'x-refresh-token': storedRefresh },
          }
        );

        const newAccess = data.data?.accessToken;
        const newRefresh = data.data?.refreshToken;

        if (!newAccess) {
          throw new Error('No access token in refresh response');
        }

        // Update store and localStorage with new tokens
        useAuthStore.getState().setAccessToken(newAccess);
        
        if (newRefresh && typeof window !== 'undefined') {
          localStorage.setItem('pf_refresh', newRefresh);
        }
        if (typeof window !== 'undefined') {
          localStorage.setItem('pf_access', newAccess);
        }

        processQueue(null, newAccess);
        originalRequest.headers.Authorization = `Bearer ${newAccess}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        clearAuthAndRedirect();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);