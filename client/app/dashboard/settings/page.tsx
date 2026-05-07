'use client';
import { useState } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { useMe } from '@/hooks/use-auth';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui';
import { formatDate, cn, ROLE_LABELS, ROLE_COLORS } from '@/lib/utils';
import { Bell, Lock, Shield, User } from 'lucide-react';

export default function SettingsPage() {
  const { user } = useAuthStore();
  const { data: me } = useMe();
  const [notifPrefs, setNotifPrefs] = useState({ payIn: true, payOut: true, kyc: true, commission: false });

  return (
    <div className="max-w-2xl space-y-5">
      {/* Profile */}
      <Card>
        <CardHeader><CardTitle><User className="w-4 h-4 inline mr-2" />Profile</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-brand-gradient flex items-center justify-center text-lg font-bold text-white flex-shrink-0">
              {user?.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
            </div>
            <div>
              <p className="text-base font-semibold text-white">{user?.name}</p>
              <span className={cn('text-xs px-2 py-0.5 rounded font-medium', ROLE_COLORS[user?.role || 'AGENT'])}>{ROLE_LABELS[user?.role || 'AGENT']}</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Email', value: me?.email },
              { label: 'Phone', value: me?.phone },
              { label: 'Account status', value: me?.isActive ? 'Active' : 'Inactive' },
              { label: 'KYC status', value: me?.kyc?.status ?? 'Not submitted' },
              { label: 'Member since', value: me?.createdAt ? formatDate(me.createdAt) : '—' },
              { label: 'Verified', value: me?.isVerified ? 'Yes' : 'No' },
            ].map((f) => (
              <div key={f.label}>
                <p className="text-2xs text-slate-500 uppercase tracking-wider mb-0.5">{f.label}</p>
                <p className="text-sm text-slate-200">{f.value ?? '—'}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Security */}
      <Card>
        <CardHeader><CardTitle><Lock className="w-4 h-4 inline mr-2" />Security</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 rounded-lg bg-surface-850 border border-white/[0.06]">
            <div>
              <p className="text-sm font-medium text-slate-200">Password</p>
              <p className="text-xs text-slate-500">Last changed: unknown</p>
            </div>
            <button className="btn-ghost text-xs">Change →</button>
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg bg-surface-850 border border-white/[0.06]">
            <div>
              <p className="text-sm font-medium text-slate-200">Two-Factor Authentication</p>
              <p className="text-xs text-slate-500">Coming in a future update</p>
            </div>
            <span className="text-2xs px-2 py-0.5 rounded bg-surface-700 text-slate-500">Soon</span>
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader><CardTitle><Bell className="w-4 h-4 inline mr-2" />Notifications</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {[
            { key: 'payIn', label: 'Pay-In success', desc: 'When money is added to your wallet' },
            { key: 'payOut', label: 'Pay-Out status', desc: 'When a payout completes or fails' },
            { key: 'kyc', label: 'KYC updates', desc: 'When your KYC is reviewed' },
            { key: 'commission', label: 'Commission earned', desc: 'When you earn a commission' },
          ].map((n) => (
            <div key={n.key} className="flex items-center justify-between p-3 rounded-lg bg-surface-850 border border-white/[0.06]">
              <div>
                <p className="text-sm font-medium text-slate-200">{n.label}</p>
                <p className="text-xs text-slate-500">{n.desc}</p>
              </div>
              <button onClick={() => setNotifPrefs(p => ({ ...p, [n.key]: !p[n.key as keyof typeof p] }))}
                className={cn('w-10 h-6 rounded-full transition-colors relative', notifPrefs[n.key as keyof typeof notifPrefs] ? 'bg-brand-600' : 'bg-surface-700')}>
                <span className={cn('absolute top-1 w-4 h-4 rounded-full bg-white transition-transform', notifPrefs[n.key as keyof typeof notifPrefs] ? 'translate-x-5' : 'translate-x-1')} />
              </button>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Version */}
      <div className="text-center text-2xs text-slate-600">
        PayFlow v1.0.0 · Modules 1–10 complete · Built with Next.js + Express + PostgreSQL
      </div>
    </div>
  );
}
