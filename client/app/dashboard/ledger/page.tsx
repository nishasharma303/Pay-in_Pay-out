'use client';
import { useState } from 'react';
import { useLedger, useWallet } from '@/hooks/use-auth';
import { Card, CardHeader, CardTitle, Badge, Table, Th, Td, Tr, EmptyState, Skeleton, WalletCard } from '@/components/ui';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import { BookOpen, ChevronLeft, ChevronRight } from 'lucide-react';

export default function LedgerPage() {
  const [page, setPage] = useState(1);
  const [type, setType] = useState<string>('');
  const { data: wallet } = useWallet();
  const { data, isLoading } = useLedger({ page, limit: 15, type: type || undefined });

  const entries = data?.data ?? [];
  const meta = data?.meta ?? { total: 0, totalPages: 1 };

  return (
    <div className="space-y-5">
      {wallet && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <WalletCard primary={wallet.primaryBalance} secondary={wallet.secondaryBalance} hold={wallet.holdBalance} />
          <div className="sm:col-span-2 grid grid-cols-2 gap-3 content-start">
            {[
              { label: 'Total Entries', value: meta.total.toLocaleString() },
              { label: 'On Hold', value: formatCurrency(wallet.holdBalance) },
            ].map((s) => (
              <Card key={s.label} className="p-4">
                <p className="text-2xs text-slate-500 uppercase tracking-wider mb-1">{s.label}</p>
                <p className="text-xl font-bold text-white">{s.value}</p>
              </Card>
            ))}
          </div>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Ledger Entries</CardTitle>
          <div className="flex gap-2">
            {['', 'CREDIT', 'DEBIT'].map((t) => (
              <button key={t} onClick={() => { setType(t); setPage(1); }}
                className={cn('px-3 py-1 rounded-lg text-xs font-medium transition-all',
                  type === t ? 'bg-brand-600 text-white' : 'text-slate-500 hover:text-slate-300 hover:bg-white/[0.05]')}>
                {t || 'All'}
              </button>
            ))}
          </div>
        </CardHeader>

        <Table>
          <thead>
            <tr className="border-b border-white/[0.06]">
              <Th>Date & Time</Th>
              <Th>Description</Th>
              <Th>Reference</Th>
              <Th>Type</Th>
              <Th className="text-right">Amount</Th>
              <Th className="text-right">Balance After</Th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <Tr key={i}>
                  {Array.from({ length: 6 }).map((__, j) => (
                    <Td key={j}><Skeleton className="h-4 w-full max-w-[120px]" /></Td>
                  ))}
                </Tr>
              ))
            ) : entries.length === 0 ? (
              <tr><td colSpan={6}>
                <EmptyState icon={<BookOpen className="w-8 h-8" />} title="No entries found" />
              </td></tr>
            ) : (
              entries.map((e: any) => (
                <Tr key={e.id}>
                  <Td className="whitespace-nowrap text-xs text-slate-500">{formatDate(e.createdAt)}</Td>
                  <Td className="max-w-[200px]">
                    <p className="text-slate-200 text-xs truncate">{e.description}</p>
                  </Td>
                  <Td className="font-mono text-2xs text-slate-600 max-w-[140px] truncate">{e.referenceId || '—'}</Td>
                  <Td>
                    <Badge variant={e.type === 'CREDIT' ? 'success' : 'danger'}>
                      {e.type === 'CREDIT' ? '↓ Credit' : '↑ Debit'}
                    </Badge>
                  </Td>
                  <Td className="text-right">
                    <span className={cn('font-semibold text-sm', e.type === 'CREDIT' ? 'text-success' : 'text-danger')}>
                      {e.type === 'CREDIT' ? '+' : '-'}{formatCurrency(e.amount)}
                    </span>
                  </Td>
                  <Td className="text-right font-mono text-xs text-slate-400">{formatCurrency(e.balanceAfter)}</Td>
                </Tr>
              ))
            )}
          </tbody>
        </Table>

        {/* Pagination */}
        {meta.totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-white/[0.06]">
            <p className="text-xs text-slate-500">
              Page {page} of {meta.totalPages} · {meta.total} entries
            </p>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="btn-ghost px-2 py-1.5 disabled:opacity-30">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button onClick={() => setPage(p => Math.min(meta.totalPages, p + 1))} disabled={page >= meta.totalPages}
                className="btn-ghost px-2 py-1.5 disabled:opacity-30">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
