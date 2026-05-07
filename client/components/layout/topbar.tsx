'use client';
import { Bell, RefreshCw } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { useWallet } from '@/hooks/use-auth';
import { useMyKyc } from '@/hooks/use-kyc';
import { formatCurrency } from '@/lib/utils';
import { useQueryClient } from '@tanstack/react-query';
import { usePathname } from 'next/navigation';
import Link from 'next/link';

const PAGE_TITLES: Record<string, { title: string; subtitle: string }> = {
  '/dashboard/overview':    { title: 'Overview',        subtitle: 'Your financial summary' },
  '/dashboard/pay-in':      { title: 'Pay-In',          subtitle: 'Add money to wallet' },
  '/dashboard/pay-out':     { title: 'Pay-Out',         subtitle: 'Send funds via IMPS / NEFT / UPI' },
  '/dashboard/ledger':      { title: 'Ledger',          subtitle: 'Transaction history' },
  '/dashboard/wallet':      { title: 'Wallet',          subtitle: 'Balance & analytics' },
  '/dashboard/kyc':         { title: 'KYC Verification',subtitle: 'Identity verification' },
  '/dashboard/kyc/admin':   { title: 'KYC Review',      subtitle: 'Review agent submissions' },
  '/dashboard/users':       { title: 'Users',           subtitle: 'Manage your team' },
  '/dashboard/commissions': { title: 'Commissions',     subtitle: 'Earnings & rules' },
  '/dashboard/services':    { title: 'Services',        subtitle: 'Available integrations' },
  '/dashboard/admin':       { title: 'Admin Panel',     subtitle: 'Analytics & audit logs' },
  '/dashboard/super-admin': { title: 'Super Admin',     subtitle: 'Platform control center' },
  '/dashboard/settings':    { title: 'Settings',        subtitle: 'Account preferences' },
};

export function Topbar() {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const { data: wallet, refetch } = useWallet();
  const { data: kyc } = useMyKyc();
  const qc = useQueryClient();
  const page = PAGE_TITLES[pathname] || { title: 'Dashboard', subtitle: '' };
  const kycNotVerified = !user?.isVerified;

  return (
    <header className="flex items-center justify-between px-6 py-3.5 border-b border-gray-200 bg-white flex-shrink-0 shadow-sm">
      <div>
        <h1 className="text-base font-semibold text-gray-900 tracking-tight">{page.title}</h1>
        <p className="text-xs text-gray-400">{page.subtitle}</p>
      </div>
      <div className="flex items-center gap-2">
        {kycNotVerified && pathname !== '/dashboard/kyc' && (
          <Link href="/dashboard/kyc"
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-700 hover:bg-amber-100 transition-colors font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            KYC required
          </Link>
        )}
        {wallet && (
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-50 border border-gray-200 text-xs">
            <span className="text-gray-500">Balance</span>
            <span className="font-semibold text-emerald-600">{formatCurrency(wallet.primaryBalance)}</span>
          </div>
        )}
        <button onClick={() => { qc.invalidateQueries(); refetch(); }}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-all">
          <RefreshCw className="w-4 h-4" />
        </button>
        <button className="relative w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-all">
          <Bell className="w-4 h-4" />
          {kycNotVerified && <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-amber-500 rounded-full" />}
        </button>
      </div>
    </header>
  );
}
