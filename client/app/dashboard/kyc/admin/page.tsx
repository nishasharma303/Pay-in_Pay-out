'use client';
import { useState } from 'react';
import { useKycList, useKycStats } from '@/hooks/use-kyc';
import { KycReviewModal } from '@/components/dashboard/kyc-review-modal';
import { Card, CardHeader, CardTitle, Badge, Table, Th, Td, Tr, EmptyState, Skeleton } from '@/components/ui';
import { formatDate, cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, FileCheck, Search, ShieldCheck } from 'lucide-react';

type FilterStatus = '' | 'PENDING' | 'APPROVED' | 'REJECTED';

export default function KycAdminPage() {
  const [status, setStatus] = useState<FilterStatus>('PENDING');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [selectedKycId, setSelectedKycId] = useState<string | null>(null);

  const { data: stats } = useKycStats();
  const { data, isLoading } = useKycList({ status: status || undefined, page, limit: 15 });

  const kycs: any[] = data?.data ?? [];
  const meta = data?.meta ?? { total: 0, totalPages: 1 };

  const statusBadge = (s: string) => {
    const map: Record<string, any> = { PENDING: 'warning', APPROVED: 'success', REJECTED: 'danger' };
    return <Badge variant={map[s] || 'neutral'}>{s}</Badge>;
  };

  const filtered = search
    ? kycs.filter((k) =>
        k.user?.name.toLowerCase().includes(search.toLowerCase()) ||
        k.user?.email.toLowerCase().includes(search.toLowerCase()) ||
        k.panNumber?.includes(search.toUpperCase())
      )
    : kycs;

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total', value: stats?.total ?? '—', color: 'text-slate-300' },
          { label: 'Pending', value: stats?.pending ?? '—', color: 'text-warning' },
          { label: 'Approved', value: stats?.approved ?? '—', color: 'text-success' },
          { label: 'Rejected', value: stats?.rejected ?? '—', color: 'text-danger' },
        ].map((s) => (
          <Card key={s.label} className="p-4 text-center">
            <p className="text-2xs text-slate-500 uppercase tracking-wider mb-1">{s.label}</p>
            <p className={cn('text-2xl font-bold', s.color)}>{s.value}</p>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>KYC Submissions</CardTitle>
          <div className="flex items-center gap-2">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input pl-8 py-1.5 text-xs w-44"
                placeholder="Name, email, PAN..."
              />
            </div>
            {/* Status filter */}
            <div className="flex gap-1">
              {(['', 'PENDING', 'APPROVED', 'REJECTED'] as FilterStatus[]).map((s) => (
                <button
                  key={s}
                  onClick={() => { setStatus(s); setPage(1); }}
                  className={cn(
                    'px-3 py-1 rounded-lg text-xs font-medium transition-all',
                    status === s
                      ? s === 'PENDING' ? 'bg-warning/20 text-warning'
                        : s === 'APPROVED' ? 'bg-success/20 text-success'
                        : s === 'REJECTED' ? 'bg-danger/20 text-danger'
                        : 'bg-brand-600 text-white'
                      : 'text-slate-500 hover:text-slate-300 hover:bg-white/[0.05]'
                  )}
                >
                  {s || 'All'}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>

        <Table>
          <thead>
            <tr className="border-b border-white/[0.06]">
              <Th>User</Th>
              <Th>PAN</Th>
              <Th>Documents</Th>
              <Th>Status</Th>
              <Th>Submitted</Th>
              <Th>Action</Th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <Tr key={i}>
                  {Array.from({ length: 6 }).map((__, j) => (
                    <Td key={j}><Skeleton className="h-4 w-20" /></Td>
                  ))}
                </Tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6}>
                  <EmptyState
                    icon={<FileCheck className="w-8 h-8" />}
                    title={status === 'PENDING' ? 'No pending KYC submissions' : 'No records found'}
                    description={status === 'PENDING' ? 'All submissions have been reviewed.' : 'Try changing the filter.'}
                  />
                </td>
              </tr>
            ) : (
              filtered.map((kyc) => {
                const docsUploaded = [kyc.panImageUrl, kyc.aadhaarFrontUrl, kyc.aadhaarBackUrl, kyc.selfieUrl].filter(Boolean).length;
                return (
                  <Tr key={kyc.id}>
                    <Td>
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-brand-gradient flex items-center justify-center text-2xs font-semibold text-white flex-shrink-0">
                          {kyc.user?.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
                        </div>
                        <div>
                          <p className="text-xs font-medium text-slate-200">{kyc.user?.name}</p>
                          <p className="text-2xs text-slate-600">{kyc.user?.email}</p>
                        </div>
                      </div>
                    </Td>
                    <Td className="font-mono text-xs text-slate-300">{kyc.panNumber || '—'}</Td>
                    <Td>
                      <div className="flex items-center gap-1">
                        <div className={cn(
                          'text-2xs px-2 py-0.5 rounded font-medium',
                          docsUploaded === 4 ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'
                        )}>
                          {docsUploaded}/4 docs
                        </div>
                      </div>
                    </Td>
                    <Td>{statusBadge(kyc.status)}</Td>
                    <Td className="text-xs text-slate-500">{formatDate(kyc.createdAt)}</Td>
                    <Td>
                      <button
                        onClick={() => setSelectedKycId(kyc.id)}
                        className={cn(
                          'text-2xs px-3 py-1.5 rounded-lg font-medium transition-all',
                          kyc.status === 'PENDING'
                            ? 'bg-brand-600/20 text-brand-400 hover:bg-brand-600/30'
                            : 'bg-surface-700 text-slate-400 hover:text-slate-200'
                        )}
                      >
                        {kyc.status === 'PENDING' ? 'Review →' : 'View'}
                      </button>
                    </Td>
                  </Tr>
                );
              })
            )}
          </tbody>
        </Table>

        {meta.totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-white/[0.06]">
            <p className="text-xs text-slate-500">
              Page {page} of {meta.totalPages} · {meta.total} records
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

      {/* Review modal */}
      {selectedKycId && (
        <KycReviewModal kycId={selectedKycId} onClose={() => setSelectedKycId(null)} />
      )}
    </div>
  );
}
