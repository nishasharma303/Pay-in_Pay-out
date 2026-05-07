'use client';
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useWallet } from '@/hooks/use-auth';
import { useWalletAnalytics } from '@/hooks/use-transactions';
import { Card, CardHeader, CardTitle, CardContent, WalletCard, Skeleton, StatCard } from '@/components/ui';
import { formatCurrency, cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { ArrowRight, Download, Loader2, TrendingDown, TrendingUp } from 'lucide-react';

const DAY_OPTIONS = [7, 14, 30, 60, 90];

export default function WalletPage() {
  const { data: wallet, isLoading } = useWallet();
  const [days, setDays] = useState(30);
  const { data: analytics, isLoading: analyticsLoading } = useWalletAnalytics(days);
  const [amount, setAmount] = useState('');
  const queryClient = useQueryClient();

  const transfer = useMutation({
    mutationFn: async () => { const { data } = await api.post('/wallet/transfer-secondary', { amount: parseFloat(amount) }); return data; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['wallet'] }); queryClient.invalidateQueries({ queryKey: ['ledger'] }); setAmount(''); },
  });

  const handleExport = async () => {
    const resp = await api.get('/wallet/ledger/export', { responseType: 'blob' });
    const url = URL.createObjectURL(new Blob([resp.data]));
    const a = document.createElement('a');
    a.href = url; a.download = `ledger-${new Date().toISOString().split('T')[0]}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  // Chart rendering
  const maxVal = analytics ? Math.max(...analytics.daily.map(d => Math.max(d.credit, d.debit)), 1) : 1;
  const chartData = analytics?.daily.slice(-14) ?? [];

  return (
    <div className="max-w-4xl space-y-5">
      {isLoading ? <Skeleton className="h-40 rounded-xl" /> : wallet ? (
        <WalletCard primary={wallet.primaryBalance} secondary={wallet.secondaryBalance} hold={wallet.holdBalance} />
      ) : null}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Primary', value: wallet?.primaryBalance ?? 0, color: 'text-success' },
          { label: 'Secondary', value: wallet?.secondaryBalance ?? 0, color: 'text-brand-400' },
          { label: 'On Hold', value: wallet?.holdBalance ?? 0, color: 'text-warning' },
          { label: 'Total', value: wallet?.totalBalance ?? 0, color: 'text-slate-200' },
        ].map((b) => (
          <Card key={b.label} className="p-4 text-center">
            <p className="text-2xs text-slate-500 uppercase tracking-wider mb-1">{b.label}</p>
            <p className={cn('text-base font-bold', b.color)}>{formatCurrency(b.value)}</p>
          </Card>
        ))}
      </div>

      {/* Analytics Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Transaction Volume</CardTitle>
          <div className="flex items-center gap-2">
            {DAY_OPTIONS.map((d) => (
              <button key={d} onClick={() => setDays(d)}
                className={cn('px-2.5 py-1 rounded-lg text-xs font-medium transition-all',
                  days === d ? 'bg-brand-600 text-white' : 'text-slate-500 hover:text-slate-300 hover:bg-white/[0.05]')}>
                {d}d
              </button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          {analyticsLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : analytics ? (
            <>
              <div className="flex items-center gap-6 mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-success" />
                  <span className="text-xs text-slate-400">Credit: <span className="font-semibold text-success">{formatCurrency(analytics.totalCredit)}</span></span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-danger" />
                  <span className="text-xs text-slate-400">Debit: <span className="font-semibold text-danger">{formatCurrency(analytics.totalDebit)}</span></span>
                </div>
              </div>
              {/* Bar chart */}
              <div className="flex items-end gap-1 h-36 w-full">
                {chartData.map((d, i) => (
                  <div key={d.date} className="flex-1 flex flex-col items-center gap-0.5 group">
                    <div className="w-full flex flex-col justify-end gap-0.5" style={{ height: '128px' }}>
                      <div
                        className="w-full bg-success/60 hover:bg-success transition-colors rounded-t"
                        style={{ height: `${(d.credit / maxVal) * 100}%`, minHeight: d.credit > 0 ? '2px' : '0' }}
                        title={`Credit: ${formatCurrency(d.credit)}`}
                      />
                      <div
                        className="w-full bg-danger/60 hover:bg-danger transition-colors rounded-t"
                        style={{ height: `${(d.debit / maxVal) * 100}%`, minHeight: d.debit > 0 ? '2px' : '0' }}
                        title={`Debit: ${formatCurrency(d.debit)}`}
                      />
                    </div>
                    {i % 3 === 0 && (
                      <span className="text-2xs text-slate-600 whitespace-nowrap">
                        {new Date(d.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </>
          ) : null}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Transfer secondary */}
        <Card>
          <CardHeader><CardTitle>Transfer Secondary → Primary</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {transfer.isSuccess && (
              <div className="p-3 rounded-lg bg-success/10 border border-success/20 text-success text-sm">Transfer successful!</div>
            )}
            {transfer.error && (
              <div className="p-3 rounded-lg bg-danger/10 border border-danger/20 text-danger text-sm">
                {(transfer.error as any)?.response?.data?.error?.message || 'Transfer failed'}
              </div>
            )}
            <div className="flex gap-3">
              <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)}
                className="input flex-1" placeholder="Amount in ₹" min="1" />
              <button onClick={() => transfer.mutate()} disabled={!amount || transfer.isPending}
                className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap">
                {transfer.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                Transfer
              </button>
            </div>
            <p className="text-xs text-slate-600">Available: {formatCurrency(wallet?.secondaryBalance ?? 0)}</p>
          </CardContent>
        </Card>

        {/* Export */}
        <Card>
          <CardHeader><CardTitle>Export Ledger</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-slate-500">Download your complete ledger as a CSV file for accounting or record-keeping.</p>
            <button onClick={handleExport} className="btn-secondary w-full justify-center">
              <Download className="w-4 h-4" /> Download CSV
            </button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
