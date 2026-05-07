import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency = 'INR'): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(date));
}

export function formatCompact(amount: number): string {
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(1)}Cr`;
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}K`;
  return `₹${amount.toFixed(2)}`;
}

export const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Admin',
  CLIENT: 'Client',
  AGENT: 'Agent',
};

// Light theme role colors - matching the design philosophy
export const ROLE_COLORS: Record<string, string> = {
  SUPER_ADMIN: 'text-purple-700 bg-purple-50 border border-purple-200',
  ADMIN: 'text-brand-700 bg-brand-50 border border-brand-200',
  CLIENT: 'text-emerald-700 bg-emerald-50 border border-emerald-200',
  AGENT: 'text-amber-700 bg-amber-50 border border-amber-200',
};

// Optional: Additional color utilities for light theme
export const STATUS_COLORS: Record<string, string> = {
  SUCCESS: 'text-emerald-700 bg-emerald-50 border border-emerald-200',
  DANGER: 'text-red-700 bg-red-50 border border-red-200',
  WARNING: 'text-amber-700 bg-amber-50 border border-amber-200',
  INFO: 'text-blue-700 bg-blue-50 border border-blue-200',
  NEUTRAL: 'text-gray-600 bg-gray-100 border border-gray-200',
};

// Badge style helper function for light theme
export function getBadgeStyles(variant: 'success' | 'danger' | 'warning' | 'info' | 'neutral'): string {
  const styles = {
    success: 'text-emerald-700 bg-emerald-50 border border-emerald-200',
    danger: 'text-red-700 bg-red-50 border border-red-200',
    warning: 'text-amber-700 bg-amber-50 border border-amber-200',
    info: 'text-blue-700 bg-blue-50 border border-blue-200',
    neutral: 'text-gray-600 bg-gray-100 border border-gray-200',
  };
  return `text-xs font-medium px-2.5 py-0.5 rounded-full ${styles[variant]}`;
}

// Button style variants for light theme
export const BUTTON_VARIANTS = {
  primary: 'bg-brand-600 hover:bg-brand-700 text-white shadow-sm',
  secondary: 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 shadow-sm',
  ghost: 'text-gray-500 hover:text-gray-800 hover:bg-gray-100',
  danger: 'bg-red-50 hover:bg-red-100 text-red-700 border border-red-200',
};

// Card style for light theme
export const CARD_STYLES = 'bg-white border border-gray-200 rounded-xl shadow-sm';

// Input style for light theme
export const INPUT_STYLES = 'bg-white border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all duration-150 shadow-sm';