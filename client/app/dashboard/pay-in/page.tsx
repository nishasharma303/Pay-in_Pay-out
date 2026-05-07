'use client';
import { useState } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { useWallet } from '@/hooks/use-auth';
import { useCreatePayInOrder, useConfirmPayment, usePayInHistory } from '@/hooks/use-transactions';
import { loadRazorpay, openRazorpay } from '@/lib/razorpay';
import { Card, CardHeader, CardTitle, CardContent, Badge, Table, Th, Td, Tr, WalletCard, EmptyState, Skeleton } from '@/components/ui';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import { AlertCircle, ArrowDownCircle, CheckCircle2, ChevronLeft, ChevronRight, CreditCard, IndianRupee, Loader2, Smartphone, Zap } from 'lucide-react';

const QUICK_AMOUNTS = [500, 1000, 2000, 5000, 10000];
const statusVariant = (s: string): any => ({ SUCCESS: 'success', FAILED: 'danger', PENDING: 'warning', INITIATED: 'neutral' }[s] || 'neutral');

export default function PayInPage() {
  const { user } = useAuthStore();
  const { data: wallet, refetch: refetchWallet } = useWallet();
  const createOrder    = useCreatePayInOrder();
  const confirmPayment = useConfirmPayment();
  const [page, setPage] = useState(1);
  const { data: historyData, isLoading: historyLoading, refetch: refetchHistory } = usePayInHistory(page);

  const [amount, setAmount]           = useState('');
  const [description, setDescription] = useState('');
  const [paymentState, setPaymentState] = useState<'idle' | 'loading' | 'success' | 'failed'>('idle');
  const [errorMsg, setErrorMsg]       = useState('');
  const [lastAmount, setLastAmount]   = useState(0);

  const transactions = historyData?.data ?? [];
  const meta         = historyData?.meta ?? { total: 0, totalPages: 1 };

  const handlePay = async () => {
    const amt = parseFloat(amount);
    if (!amt || amt < 1) return;

    setPaymentState('loading');
    setErrorMsg('');

    try {
      // 1. Load Razorpay script
      const loaded = await loadRazorpay();
      if (!loaded) {
        setErrorMsg('Could not load Razorpay. Check your internet connection.');
        setPaymentState('failed');
        return;
      }

      // 2. Create order on backend
      const { order } = await createOrder.mutateAsync({ amount: amt, description });

      // 3. Open Razorpay checkout
      openRazorpay({
        key:         order.keyId!,
        amount:      order.amount,
        currency:    order.currency,
        order_id:    order.id,
        name:        'PayFlow',
        description: description || 'Wallet Top-Up',
        prefill: { name: user?.name, email: user?.email, contact: user?.phone },
        theme: { color: '#2563eb' },

        handler: async (response) => {
          // Payment done on Razorpay side — now confirm on our backend
          try {
            await confirmPayment.mutateAsync({
              orderId:   response.razorpay_order_id,
              paymentId: response.razorpay_payment_id,
              signature: response.razorpay_signature,
            });
            setLastAmount(amt);
            setPaymentState('success');
            setAmount('');
            setDescription('');
            refetchWallet();
            refetchHistory();
          } catch (err: any) {
            // Show actual server error
            const msg = err?.response?.data?.error?.message || err?.message || 'Payment confirmation failed';
            setErrorMsg(msg);
            setPaymentState('failed');
            console.error('[Confirm Error]', err?.response?.data);
          }
        },

        modal: {
          ondismiss: () => {
            // User closed modal — not an error
            setPaymentState('idle');
          },
        },
      });
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || err?.message || 'Failed to initiate payment';
      setErrorMsg(msg);
      setPaymentState('failed');
      console.error('[Create Order Error]', err?.response?.data);
    }
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Form */}
        <div className="space-y-4">
          {wallet && (
            <WalletCard
              primary={wallet.primaryBalance}
              secondary={wallet.secondaryBalance}
              hold={wallet.holdBalance}
            />
          )}

          <Card>
            <CardHeader>
              <CardTitle>Add Money</CardTitle>
              <div className="flex items-center gap-1.5 text-2xs text-gray-400">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Razorpay secured
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Success */}
              {paymentState === 'success' && (
                <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-50 border border-emerald-200 animate-fade-in">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-emerald-700">Payment successful!</p>
                    <p className="text-xs text-emerald-600">{formatCurrency(lastAmount)} added to your wallet</p>
                  </div>
                </div>
              )}

              {/* Error */}
              {paymentState === 'failed' && errorMsg && (
                <div className="flex items-start gap-3 p-3 rounded-xl bg-red-50 border border-red-200">
                  <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-red-700">Payment failed</p>
                    <p className="text-xs text-red-600 mt-0.5">{errorMsg}</p>
                  </div>
                </div>
              )}

              {/* Amount */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Amount (INR)</label>
                <div className="relative">
                  <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="input pl-9 text-lg font-semibold"
                    placeholder="0"
                    min={1}
                    max={500000}
                  />
                </div>
                {parseFloat(amount) > 0 && (
                  <p className="text-2xs text-gray-400 mt-1">
                    = {formatCurrency(parseFloat(amount))}
                  </p>
                )}
              </div>

              {/* Quick amounts */}
              <div>
                <p className="text-2xs text-gray-400 mb-2">Quick select</p>
                <div className="grid grid-cols-3 gap-2">
                  {QUICK_AMOUNTS.map((a) => (
                    <button
                      key={a}
                      type="button"
                      onClick={() => setAmount(String(a))}
                      className={cn(
                        'py-2 rounded-lg text-xs font-medium border transition-all',
                        amount === String(a)
                          ? 'bg-brand-600 text-white border-brand-600'
                          : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-brand-400 hover:bg-brand-50'
                      )}
                    >
                      {a >= 1000 ? `₹${a / 1000}K` : `₹${a}`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                  Description <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="input text-sm"
                  placeholder="e.g. Monthly top-up"
                  maxLength={100}
                />
              </div>

              {/* Pay button */}
              <button
                onClick={handlePay}
                disabled={!amount || parseFloat(amount) < 1 || paymentState === 'loading'}
                className="btn-primary w-full justify-center text-base py-3 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {paymentState === 'loading' ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Opening checkout...</>
                ) : (
                  <><Zap className="w-4 h-4" /> Pay {amount ? formatCurrency(parseFloat(amount)) : 'Now'}</>
                )}
              </button>

              {/* Retry button after failure */}
              {paymentState === 'failed' && (
                <button
                  onClick={() => { setPaymentState('idle'); setErrorMsg(''); }}
                  className="btn-secondary w-full justify-center"
                >
                  Try again
                </button>
              )}

              {/* Payment methods */}
              <div className="flex items-center justify-center gap-5 pt-1">
                {[
                  { icon: <Smartphone className="w-3.5 h-3.5" />, label: 'UPI' },
                  { icon: <CreditCard className="w-3.5 h-3.5" />, label: 'Card' },
                  { icon: <ArrowDownCircle className="w-3.5 h-3.5" />, label: 'Net Banking' },
                ].map((m) => (
                  <div key={m.label} className="flex items-center gap-1 text-2xs text-gray-400">
                    {m.icon} {m.label}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* History */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Pay-In History</CardTitle>
              <span className="text-xs text-gray-400">{meta.total} total</span>
            </CardHeader>
            <Table>
              <thead>
                <tr className="border-b border-gray-100">
                  <Th>Date</Th>
                  <Th>Description</Th>
                  <Th>Reference</Th>
                  <Th>Status</Th>
                  <Th className="text-right">Amount</Th>
                </tr>
              </thead>
              <tbody>
                {historyLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <Tr key={i}>
                      {Array.from({ length: 5 }).map((__, j) => (
                        <Td key={j}><Skeleton className="h-4 w-20" /></Td>
                      ))}
                    </Tr>
                  ))
                ) : transactions.length === 0 ? (
                  <tr>
                    <td colSpan={5}>
                      <EmptyState
                        icon={<ArrowDownCircle className="w-8 h-8" />}
                        title="No Pay-In transactions yet"
                        description="Add money via UPI, Card, or Net Banking"
                      />
                    </td>
                  </tr>
                ) : (
                  transactions.map((t: any) => (
                    <Tr key={t.id}>
                      <Td className="text-xs text-gray-500 whitespace-nowrap">{formatDate(t.createdAt)}</Td>
                      <Td>
                        <p className="text-xs text-gray-700">{t.description || 'Pay-In'}</p>
                      </Td>
                      <Td>
                        <div className="space-y-0.5">
                          {t.gatewayPaymentId && (
                            <p className="text-2xs font-mono text-gray-500 truncate max-w-[120px]">
                              {t.gatewayPaymentId}
                            </p>
                          )}
                          {t.gatewayOrderId && (
                            <p className="text-2xs font-mono text-gray-400 truncate max-w-[120px]">
                              {t.gatewayOrderId}
                            </p>
                          )}
                        </div>
                      </Td>
                      <Td><Badge variant={statusVariant(t.status)}>{t.status}</Badge></Td>
                      <Td className="text-right">
                        <span className={cn('font-semibold text-sm',
                          t.status === 'SUCCESS' ? 'text-emerald-600' : 'text-gray-400')}>
                          +{formatCurrency(t.amount)}
                        </span>
                      </Td>
                    </Tr>
                  ))
                )}
              </tbody>
            </Table>

            {meta.totalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
                <p className="text-xs text-gray-400">Page {page} of {meta.totalPages}</p>
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
      </div>
    </div>
  );
}