'use client';
import { useState } from 'react';
import { useMyKyc, useSubmitKyc } from '@/hooks/use-kyc';
import { FileUpload } from '@/components/ui/file-upload';
import { Card, CardHeader, CardTitle, CardContent, Badge, Skeleton } from '@/components/ui';
import { cn, formatDate } from '@/lib/utils';
import {
  AlertCircle, CheckCircle2, Clock, FileText,
  Loader2, ShieldCheck, XCircle,
} from 'lucide-react';

const STEPS = ['Personal & PAN', 'Aadhaar', 'Bank Details', 'Selfie & Submit'];

const statusConfig = {
  PENDING: {
    icon: Clock,
    color: 'text-warning',
    bg: 'bg-warning/10 border-warning/20',
    label: 'Under Review',
    desc: 'Your KYC submission is being reviewed by our team. This usually takes 1–2 business days.',
  },
  APPROVED: {
    icon: CheckCircle2,
    color: 'text-success',
    bg: 'bg-success/10 border-success/20',
    label: 'Verified',
    desc: 'Your KYC is approved. Your account is now fully verified.',
  },
  REJECTED: {
    icon: XCircle,
    color: 'text-danger',
    bg: 'bg-danger/10 border-danger/20',
    label: 'Rejected',
    desc: 'Your KYC was rejected. Please review the note below and resubmit.',
  },
};

