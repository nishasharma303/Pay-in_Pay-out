'use client';
import { useState } from 'react';
import { useWallet } from '@/hooks/use-auth';
import { useProcessService, useServiceHistory } from '@/hooks/use-services';
import {
  Card, CardHeader, CardTitle, CardContent,
  Badge, Table, Th, Td, Tr, EmptyState, Skeleton,
} from '@/components/ui';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import {
  AlertCircle, ArrowRight, CheckCircle2,
  ChevronLeft, ChevronRight, History,
  Loader2, Search, X,
} from 'lucide-react';

// ─── All services ─────────────────────────────────────────────────────────────
const SERVICES = [
  // Bills
  { id: 'RECHARGE',    label: 'Mobile Recharge',  icon: '📱', cat: 'Bills',     comm: '0.5%', fields: ['mobile','operatorCode','amount'] },
  { id: 'DTH',         label: 'DTH Recharge',      icon: '📺', cat: 'Bills',     comm: '0.5%', fields: ['mobile','operatorCode','amount'] },
  { id: 'ELECTRICITY', label: 'Electricity Bill',  icon: '💡', cat: 'Bills',     comm: '₹3',   fields: ['billerName','consumerNumber','amount'] },
  { id: 'WATER',       label: 'Water Bill',        icon: '💧', cat: 'Bills',     comm: '₹3',   fields: ['billerName','consumerNumber','amount'] },
  { id: 'GAS',         label: 'Gas Bill',          icon: '🔥', cat: 'Bills',     comm: '₹3',   fields: ['billerName','consumerNumber','amount'] },
  { id: 'BBPS',        label: 'BBPS Bill Pay',     icon: '⚡', cat: 'Bills',     comm: '₹3',   fields: ['billerName','consumerNumber','amount'] },
  { id: 'FASTAG',      label: 'FASTag Recharge',   icon: '🛣️', cat: 'Bills',     comm: '0.3%', fields: ['consumerNumber','amount'] },
  { id: 'CC_BILL',     label: 'Credit Card Bill',  icon: '💳', cat: 'Bills',     comm: '₹5',   fields: ['billerName','consumerNumber','amount'] },
  // Banking
  { id: 'DMT',         label: 'Money Transfer',    icon: '💸', cat: 'Banking',   comm: '0.2%', fields: ['mobile','beneficiaryName','accountNumber','ifscCode','amount'] },
  { id: 'AEPS',        label: 'AEPS Cash',         icon: '🏧', cat: 'Banking',   comm: '0.5%', fields: ['mobile','amount'] },
  // Finance
  { id: 'EDUCATION',   label: 'Education Fee',     icon: '🎓', cat: 'Finance',   comm: '₹10',  fields: ['billerName','consumerNumber','amount'] },
  { id: 'INSURANCE',   label: 'Insurance',         icon: '🛡️', cat: 'Insurance', comm: '2%',   fields: ['billerName','consumerNumber','amount'] },
  // Travel
  { id: 'BUS',         label: 'Bus Booking',       icon: '🚌', cat: 'Travel',    comm: '₹20',  fields: ['remarks','amount'] },
  { id: 'FLIGHT',      label: 'Flight Booking',    icon: '✈️', cat: 'Travel',    comm: '₹150', fields: ['remarks','amount'] },
  { id: 'RAIL',        label: 'Rail Ticket',       icon: '🚆', cat: 'Travel',    comm: '₹20',  fields: ['consumerNumber','amount'] },
  { id: 'HOTEL',       label: 'Hotel Booking',     icon: '🏨', cat: 'Travel',    comm: '1.5%', fields: ['remarks','amount'] },
];

const CATS = ['All', 'Bills', 'Banking', 'Finance', 'Insurance', 'Travel'];

const OPERATORS = [
  { code: 'JIO',       label: 'Jio' },
  { code: 'AIRTEL',    label: 'Airtel' },
  { code: 'VI',        label: 'Vi (Vodafone Idea)' },
  { code: 'BSNL',      label: 'BSNL' },
  { code: 'TATASKY',   label: 'Tata Sky' },
  { code: 'DISHTV',    label: 'Dish TV' },
  { code: 'AIRTEL_DTH',label: 'Airtel DTH' },
];

