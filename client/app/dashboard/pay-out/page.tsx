'use client';
import { useState } from 'react';
import { useWallet } from '@/hooks/use-auth';
import { useInitiatePayout, useVerifyUpi, usePayOutHistory, useRetryPayout, PayoutPayload } from '@/hooks/use-payout';
import { Card, CardHeader, CardTitle, CardContent, Badge, Table, Th, Td, Tr, WalletCard, EmptyState, Skeleton } from '@/components/ui';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import { AlertCircle, ArrowUpCircle, CheckCircle2, ChevronLeft, ChevronRight, Loader2, RefreshCw, Search } from 'lucide-react';

type Mode = 'IMPS' | 'NEFT' | 'UPI';
const statusVariant = (s: string): any => ({ SUCCESS: 'success', FAILED: 'danger', PENDING: 'warning', INITIATED: 'info', REVERSED: 'neutral' }[s] || 'neutral');
const modeLabel: Record<Mode, string> = { IMPS: 'Instant (IMPS) ~30s', NEFT: 'NEFT 2-4 hours', UPI: 'UPI ~30s' };

export default function PayOutPage() {
  const { data: wallet } = useWallet();
  const initiate = useInitiatePayout();
  const verifyUpi = useVerifyUpi();
  const retry = useRetryPayout();
  const [page, setPage] = useState(1);
  const { data: historyData, isLoading } = usePayOutHistory(page);

  const [form, setForm] = useState<PayoutPayload>({
    amount: 0, mode: 'IMPS', beneficiaryName: '',
    accountNumber: '', ifscCode: '', bankName: '', upiId: '', remarks: '',
  });
  const [upiVerified, setUpiVerified] = useState<{ valid: boolean; name: string | null } | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const set = (k: keyof PayoutPayload) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: k === 'amount' ? parseFloat(e.target.value) || 0 : e.target.value }));

  const handleVerifyUpi = async () => {
    if (!form.upiId) return;
    const res = await verifyUpi.mutateAsync(form.upiId);
    setUpiVerified(res);
    if (res.name) setForm(f => ({ ...f, beneficiaryName: res.name! }));
  };

  const handleSubmit = async () => {
    const payload: PayoutPayload = { ...form };
    if (form.mode !== 'UPI') { delete payload.upiId; }
    else { delete payload.accountNumber; delete payload.ifscCode; delete payload.bankName; }
    await initiate.mutateAsync(payload);
    setSubmitted(true);
    setForm({ amount: 0, mode: 'IMPS', beneficiaryName: '', accountNumber: '', ifscCode: '', bankName: '', upiId: '', remarks: '' });
    setUpiVerified(null);
    setTimeout(() => setSubmitted(false), 5000);
  };

  const transactions = historyData?.data ?? [];
  const meta = historyData?.meta ?? { total: 0, totalPages: 1 };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Form */}
        <div className="space-y-4">
          {wallet && <WalletCard primary={wallet.primaryBalance} secondary={wallet.secondaryBalance} hold={wallet.holdBalance} />}
          <Card>
            <CardHeader><CardTitle>Send Money</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {submitted && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-success/10 border border-success/20 animate-fade-in">
                  <CheckCircle2 className="w-4 h-4 text-success flex-shrink-0" />
                  <p className="text-sm text-success font-medium">Payout initiated successfully!</p>
                </div>
              )}
              {initiate.error && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-danger/10 border border-danger/20">
                  <AlertCircle className="w-4 h-4 text-danger flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-danger">{(initiate.error as any)?.response?.data?.error?.message || 'Payout failed'}</p>
                </div>
              )}

              {/* Mode */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Transfer Mode</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['IMPS', 'NEFT', 'UPI'] as Mode[]).map((m) => (
                    <button key={m} type="button" onClick={() => { setForm(f => ({ ...f, mode: m })); setUpiVerified(null); }}
                      className={cn('py-2.5 rounded-lg text-xs font-semibold border transition-all',
                        form.mode === m ? 'bg-brand-600 text-white border-brand-600' : 'bg-surface-850 text-slate-400 border-white/[0.06] hover:border-brand-500/40')}>
                      {m}
                    </button>
                  ))}
                </div>
                <p className="text-2xs text-slate-600 mt-1">{modeLabel[form.mode as Mode]}</p>
              </div>

              {/* Amount */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Amount (INR)</label>
                <input type="number" value={form.amount || ''} onChange={set('amount')}
                  className="input text-lg font-semibold" placeholder="0" min={1} max={200000} />
                {wallet && form.amount > 0 && form.amount > wallet.primaryBalance && (
                  <p className="text-2xs text-danger mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />Insufficient balance</p>
                )}
              </div>

              {/* UPI mode */}
              {form.mode === 'UPI' && (
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">UPI ID</label>
                  <div className="flex gap-2">
                    <input type="text" value={form.upiId} onChange={set('upiId')}
                      className="input flex-1" placeholder="name@upi" />
                    <button onClick={handleVerifyUpi} disabled={!form.upiId || verifyUpi.isPending}
                      className="btn-secondary px-3 whitespace-nowrap disabled:opacity-50">
                      {verifyUpi.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  {upiVerified && (
                    <div className={cn('mt-2 p-2 rounded-lg text-xs flex items-center gap-2',
                      upiVerified.valid ? 'bg-success/10 border border-success/20 text-success' : 'bg-danger/10 border border-danger/20 text-danger')}>
                      {upiVerified.valid ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                      {upiVerified.valid ? `Verified: ${upiVerified.name}` : 'Invalid UPI ID'}
                    </div>
                  )}
                </div>
              )}

              {/* Bank mode */}
              {form.mode !== 'UPI' && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">Account Number</label>
                    <input type="text" value={form.accountNumber} onChange={set('accountNumber')} className="input font-mono" placeholder="12345678901234" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">IFSC Code</label>
                    <input type="text" value={form.ifscCode} onChange={(e) => setForm(f => ({ ...f, ifscCode: e.target.value.toUpperCase() }))}
                      className="input font-mono" placeholder="SBIN0001234" maxLength={11} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">Bank Name</label>
                    <input type="text" value={form.bankName} onChange={set('bankName')} className="input" placeholder="State Bank of India" />
                  </div>
                </>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Beneficiary Name</label>
                <input type="text" value={form.beneficiaryName} onChange={set('beneficiaryName')} className="input" placeholder="Full name as per bank" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Remarks <span className="text-slate-600">(optional)</span></label>
                <input type="text" value={form.remarks} onChange={set('remarks')} className="input" placeholder="Purpose of transfer" />
              </div>

              <button onClick={handleSubmit}
                disabled={initiate.isPending || !form.amount || !form.beneficiaryName || (form.mode === 'UPI' ? !form.upiId : (!form.accountNumber || !form.ifscCode)) || (wallet ? form.amount > wallet.primaryBalance : false)}
                className="btn-primary w-full justify-center py-3 disabled:opacity-40 disabled:cursor-not-allowed">
                {initiate.isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</> : <><ArrowUpCircle className="w-4 h-4" /> Send {form.amount > 0 ? formatCurrency(form.amount) : ''}</>}
              </button>
            </CardContent>
          </Card>
        </div>

        {/* History */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader><CardTitle>Pay-Out History</CardTitle><span className="text-xs text-slate-500">{meta.total} total</span></CardHeader>
            <Table>
              <thead><tr className="border-b border-white/[0.06]"><Th>Date</Th><Th>Beneficiary</Th><Th>Mode</Th><Th>Status</Th><Th className="text-right">Amount</Th><Th>{''}</Th></tr></thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => <Tr key={i}>{Array.from({length:6}).map((_,j) => <Td key={j}><Skeleton className="h-4 w-16"/></Td>)}</Tr>)
                ) : transactions.length === 0 ? (
                  <tr><td colSpan={6}><EmptyState icon={<ArrowUpCircle className="w-8 h-8"/>} title="No payouts yet" description="Send money via IMPS, NEFT, or UPI"/></td></tr>
                ) : transactions.map((t: any) => (
                  <Tr key={t.id}>
                    <Td className="text-xs text-slate-500 whitespace-nowrap">{formatDate(t.createdAt)}</Td>
                    <Td>
                      <p className="text-xs font-medium text-slate-200">{t.beneficiaryName}</p>
                      <p className="text-2xs text-slate-600 font-mono">{t.upiId || t.accountNumber?.slice(-4)?.padStart(8, '•')}</p>
                    </Td>
                    <Td><span className="text-2xs px-2 py-0.5 rounded bg-surface-700 text-slate-400 font-medium">{t.payoutMode}</span></Td>
                    <Td>
                      <Badge variant={statusVariant(t.status)}>{t.status}</Badge>
                      {t.failureReason && <p className="text-2xs text-danger mt-0.5 max-w-[120px] truncate">{t.failureReason}</p>}
                    </Td>
                    <Td className="text-right font-semibold text-sm text-danger">-{formatCurrency(t.amount)}</Td>
                    <Td>
                      {t.status === 'FAILED' && (
                        <button onClick={() => retry.mutate(t.id)} disabled={retry.isPending}
                          className="text-2xs px-2 py-1 rounded bg-warning/10 text-warning hover:bg-warning/20 transition-colors flex items-center gap-1">
                          <RefreshCw className="w-3 h-3" /> Retry
                        </button>
                      )}
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
            {meta.totalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-white/[0.06]">
                <p className="text-xs text-slate-500">Page {page} of {meta.totalPages}</p>
                <div className="flex gap-2">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-ghost px-2 py-1.5 disabled:opacity-30"><ChevronLeft className="w-4 h-4"/></button>
                  <button onClick={() => setPage(p => Math.min(meta.totalPages, p + 1))} disabled={page >= meta.totalPages} className="btn-ghost px-2 py-1.5 disabled:opacity-30"><ChevronRight className="w-4 h-4"/></button>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