export default function KycPage() {
  const { data: kyc, isLoading } = useMyKyc();
  const submitKyc = useSubmitKyc();

  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    panNumber: '',
    aadhaarNumber: '',
    bankName: '',
    accountNumber: '',
    ifscCode: '',
    accountHolder: '',
  });
  const [files, setFiles] = useState<Record<string, File | null>>({
    panImage: null,
    aadhaarFront: null,
    aadhaarBack: null,
    selfie: null,
  });

  const setField = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value.toUpperCase() }));

  const setFile = (k: string) => (file: File | null) =>
    setFiles((f) => ({ ...f, [k]: file }));

  const handleSubmit = async () => {
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => { if (v) fd.append(k, v); });
    Object.entries(files).forEach(([k, v]) => { if (v) fd.append(k, v); });
    submitKyc.mutate(fd);
  };

  const canNext = () => {
    if (step === 0) return form.panNumber.length === 10 && !!files.panImage;
    if (step === 1) return form.aadhaarNumber.length === 12 && !!files.aadhaarFront && !!files.aadhaarBack;
    if (step === 2) return form.bankName && form.accountNumber && form.ifscCode && form.accountHolder;
    return true;
  };

  // ─── Already submitted — show status ─────────────────────────────────────
  if (isLoading) {
    return (
      <div className="max-w-2xl space-y-4">
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (kyc && kyc.status !== 'REJECTED') {
    const cfg = statusConfig[kyc.status];
    const Icon = cfg.icon;
    return (
      <div className="max-w-2xl space-y-5">
        <div className={cn('flex items-start gap-4 p-5 rounded-xl border', cfg.bg)}>
          <Icon className={cn('w-6 h-6 flex-shrink-0 mt-0.5', cfg.color)} />
          <div>
            <p className={cn('font-semibold text-sm', cfg.color)}>{cfg.label}</p>
            <p className="text-xs text-slate-400 mt-1">{cfg.desc}</p>
            {kyc.reviewNote && (
              <p className="text-xs text-danger mt-2 bg-danger/10 px-3 py-2 rounded-lg">
                <span className="font-medium">Note: </span>{kyc.reviewNote}
              </p>
            )}
          </div>
        </div>

        <Card>
          <CardHeader><CardTitle>Submitted Information</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'PAN Number', value: kyc.panNumber },
                { label: 'Aadhaar', value: kyc.aadhaarNumber },
                { label: 'Bank Name', value: kyc.bankName },
                { label: 'Account Number', value: kyc.accountNumber },
                { label: 'IFSC Code', value: kyc.ifscCode },
                { label: 'Account Holder', value: kyc.accountHolder },
              ].map((row) => (
                <div key={row.label}>
                  <p className="text-2xs text-slate-500 uppercase tracking-wider">{row.label}</p>
                  <p className="text-sm font-medium text-slate-200 mt-0.5 font-mono">{row.value || '—'}</p>
                </div>
              ))}
            </div>

            {/* Document thumbnails */}
            <div>
              <p className="text-2xs text-slate-500 uppercase tracking-wider mb-2">Documents</p>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: 'PAN', url: kyc.panImageUrl },
                  { label: 'Aadhaar Front', url: kyc.aadhaarFrontUrl },
                  { label: 'Aadhaar Back', url: kyc.aadhaarBackUrl },
                  { label: 'Selfie', url: kyc.selfieUrl },
                ].map((doc) => (
                  <div key={doc.label} className="text-center">
                    {doc.url ? (
                      <a href={doc.url} target="_blank" rel="noreferrer"
                        className="block w-full aspect-video rounded-lg overflow-hidden bg-surface-700 border border-white/[0.06] hover:border-brand-500/40 transition-colors">
                        <img src={doc.url} alt={doc.label} className="w-full h-full object-cover" />
                      </a>
                    ) : (
                      <div className="w-full aspect-video rounded-lg bg-surface-700 border border-white/[0.06] flex items-center justify-center">
                        <FileText className="w-5 h-5 text-slate-600" />
                      </div>
                    )}
                    <p className="text-2xs text-slate-500 mt-1">{doc.label}</p>
                  </div>
                ))}
              </div>
            </div>

            <p className="text-2xs text-slate-600">
              Submitted: {formatDate(kyc.createdAt)}
              {kyc.reviewedAt && ` · Reviewed: ${formatDate(kyc.reviewedAt)}`}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ─── Not submitted or rejected — show form ────────────────────────────────
  return (
    <div className="max-w-2xl space-y-5">
      {/* Rejection notice */}
      {kyc?.status === 'REJECTED' && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-danger/10 border border-danger/20">
          <XCircle className="w-5 h-5 text-danger flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-danger">Previous submission rejected</p>
            {kyc.reviewNote && <p className="text-xs text-slate-400 mt-1">{kyc.reviewNote}</p>}
            <p className="text-xs text-slate-500 mt-1">Please correct the issues and resubmit.</p>
          </div>
        </div>
      )}

      {/* Success message */}
      {submitKyc.isSuccess && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-success/10 border border-success/20">
          <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0" />
          <p className="text-sm text-success">KYC submitted successfully! Under review.</p>
        </div>
      )}

      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2 flex-1">
            <div className={cn(
              'w-6 h-6 rounded-full flex items-center justify-center text-2xs font-semibold flex-shrink-0 transition-all',
              i < step ? 'bg-success text-white' :
              i === step ? 'bg-brand-600 text-white' :
              'bg-surface-700 text-slate-500'
            )}>
              {i < step ? '✓' : i + 1}
            </div>
            <span className={cn('text-xs hidden sm:block', i === step ? 'text-slate-200 font-medium' : 'text-slate-500')}>
              {s}
            </span>
            {i < STEPS.length - 1 && (
              <div className={cn('h-px flex-1 transition-all', i < step ? 'bg-success/40' : 'bg-surface-700')} />
            )}
          </div>
        ))}
      </div>

      <Card>
        {/* Step 0: PAN */}
        {step === 0 && (
          <>
            <CardHeader><CardTitle>PAN Card Details</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  PAN Number <span className="text-danger">*</span>
                </label>
                <input
                  value={form.panNumber}
                  onChange={setField('panNumber')}
                  className="input font-mono tracking-widest"
                  placeholder="ABCDE1234F"
                  maxLength={10}
                />
                {form.panNumber && !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(form.panNumber) && (
                  <p className="text-2xs text-danger mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> Invalid format — must be like ABCDE1234F
                  </p>
                )}
              </div>
              <FileUpload
                label="PAN Card Image"
                name="panImage"
                required
                value={files.panImage}
                onChange={setFile('panImage')}
                hint="Clear photo of your PAN card"
              />
            </CardContent>
          </>
        )}

        {/* Step 1: Aadhaar */}
        {step === 1 && (
          <>
            <CardHeader><CardTitle>Aadhaar Card</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  Aadhaar Number <span className="text-danger">*</span>
                </label>
                <input
                  value={form.aadhaarNumber}
                  onChange={(e) => setForm(f => ({ ...f, aadhaarNumber: e.target.value.replace(/\D/g, '') }))}
                  className="input font-mono tracking-widest"
                  placeholder="123456789012"
                  maxLength={12}
                  type="tel"
                />
                <p className="text-2xs text-slate-600 mt-1">
                  Will be masked — only last 4 digits stored
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <FileUpload label="Aadhaar Front" name="aadhaarFront" required value={files.aadhaarFront} onChange={setFile('aadhaarFront')} hint="Front side with photo" />
                <FileUpload label="Aadhaar Back" name="aadhaarBack" required value={files.aadhaarBack} onChange={setFile('aadhaarBack')} hint="Back side with address" />
              </div>
            </CardContent>
          </>
        )}

        {/* Step 2: Bank */}
        {step === 2 && (
          <>
            <CardHeader><CardTitle>Bank Account Details</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {[
                { key: 'accountHolder', label: 'Account Holder Name', placeholder: 'As per bank records', upper: false },
                { key: 'bankName', label: 'Bank Name', placeholder: 'State Bank of India', upper: false },
                { key: 'accountNumber', label: 'Account Number', placeholder: '12345678901234', upper: false },
                { key: 'ifscCode', label: 'IFSC Code', placeholder: 'SBIN0001234', upper: true },
              ].map((field) => (
                <div key={field.key}>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">
                    {field.label} <span className="text-danger">*</span>
                  </label>
                  <input
                    value={form[field.key as keyof typeof form]}
                    onChange={(e) => {
                      const val = field.upper ? e.target.value.toUpperCase() : e.target.value;
                      setForm(f => ({ ...f, [field.key]: val }));
                    }}
                    className={cn('input', (field.key === 'accountNumber' || field.key === 'ifscCode') && 'font-mono')}
                    placeholder={field.placeholder}
                  />
                </div>
              ))}
            </CardContent>
          </>
        )}

        {/* Step 3: Selfie */}
        {step === 3 && (
          <>
            <CardHeader><CardTitle>Selfie Verification</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="p-3 rounded-lg bg-surface-850 border border-white/[0.06] text-xs text-slate-400 space-y-1.5">
                <p className="font-medium text-slate-300">Selfie guidelines:</p>
                <p>• Face clearly visible, no sunglasses or mask</p>
                <p>• Good lighting — not too dark or backlit</p>
                <p>• Hold your PAN card next to your face</p>
                <p>• Plain or simple background preferred</p>
              </div>
              <FileUpload label="Selfie with PAN Card" name="selfie" required value={files.selfie} onChange={setFile('selfie')} hint="Hold your PAN card beside your face" />

              {/* Summary */}
              <div className="pt-2 border-t border-white/[0.06]">
                <p className="text-xs font-medium text-slate-400 mb-3">Submission Summary</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                  {[
                    { label: 'PAN', value: form.panNumber || '—' },
                    { label: 'Aadhaar', value: form.aadhaarNumber ? '••••••••' + form.aadhaarNumber.slice(-4) : '—' },
                    { label: 'Bank', value: form.bankName || '—' },
                    { label: 'IFSC', value: form.ifscCode || '—' },
                  ].map((r) => (
                    <div key={r.label}>
                      <p className="text-2xs text-slate-600">{r.label}</p>
                      <p className="text-xs font-mono text-slate-300">{r.value}</p>
                    </div>
                  ))}
                </div>
                <div className="flex gap-4 mt-3">
                  {[
                    { label: 'PAN Image', ok: !!files.panImage },
                    { label: 'Aadhaar', ok: !!(files.aadhaarFront && files.aadhaarBack) },
                    { label: 'Selfie', ok: !!files.selfie },
                  ].map((d) => (
                    <div key={d.label} className={cn('flex items-center gap-1 text-2xs', d.ok ? 'text-success' : 'text-danger')}>
                      {d.ok ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                      {d.label}
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-white/[0.06]">
          <button
            type="button"
            onClick={() => setStep(s => s - 1)}
            disabled={step === 0}
            className="btn-ghost disabled:opacity-30"
          >
            ← Back
          </button>
          {step < STEPS.length - 1 ? (
            <button
              type="button"
              onClick={() => setStep(s => s + 1)}
              disabled={!canNext()}
              className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Continue →
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitKyc.isPending || !files.selfie}
              className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {submitKyc.isPending ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</>
              ) : (
                <><ShieldCheck className="w-4 h-4" /> Submit KYC</>
              )}
            </button>
          )}
        </div>
      </Card>

      {submitKyc.error && (
        <div className="p-3 rounded-lg bg-danger/10 border border-danger/20 text-danger text-sm">
          {(submitKyc.error as any)?.response?.data?.error?.message || 'Submission failed. Try again.'}
        </div>
      )}
    </div>
  );
}
