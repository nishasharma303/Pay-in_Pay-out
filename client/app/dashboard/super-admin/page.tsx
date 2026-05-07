'use client';
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSuperStats, useMasterWallet, useFeatureFlags } from '@/hooks/use-admin';
import { Card, CardHeader, CardTitle, CardContent, StatCard, Skeleton } from '@/components/ui';
import { formatCurrency, cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { AlertCircle, Loader2, Plus, Shield, ToggleLeft, ToggleRight, Users, Wallet, Zap } from 'lucide-react';

const FLAG_DESCRIPTIONS: Record<string, string> = {
  RAZORPAY_PAYIN: 'Allow users to add money via Razorpay',
  CASHFREE_PAYOUT: 'Allow users to send payouts via Cashfree',
  KYC_REQUIRED: 'Require KYC approval before transactions',
  AGENT_REGISTRATION: 'Allow new agent self-registration',
  MAINTENANCE_MODE: 'Put platform in read-only maintenance mode',
};

export default function SuperAdminPage() {
  const { data: stats, isLoading } = useSuperStats();
  const { data: masterWallet } = useMasterWallet();
  const { data: flags, refetch: refetchFlags } = useFeatureFlags();
  const qc = useQueryClient();
  const [adminForm, setAdminForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [showCreateAdmin, setShowCreateAdmin] = useState(false);
  const [createError, setCreateError] = useState('');

  const setFlag = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: boolean }) => {
      await api.post('/admin/super/flags', { key, value });
    },
    onSuccess: () => refetchFlags(),
  });

  const createAdmin = useMutation({
    mutationFn: async () => {
      setCreateError('');
      const { data } = await api.post('/admin/super/admins', adminForm);
      return data;
    },
    onSuccess: () => {
      setAdminForm({ name: '', email: '', phone: '', password: '' });
      setShowCreateAdmin(false);
      qc.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (err: any) => setCreateError(err?.response?.data?.error?.message || 'Failed to create admin'),
  });

  return (
    <div className="space-y-5">
      {/* System stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Users" value={isLoading ? '…' : String(stats?.users ?? 0)} loading={isLoading}
          icon={<Users className="w-4 h-4 text-brand-400" />} iconBg="bg-brand-500/10" />
        <StatCard label="Total Volume" value={isLoading ? '…' : formatCurrency(stats?.totalVolume ?? 0)} loading={isLoading}
          icon={<Zap className="w-4 h-4 text-success" />} iconBg="bg-success/10" />
        <StatCard label="Commissions Paid" value={isLoading ? '…' : formatCurrency(stats?.totalCommissions ?? 0)} loading={isLoading}
          icon={<Shield className="w-4 h-4 text-warning" />} iconBg="bg-warning/10" />
        <StatCard label="Active Wallets" value={isLoading ? '…' : String(stats?.activeWallets ?? 0)} loading={isLoading}
          icon={<Wallet className="w-4 h-4 text-purple-400" />} iconBg="bg-purple-400/10" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Master wallet */}
        <Card>
          <CardHeader><CardTitle>Master Wallet</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {masterWallet ? (
              <>
                <div className="relative overflow-hidden rounded-xl bg-wallet-gradient border border-white/[0.08] p-5">
                  <div className="absolute -top-8 -right-8 w-32 h-32 bg-brand-500/20 rounded-full blur-2xl pointer-events-none" />
                  <p className="text-xs text-white/50 uppercase tracking-wider mb-1">Super Admin Balance</p>
                  <p className="text-3xl font-bold tracking-tight text-white">{formatCurrency(masterWallet.masterBalance)}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Platform Primary', value: masterWallet.platformTotalPrimary },
                    { label: 'Platform Secondary', value: masterWallet.platformTotalSecondary },
                    { label: 'Total Held', value: masterWallet.platformHeld },
                    { label: 'Pending Payouts', value: masterWallet.pendingPayoutsAmount },
                  ].map((b) => (
                    <div key={b.label} className="p-3 rounded-lg bg-surface-850 border border-white/[0.06]">
                      <p className="text-2xs text-slate-500 mb-0.5">{b.label}</p>
                      <p className="text-sm font-semibold text-slate-200">{formatCurrency(b.value)}</p>
                    </div>
                  ))}
                </div>
              </>
            ) : <Skeleton className="h-40 w-full rounded-xl" />}
          </CardContent>
        </Card>

        {/* Feature flags */}
        <Card>
          <CardHeader><CardTitle>Feature Flags</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {flags ? Object.entries(flags).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-slate-200">{key.replace(/_/g, ' ')}</p>
                  <p className="text-2xs text-slate-500 truncate">{FLAG_DESCRIPTIONS[key] || key}</p>
                </div>
                <button
                  onClick={() => setFlag.mutate({ key, value: !value })}
                  disabled={setFlag.isPending}
                  className="flex-shrink-0 transition-colors"
                >
                  {value
                    ? <ToggleRight className="w-6 h-6 text-success" />
                    : <ToggleLeft className="w-6 h-6 text-slate-500" />}
                </button>
              </div>
            )) : <Skeleton className="h-40 w-full" />}
          </CardContent>
        </Card>
      </div>

      {/* Create admin */}
      <Card>
        <CardHeader>
          <CardTitle>Admin Users</CardTitle>
          <button onClick={() => setShowCreateAdmin(s => !s)} className="btn-primary py-1.5">
            <Plus className="w-3.5 h-3.5" /> {showCreateAdmin ? 'Cancel' : 'Create Admin'}
          </button>
        </CardHeader>
        {showCreateAdmin && (
          <CardContent className="space-y-4">
            {createError && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-danger/10 border border-danger/20">
                <AlertCircle className="w-4 h-4 text-danger flex-shrink-0 mt-0.5" />
                <p className="text-sm text-danger">{createError}</p>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { key: 'name', label: 'Full Name', placeholder: 'John Doe', type: 'text' },
                { key: 'email', label: 'Email', placeholder: 'admin@example.com', type: 'email' },
                { key: 'phone', label: 'Phone', placeholder: '9876543210', type: 'tel' },
                { key: 'password', label: 'Password', placeholder: 'Min 8 characters', type: 'password' },
              ].map((f) => (
                <div key={f.key}>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">{f.label}</label>
                  <input type={f.type} value={adminForm[f.key as keyof typeof adminForm]}
                    onChange={(e) => setAdminForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                    className="input" placeholder={f.placeholder} />
                </div>
              ))}
            </div>
            <button onClick={() => createAdmin.mutate()} disabled={createAdmin.isPending || !adminForm.name || !adminForm.email}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed">
              {createAdmin.isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating...</> : 'Create Admin'}
            </button>
          </CardContent>
        )}
      </Card>

      {/* User growth chart */}
      {stats?.userGrowth && stats.userGrowth.length > 0 && (
        <Card>
          <CardHeader><CardTitle>User Growth — Last 7 Days</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-end gap-2 h-24">
              {stats.userGrowth.map((d: any) => {
                const maxCount = Math.max(...stats.userGrowth.map((x: any) => x.count), 1);
                return (
                  <div key={d.date} className="flex-1 flex flex-col items-center gap-1" title={`${d.date}: ${d.count} new users`}>
                    <div className="w-full bg-brand-600/60 hover:bg-brand-600 transition-colors rounded-t"
                      style={{ height: `${(d.count / maxCount) * 80}px`, minHeight: d.count > 0 ? '4px' : '0' }} />
                    <span className="text-2xs text-slate-600">
                      {new Date(d.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