const FIELD_META: Record<string, { label: string; placeholder: string; type?: string }> = {
  mobile:          { label: 'Mobile Number',        placeholder: '10-digit mobile number',   type: 'tel' },
  operatorCode:    { label: 'Operator',             placeholder: 'Select operator' },
  billerName:      { label: 'Biller / Provider',    placeholder: 'e.g. BESCOM, TATA Power' },
  consumerNumber:  { label: 'Consumer / Ref No.',   placeholder: 'As per your bill' },
  beneficiaryName: { label: 'Beneficiary Name',     placeholder: 'Account holder full name' },
  accountNumber:   { label: 'Account Number',       placeholder: 'Bank account number' },
  ifscCode:        { label: 'IFSC Code',            placeholder: 'e.g. SBIN0001234' },
  remarks:         { label: 'Details / Remarks',    placeholder: 'Brief description' },
  amount:          { label: 'Amount (₹)',           placeholder: '0', type: 'number' },
};

// ─── Service Modal ─────────────────────────────────────────────────────────────
function ServiceModal({
  service,
  walletBalance,
  onClose,
}: {
  service: typeof SERVICES[0];
  walletBalance: number;
  onClose: () => void;
}) {
  const process = useProcessService();
  const [form, setForm] = useState<Record<string, string>>({});
  const [done, setDone] = useState<{ amount: number; description: string } | null>(null);
  const [err, setErr] = useState('');

  const set = (k: string) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }));

  const amt = parseFloat(form.amount || '0') || 0;
  const insufficient = amt > walletBalance;
  const canPay = amt >= 1 && !insufficient && !process.isPending &&
    service.fields.filter(f => f !== 'amount').every(f =>
      f === 'operatorCode' ? !!form[f] :
      f === 'ifscCode'     ? /^[A-Z]{4}0[A-Z0-9]{6}$/i.test(form[f] || '') :
      f === 'mobile'       ? /^\d{10}$/.test(form[f] || '') :
      (form[f] || '').trim().length > 0
    );

  const handlePay = async () => {
    setErr('');
    try {
      const payload = {
        serviceType:     service.id,
        amount:          amt,
        mobile:          form.mobile          || undefined,
        operatorCode:    form.operatorCode    || undefined,
        billerName:      form.billerName      || undefined,
        consumerNumber:  form.consumerNumber  || undefined,
        beneficiaryName: form.beneficiaryName || undefined,
        accountNumber:   form.accountNumber   || undefined,
        ifscCode:        form.ifscCode        ? form.ifscCode.toUpperCase() : undefined,
        remarks:         form.remarks         || undefined,
      };
      const res = await process.mutateAsync(payload);
      setDone({ amount: res.amount, description: res.description });
    } catch (e: any) {
      setErr(e?.response?.data?.error?.message || 'Transaction failed. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md animate-slide-up max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{service.icon}</span>
            <div>
              <p className="font-semibold text-gray-900 text-sm">{service.label}</p>
              <p className="text-2xs text-emerald-600">+{service.comm} commission earned</p>
            </div>
          </div>
          <button onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Success state */}
          {done ? (
            <div className="text-center py-6 space-y-3">
              <div className="w-14 h-14 bg-emerald-50 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-7 h-7 text-emerald-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">Payment Successful!</p>
                <p className="text-sm text-gray-500 mt-1">{formatCurrency(done.amount)} paid</p>
                <p className="text-xs text-gray-400 mt-1 max-w-xs mx-auto">{done.description}</p>
              </div>
              <div className="flex gap-2 justify-center pt-2">
                <button onClick={() => { setDone(null); setForm({}); setErr(''); }}
                  className="btn-secondary text-sm">New Transaction</button>
                <button onClick={onClose} className="btn-primary text-sm">Done</button>
              </div>
            </div>
          ) : (
            <>
              {/* Error */}
              {err && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-200">
                  <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">{err}</p>
                </div>
              )}

              {/* Wallet balance */}
              <div className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg">
                <span className="text-xs text-gray-500">Available Balance</span>
                <span className="text-sm font-bold text-emerald-600">{formatCurrency(walletBalance)}</span>
              </div>

              {/* Fields (excluding amount) */}
              {service.fields.filter(f => f !== 'amount').map(key => (
                <div key={key}>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                    {FIELD_META[key]?.label} <span className="text-red-400">*</span>
                  </label>
                  {key === 'operatorCode' ? (
                    <select value={form.operatorCode || ''} onChange={set('operatorCode')} className="input">
                      <option value="">Select operator</option>
                      {OPERATORS.map(op => (
                        <option key={op.code} value={op.code}>{op.label}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={FIELD_META[key]?.type || 'text'}
                      value={form[key] || ''}
                      onChange={set(key)}
                      className={cn('input', key === 'ifscCode' && 'uppercase font-mono')}
                      placeholder={FIELD_META[key]?.placeholder}
                    />
                  )}
                  {/* Inline validation hints */}
                  {key === 'mobile' && form.mobile && !/^\d{10}$/.test(form.mobile) && (
                    <p className="text-2xs text-red-500 mt-1">Enter a valid 10-digit number</p>
                  )}
                  {key === 'ifscCode' && form.ifscCode && !/^[A-Z]{4}0[A-Z0-9]{6}$/i.test(form.ifscCode) && (
                    <p className="text-2xs text-red-500 mt-1">Format: SBIN0001234</p>
                  )}
                </div>
              ))}

              {/* Amount */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                  Amount (₹) <span className="text-red-400">*</span>
                </label>
                <input
                  type="number"
                  value={form.amount || ''}
                  onChange={set('amount')}
                  className="input text-lg font-bold"
                  placeholder="Enter amount"
                  min={1}
                  max={100000}
                />
                {insufficient && (
                  <p className="text-2xs text-red-500 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    Insufficient balance. Add money via Pay-In first.
                  </p>
                )}
                {amt > 0 && !insufficient && (
                  <p className="text-2xs text-gray-400 mt-1">
                    Balance after: {formatCurrency(walletBalance - amt)}
                  </p>
                )}
              </div>

              {/* Pay button */}
              <button
                onClick={handlePay}
                disabled={!canPay}
                className="btn-primary w-full justify-center py-3 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {process.isPending ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</>
                ) : (
                  <><ArrowRight className="w-4 h-4" /> Pay {amt > 0 ? formatCurrency(amt) : ''}</>
                )}
              </button>

              <p className="text-2xs text-center text-gray-400">
                Amount will be debited from your wallet · Commission credited to hierarchy
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function ServicesPage() {
  const { data: wallet } = useWallet();
  const [cat, setCat]       = useState('All');
  const [search, setSearch] = useState('');
  const [active, setActive] = useState<typeof SERVICES[0] | null>(null);
  const [historyPage, setHistoryPage]   = useState(1);
  const [showHistory, setShowHistory]   = useState(false);

  const { data: historyData, isLoading: historyLoading } = useServiceHistory(historyPage);
  const history  = historyData?.data ?? [];
  const histMeta = historyData?.meta ?? { total: 0, totalPages: 1 };

  const filtered = SERVICES.filter(s =>
    (cat === 'All' || s.cat === cat) &&
    (search === '' || s.label.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-5">
      {/* Top strip */}
      <div className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-xl shadow-card">
        <div>
          <p className="text-xs text-gray-500">Wallet Balance</p>
          <p className="text-xl font-bold text-gray-900">
            {wallet ? formatCurrency(wallet.primaryBalance) : '—'}
          </p>
          {wallet && wallet.primaryBalance < 10 && (
            <p className="text-2xs text-amber-600 mt-0.5">
              ⚠️ Low balance — add money via Pay-In
            </p>
          )}
        </div>
        <button
          onClick={() => setShowHistory(s => !s)}
          className={cn('btn-ghost gap-2', showHistory && 'text-brand-600 bg-brand-50')}
        >
          <History className="w-4 h-4" />
          {showHistory ? 'Hide History' : 'Transaction History'}
        </button>
      </div>

      {/* History panel */}
      {showHistory && (
        <Card>
          <CardHeader>
            <CardTitle>Service Transactions</CardTitle>
            <span className="text-xs text-gray-400">{histMeta.total} total</span>
          </CardHeader>
          <Table>
            <thead>
              <tr className="border-b border-gray-100">
                <Th>Date</Th>
                <Th>Description</Th>
                <Th>Status</Th>
                <Th className="text-right">Amount</Th>
              </tr>
            </thead>
            <tbody>
              {historyLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <Tr key={i}>
                    {Array.from({ length: 4 }).map((__, j) => (
                      <Td key={j}><Skeleton className="h-4 w-20" /></Td>
                    ))}
                  </Tr>
                ))
              ) : history.length === 0 ? (
                <tr><td colSpan={4}>
                  <EmptyState
                    title="No service transactions yet"
                    description="Use any service below to get started"
                  />
                </td></tr>
              ) : (
                history.map((t: any) => (
                  <Tr key={t.id}>
                    <Td className="text-xs text-gray-500 whitespace-nowrap">
                      {formatDate(t.createdAt)}
                    </Td>
                    <Td>
                      <p className="text-xs text-gray-700 max-w-[220px] truncate">
                        {t.description}
                      </p>
                    </Td>
                    <Td>
                      <Badge variant={
                        t.status === 'SUCCESS' ? 'success' :
                        t.status === 'FAILED'  ? 'danger'  : 'warning'
                      }>
                        {t.status}
                      </Badge>
                    </Td>
                    <Td className="text-right font-semibold text-sm text-red-600">
                      -{formatCurrency(t.amount)}
                    </Td>
                  </Tr>
                ))
              )}
            </tbody>
          </Table>

          {/* Pagination */}
          {histMeta.totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
              <p className="text-xs text-gray-400">Page {historyPage} of {histMeta.totalPages}</p>
              <div className="flex gap-2">
                <button onClick={() => setHistoryPage(p => Math.max(1, p - 1))}
                  disabled={historyPage === 1} className="btn-ghost px-2 py-1.5 disabled:opacity-30">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button onClick={() => setHistoryPage(p => Math.min(histMeta.totalPages, p + 1))}
                  disabled={historyPage >= histMeta.totalPages} className="btn-ghost px-2 py-1.5 disabled:opacity-30">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Category + search filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex gap-2 flex-wrap flex-1">
          {CATS.map(c => (
            <button key={c} onClick={() => setCat(c)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium border transition-all',
                cat === c
                  ? 'bg-brand-600 text-white border-brand-600'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-brand-400 hover:bg-brand-50'
              )}>
              {c}
              {c !== 'All' && (
                <span className="ml-1 opacity-60">
                  ({SERVICES.filter(s => s.cat === c).length})
                </span>
              )}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input pl-8 py-1.5 text-xs w-full sm:w-48"
            placeholder="Search services..."
          />
        </div>
      </div>

      {/* Services grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        {filtered.map(svc => (
          <button
            key={svc.id}
            onClick={() => setActive(svc)}
            className="bg-white border border-gray-200 rounded-xl p-4 text-left hover:border-brand-400 hover:shadow-card-md transition-all group cursor-pointer"
          >
            <div className="text-2xl mb-2">{svc.icon}</div>
            <p className="text-sm font-semibold text-gray-900 leading-tight">{svc.label}</p>
            <p className="text-2xs text-gray-400 mt-0.5">{svc.cat}</p>
            <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-100">
              <span className="text-2xs text-emerald-600 font-medium">+{svc.comm}</span>
              <span className="text-2xs text-brand-600 group-hover:translate-x-0.5 transition-transform">
                Pay →
              </span>
            </div>
          </button>
        ))}

        {filtered.length === 0 && (
          <div className="col-span-full py-12 text-center">
            <p className="text-4xl mb-3">🔍</p>
            <p className="text-sm text-gray-500">No services match "{search}"</p>
            <button
              onClick={() => { setSearch(''); setCat('All'); }}
              className="btn-ghost mt-2 text-xs"
            >
              Clear filters
            </button>
          </div>
        )}
      </div>

      {/* Modal */}
      {active && (
        <ServiceModal
          service={active}
          walletBalance={wallet?.primaryBalance ?? 0}
          onClose={() => setActive(null)}
        />
      )}
    </div>
  );
}