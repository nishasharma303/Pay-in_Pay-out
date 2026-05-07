'use client';
import { useMe, useWallet, useLedger } from '@/hooks/use-auth';
import { useMyKyc } from '@/hooks/use-kyc';
import { StatCard, Card, CardHeader, CardTitle, CardContent, Badge, Table, Th, Td, Tr, WalletCard, EmptyState, Skeleton } from '@/components/ui';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import { AlertCircle, ArrowDownCircle, BookOpen, ShieldCheck, Star, TrendingUp, Wallet, Zap } from 'lucide-react';
import Link from 'next/link';

const QUICK_SERVICES = [
  { label: 'AEPS Cash', icon: '🏧', href: '/dashboard/services' },
  { label: 'Recharge', icon: '📱', href: '/dashboard/services' },
  { label: 'Bill Pay', icon: '⚡', href: '/dashboard/services' },
  { label: 'Bank Txfr', icon: '🏦', href: '/dashboard/services' },
  { label: 'PAN Card', icon: '🪪', href: '/dashboard/services' },
  { label: 'Insurance', icon: '🛡️', href: '/dashboard/services' },
];

export default function OverviewPage() {
  const { data: me } = useMe();
  const { data: wallet, isLoading: walletLoading } = useWallet();
  const { data: ledgerData, isLoading: ledgerLoading } = useLedger({ limit: 5 });
  const { data: kyc, isLoading: kycLoading } = useMyKyc();

  const entries = ledgerData?.data ?? [];
  const kycSubmitted = !!kyc;
  const kycApproved = kyc?.status === 'APPROVED';

  return (
    <div className="space-y-5">
      {/* Welcome */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            Good {getGreeting()},{' '}
            <span className="bg-gradient-to-r from-brand-400 to-purple-400 bg-clip-text text-transparent">
              {me?.name?.split(' ')[0] ?? '...'}
            </span>{' '}👋
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <Link href="/dashboard/pay-in" className="btn-primary hidden sm:inline-flex">
          <Zap className="w-4 h-4" /> New Transaction
        </Link>
      </div>

      {/* KYC banner */}
      {!kycLoading && !kycApproved && (
        <Link href="/dashboard/kyc"
          className={cn(
            'flex items-center gap-3 p-4 rounded-xl border transition-all hover:opacity-90',
            !kycSubmitted
              ? 'bg-warning/10 border-warning/20'
              : kyc?.status === 'PENDING'
              ? 'bg-brand-500/10 border-brand-500/20'
              : 'bg-danger/10 border-danger/20'
          )}>
          {!kycSubmitted
            ? <AlertCircle className="w-5 h-5 text-warning flex-shrink-0" />
            : kyc?.status === 'PENDING'
            ? <ShieldCheck className="w-5 h-5 text-brand-400 flex-shrink-0" />
            : <AlertCircle className="w-5 h-5 text-danger flex-shrink-0" />}
          <div className="flex-1">
            <p className={cn('text-sm font-medium',
              !kycSubmitted ? 'text-warning' : kyc?.status === 'PENDING' ? 'text-brand-300' : 'text-danger')}>
              {!kycSubmitted
                ? 'Complete your KYC to unlock all features'
                : kyc?.status === 'PENDING'
                ? 'KYC under review — usually 1–2 business days'
                : 'KYC rejected — click to resubmit'}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              {!kycSubmitted
                ? 'Submit PAN, Aadhaar, and bank details to get verified.'
                : kyc?.status === 'REJECTED' && kyc.reviewNote
                ? `Reason: ${kyc.reviewNote}`
                : 'Click to view your submission status.'}
            </p>
          </div>
          <span className="text-xs text-slate-400 flex-shrink-0">→</span>
        </Link>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Primary Balance" value={wallet ? formatCurrency(wallet.primaryBalance) : '—'}
          delta="Available to spend" deltaType="neutral"
          icon={<Wallet className="w-4 h-4 text-success" />} iconBg="bg-success/10" loading={walletLoading} />
        <StatCard label="Secondary Balance" value={wallet ? formatCurrency(wallet.secondaryBalance) : '—'}
          delta="Transfer to primary" deltaType="neutral"
          icon={<TrendingUp className="w-4 h-4 text-brand-400" />} iconBg="bg-brand-500/10" loading={walletLoading} />
        <StatCard label="Today's Volume" value="₹0.00" delta="No transactions yet" deltaType="neutral"
          icon={<ArrowDownCircle className="w-4 h-4 text-warning" />} iconBg="bg-warning/10" loading={false} />
        <StatCard label="Points Earned" value="0.00" delta="Redeem for rewards" deltaType="neutral"
          icon={<Star className="w-4 h-4 text-yellow-400" />} iconBg="bg-yellow-400/10" loading={false} />
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Ledger */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Recent Ledger Entries</CardTitle>
              <Link href="/dashboard/ledger" className="text-xs text-brand-400 hover:text-brand-300 transition-colors">
                View all →
              </Link>
            </CardHeader>
            <div>
              <Table>
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    <Th>Particulars</Th>
                    <Th>Type</Th>
                    <Th className="text-right">Amount</Th>
                    <Th className="text-right">Balance</Th>
                  </tr>
                </thead>
                <tbody>
                  {ledgerLoading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <Tr key={i}>
                        <Td><Skeleton className="h-4 w-48" /></Td>
                        <Td><Skeleton className="h-5 w-14" /></Td>
                        <Td><Skeleton className="h-4 w-20 ml-auto" /></Td>
                        <Td><Skeleton className="h-4 w-20 ml-auto" /></Td>
                      </Tr>
                    ))
                  ) : entries.length === 0 ? (
                    <tr><td colSpan={4}>
                      <EmptyState icon={<BookOpen className="w-8 h-8" />} title="No transactions yet"
                        description="Your ledger entries will appear here" />
                    </td></tr>
                  ) : (
                    entries.map((entry: any) => (
                      <Tr key={entry.id}>
                        <Td>
                          <p className="font-medium text-slate-200 text-xs">{entry.description}</p>
                          {entry.referenceId && (
                            <p className="text-2xs text-slate-600 font-mono mt-0.5 truncate max-w-[180px]">
                              {entry.referenceId}
                            </p>
                          )}
                          <p className="text-2xs text-slate-600 mt-0.5">{formatDate(entry.createdAt)}</p>
                        </Td>
                        <Td>
                          <Badge variant={entry.type === 'CREDIT' ? 'success' : 'danger'}>
                            {entry.type === 'CREDIT' ? '↓ Credit' : '↑ Debit'}
                          </Badge>
                        </Td>
                        <Td className="text-right">
                          <span className={cn('font-semibold text-sm',
                            entry.type === 'CREDIT' ? 'text-success' : 'text-danger')}>
                            {entry.type === 'CREDIT' ? '+' : '-'}{formatCurrency(entry.amount)}
                          </span>
                        </Td>
                        <Td className="text-right text-slate-400 font-mono text-xs">
                          {formatCurrency(entry.balanceAfter)}
                        </Td>
                      </Tr>
                    ))
                  )}
                </tbody>
              </Table>
            </div>
          </Card>
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {walletLoading ? <Skeleton className="h-40 w-full rounded-xl" /> :
            wallet ? <WalletCard primary={wallet.primaryBalance} secondary={wallet.secondaryBalance} hold={wallet.holdBalance} /> : null}

          {/* KYC status card */}
          <Card>
            <CardHeader>
              <CardTitle>KYC Status</CardTitle>
              <Link href="/dashboard/kyc" className="text-xs text-brand-400 hover:text-brand-300">Manage →</Link>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0',
                  kycApproved ? 'bg-success/10' : !kycSubmitted ? 'bg-warning/10' : kyc?.status === 'PENDING' ? 'bg-brand-500/10' : 'bg-danger/10')}>
                  <ShieldCheck className={cn('w-4 h-4',
                    kycApproved ? 'text-success' : !kycSubmitted ? 'text-warning' : kyc?.status === 'PENDING' ? 'text-brand-400' : 'text-danger')} />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-200">
                    {kycApproved ? 'Verified' : !kycSubmitted ? 'Not submitted' : kyc?.status === 'PENDING' ? 'Under review' : 'Rejected'}
                  </p>
                  <p className="text-2xs text-slate-500 mt-0.5">
                    {kycApproved ? 'Account fully verified' : !kycSubmitted ? 'Complete KYC to transact' : kyc?.status === 'PENDING' ? 'Waiting for admin review' : 'Resubmit with corrections'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick services */}
          <Card>
            <CardHeader><CardTitle>Quick Services</CardTitle></CardHeader>
            <CardContent className="p-3">
              <div className="grid grid-cols-3 gap-2">
                {QUICK_SERVICES.map((svc) => (
                  <Link key={svc.label} href={svc.href}
                    className="flex flex-col items-center gap-1.5 p-3 rounded-lg bg-surface-850 border border-white/[0.04] hover:border-brand-500/30 hover:bg-brand-500/5 transition-all group">
                    <span className="text-xl">{svc.icon}</span>
                    <span className="text-2xs text-slate-500 group-hover:text-slate-300 transition-colors text-center">{svc.label}</span>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}
