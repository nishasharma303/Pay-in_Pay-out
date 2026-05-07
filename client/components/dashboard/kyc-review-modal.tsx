'use client';
import { useState } from 'react';
import { useKycDetail, useReviewKyc } from '@/hooks/use-kyc';
import { Badge, Spinner } from '@/components/ui';
import { cn, formatDate } from '@/lib/utils';
import { CheckCircle2, ExternalLink, Loader2, X, XCircle } from 'lucide-react';

interface KycReviewModalProps {
  kycId: string;
  onClose: () => void;
}

export function KycReviewModal({ kycId, onClose }: KycReviewModalProps) {
  const { data: kyc, isLoading } = useKycDetail(kycId);
  const review = useReviewKyc();
  const [note, setNote] = useState('');
  const [action, setAction] = useState<'APPROVED' | 'REJECTED' | null>(null);

  const handleReview = async () => {
    if (!action) return;
    await review.mutateAsync({ id: kycId, status: action, reviewNote: note || undefined });
    onClose();
  };

  return (
    /* Backdrop */
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-surface-900 border border-white/[0.08] rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
          <h2 className="text-base font-semibold text-white">KYC Review</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/[0.05] text-slate-400 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16"><Spinner className="w-6 h-6" /></div>
        ) : kyc ? (
          <div className="p-6 space-y-5">
            {/* User info */}
            <div className="flex items-center gap-3 p-4 rounded-xl bg-surface-800 border border-white/[0.06]">
              <div className="w-10 h-10 rounded-full bg-brand-gradient flex items-center justify-center text-sm font-semibold text-white flex-shrink-0">
                {kyc.user?.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
              </div>
              <div className="flex-1">
                <p className="font-medium text-sm text-white">{kyc.user?.name}</p>
                <p className="text-xs text-slate-500">{kyc.user?.email} · {kyc.user?.phone}</p>
              </div>
              <Badge variant={kyc.status === 'APPROVED' ? 'success' : kyc.status === 'REJECTED' ? 'danger' : 'warning'}>
                {kyc.status}
              </Badge>
            </div>

            {/* Details grid */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'PAN Number', value: kyc.panNumber, mono: true },
                { label: 'Aadhaar (masked)', value: kyc.aadhaarNumber, mono: true },
                { label: 'Account Holder', value: kyc.accountHolder },
                { label: 'Bank Name', value: kyc.bankName },
                { label: 'Account Number', value: kyc.accountNumber, mono: true },
                { label: 'IFSC Code', value: kyc.ifscCode, mono: true },
              ].map((field) => (
                <div key={field.label} className="p-3 rounded-lg bg-surface-800 border border-white/[0.06]">
                  <p className="text-2xs text-slate-500 uppercase tracking-wider mb-0.5">{field.label}</p>
                  <p className={cn('text-sm text-slate-200', field.mono && 'font-mono')}>{field.value || '—'}</p>
                </div>
              ))}
            </div>

            {/* Documents */}
            <div>
              <p className="text-xs font-medium text-slate-400 mb-2">Documents</p>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: 'PAN', url: kyc.panImageUrl },
                  { label: 'Aadhaar Front', url: kyc.aadhaarFrontUrl },
                  { label: 'Aadhaar Back', url: kyc.aadhaarBackUrl },
                  { label: 'Selfie', url: kyc.selfieUrl },
                ].map((doc) => (
                  <div key={doc.label}>
                    {doc.url ? (
                      <a href={doc.url} target="_blank" rel="noreferrer"
                        className="group relative block aspect-video rounded-lg overflow-hidden bg-surface-700 border border-white/[0.06] hover:border-brand-500/50 transition-all">
                        <img src={doc.url} alt={doc.label} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <ExternalLink className="w-4 h-4 text-white" />
                        </div>
                      </a>
                    ) : (
                      <div className="aspect-video rounded-lg bg-surface-700 border border-white/[0.06] flex items-center justify-center">
                        <span className="text-2xs text-slate-600">Not uploaded</span>
                      </div>
                    )}
                    <p className="text-2xs text-slate-500 mt-1 text-center">{doc.label}</p>
                  </div>
                ))}
              </div>
            </div>

            <p className="text-2xs text-slate-600">Submitted: {formatDate(kyc.createdAt)}</p>

            {/* Review actions (only for pending) */}
            {kyc.status === 'PENDING' && (
              <div className="border-t border-white/[0.06] pt-4 space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">
                    Review Note <span className="text-slate-600">(optional)</span>
                  </label>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="input resize-none h-20 text-xs"
                    placeholder="Reason for rejection, or any note for the agent..."
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setAction('REJECTED')}
                    className={cn('flex-1 btn-danger', action === 'REJECTED' && 'ring-2 ring-danger/50')}
                  >
                    <XCircle className="w-4 h-4" /> Reject
                  </button>
                  <button
                    type="button"
                    onClick={() => setAction('APPROVED')}
                    className={cn(
                      'flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all',
                      'bg-success/10 hover:bg-success/20 text-success border border-success/20',
                      action === 'APPROVED' && 'ring-2 ring-success/50'
                    )}
                  >
                    <CheckCircle2 className="w-4 h-4" /> Approve
                  </button>
                </div>

                {action && (
                  <button
                    onClick={handleReview}
                    disabled={review.isPending}
                    className={cn(
                      'w-full btn-primary justify-center',
                      action === 'REJECTED' && 'bg-danger hover:bg-danger/90',
                      review.isPending && 'opacity-70 cursor-not-allowed'
                    )}
                  >
                    {review.isPending ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</>
                    ) : (
                      `Confirm ${action === 'APPROVED' ? 'Approval' : 'Rejection'}`
                    )}
                  </button>
                )}

                {review.error && (
                  <p className="text-xs text-danger">
                    {(review.error as any)?.response?.data?.error?.message || 'Review failed'}
                  </p>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="py-16 text-center text-slate-500 text-sm">KYC not found</div>
        )}
      </div>
    </div>
  );
}
