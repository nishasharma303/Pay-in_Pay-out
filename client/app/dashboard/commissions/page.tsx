'use client';
import { useState } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { useMyCommissions, useCommissionRules, useCommissionReport, useUpsertRule, useToggleRule, CommissionRule } from '@/hooks/use-payout';
import { Card, CardHeader, CardTitle, CardContent, Badge, Table, Th, Td, Tr, EmptyState, Skeleton, StatCard } from '@/components/ui';
import { formatCurrency, formatDate, cn, ROLE_LABELS, ROLE_COLORS } from '@/lib/utils';
import { ChevronLeft, ChevronRight, Percent, Plus, ToggleLeft, ToggleRight } from 'lucide-react';

const SERVICE_TYPES = ['AEPS', 'BBPS', 'DMT', 'RECHARGE', 'PAN', 'INSURANCE', 'IMPS', 'NEFT', 'UPI'];
const ROLES = ['SUPER_ADMIN', 'ADMIN', 'CLIENT', 'AGENT'];

export default function CommissionsPage() {
  const { user } = useAuthStore();
  const isAdmin = ['SUPER_ADMIN', 'ADMIN'].includes(user?.role || '');
  const [page, setPage] = useState(1);
  const [activeTab, setActiveTab] = useState<'earned' | 'rules' | 'report'>('earned');

  const { data: myCommData, isLoading: myLoading } = useMyCommissions(page);
  const { data: rules, isLoading: rulesLoading } = useCommissionRules();
  const { data: report } = useCommissionReport();
  const upsert = useUpsertRule();
  const toggle = useToggleRule();

  const commissions = myCommData?.data?.commissions ?? [];
  const totalEarned = myCommData?.data?.totalEarned ?? 0;
  const meta = myCommData?.meta ?? { total: 0, totalPages: 1 };

  // Rule form state
  const [ruleForm, setRuleForm] = useState({ role: 'AGENT', serviceType: 'AEPS', isPercentage: true, value: 0.5, isActive: true });
  const [showForm, setShowForm] = useState(false);

  const handleSaveRule = async () => {
    await upsert.mutateAsync(ruleForm as any);
    setShowForm(false);
  };

  const tabs = [
    { key: 'earned', label: 'My Earnings' },
    ...(isAdmin ? [{ key: 'rules', label: 'Commission Rules' }, { key: 'report', label: 'Report' }] : []),
  ];

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Earned" value={formatCurrency(totalEarned)} deltaType="up" delta="All time" icon={<Percent className="w-4 h-4 text-success" />} iconBg="bg-success/10" />
        <StatCard label="Transactions" value={String(meta.total)} deltaType="neutral" delta="With commission" />
        {report && <>
          <StatCard label="Total Distributed" value={formatCurrency(report.totalPaid)} deltaType="neutral" delta="All roles" />
          <StatCard label="Transactions" value={String(report.totalTransactions)} deltaType="neutral" delta="Commissioned" />
        </>}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-surface-800 border border-white/[0.06] rounded-xl w-fit">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setActiveTab(t.key as any)}
            className={cn('px-4 py-1.5 rounded-lg text-xs font-medium transition-all',
              activeTab === t.key ? 'bg-brand-600 text-white' : 'text-slate-400 hover:text-slate-200')}>
            {t.label}
          </button>
        ))}
      </div>

      {/* My Earnings */}
      {activeTab === 'earned' && (
        <Card>
          <CardHeader><CardTitle>Commission Earnings</CardTitle></CardHeader>
          <Table>
            <thead><tr className="border-b border-white/[0.06]"><Th>Date</Th><Th>Service</Th><Th>Role</Th><Th>Tx Amount</Th><Th className="text-right">Commission</Th></tr></thead>
            <tbody>
              {myLoading ? Array.from({length:5}).map((_,i) => <Tr key={i}>{Array.from({length:5}).map((_,j) => <Td key={j}><Skeleton className="h-4 w-20"/></Td>)}</Tr>) :
              commissions.length === 0 ? <tr><td colSpan={5}><EmptyState icon={<Percent className="w-8 h-8"/>} title="No commissions yet" description="Commissions are earned on completed transactions"/></td></tr> :
              commissions.map((c: any) => (
                <Tr key={c.id}>
                  <Td className="text-xs text-slate-500 whitespace-nowrap">{formatDate(c.createdAt)}</Td>
                  <Td><span className="text-2xs px-2 py-0.5 rounded bg-surface-700 text-slate-300 font-medium">{(c.metadata as any)?.serviceType || 'GENERAL'}</span></Td>
                  <Td><span className={cn('text-xs px-2 py-0.5 rounded font-medium', ROLE_COLORS[c.role])}>{ROLE_LABELS[c.role]}</span></Td>
                  <Td className="text-xs text-slate-400">{c.transaction ? formatCurrency(c.transaction.amount) : '—'}</Td>
                  <Td className="text-right font-semibold text-sm text-success">+{formatCurrency(c.amount)}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
          {meta.totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-white/[0.06]">
              <p className="text-xs text-slate-500">Page {page} of {meta.totalPages}</p>
              <div className="flex gap-2">
                <button onClick={() => setPage(p => Math.max(1,p-1))} disabled={page===1} className="btn-ghost px-2 py-1.5 disabled:opacity-30"><ChevronLeft className="w-4 h-4"/></button>
                <button onClick={() => setPage(p => Math.min(meta.totalPages,p+1))} disabled={page>=meta.totalPages} className="btn-ghost px-2 py-1.5 disabled:opacity-30"><ChevronRight className="w-4 h-4"/></button>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Rules Tab (admin only) */}
      {activeTab === 'rules' && isAdmin && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => setShowForm(s => !s)} className="btn-primary">
              <Plus className="w-4 h-4" /> {showForm ? 'Cancel' : 'Add Rule'}
            </button>
          </div>

          {showForm && (
            <Card>
              <CardHeader><CardTitle>New Commission Rule</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">Role</label>
                    <select value={ruleForm.role} onChange={e => setRuleForm(f => ({...f, role: e.target.value}))} className="input">
                      {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">Service Type</label>
                    <select value={ruleForm.serviceType} onChange={e => setRuleForm(f => ({...f, serviceType: e.target.value}))} className="input">
                      {SERVICE_TYPES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">Type</label>
                    <select value={ruleForm.isPercentage ? 'pct' : 'flat'} onChange={e => setRuleForm(f => ({...f, isPercentage: e.target.value === 'pct'}))} className="input">
                      <option value="pct">Percentage (%)</option>
                      <option value="flat">Flat (₹)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">Value {ruleForm.isPercentage ? '(%)' : '(₹)'}</label>
                    <input type="number" value={ruleForm.value} onChange={e => setRuleForm(f => ({...f, value: parseFloat(e.target.value) || 0}))}
                      className="input" step={ruleForm.isPercentage ? '0.01' : '1'} min="0" max={ruleForm.isPercentage ? '100' : '10000'} />
                  </div>
                </div>
                <button onClick={handleSaveRule} disabled={upsert.isPending} className="btn-primary disabled:opacity-50">
                  Save Rule
                </button>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader><CardTitle>Active Rules</CardTitle></CardHeader>
            <Table>
              <thead><tr className="border-b border-white/[0.06]"><Th>Role</Th><Th>Service</Th><Th>Type</Th><Th>Value</Th><Th>Status</Th><Th>Action</Th></tr></thead>
              <tbody>
                {rulesLoading ? Array.from({length:6}).map((_,i) => <Tr key={i}>{Array.from({length:6}).map((_,j) => <Td key={j}><Skeleton className="h-4 w-16"/></Td>)}</Tr>) :
                (rules ?? []).map((rule: CommissionRule) => (
                  <Tr key={rule.id}>
                    <Td><span className={cn('text-xs px-2 py-0.5 rounded font-medium', ROLE_COLORS[rule.role])}>{ROLE_LABELS[rule.role]}</span></Td>
                    <Td><span className="text-xs text-slate-300 font-medium">{rule.serviceType}</span></Td>
                    <Td><Badge variant="neutral">{rule.isPercentage ? 'Percentage' : 'Flat'}</Badge></Td>
                    <Td className="font-semibold text-sm text-slate-200">{rule.isPercentage ? `${rule.value}%` : formatCurrency(rule.value)}</Td>
                    <Td><Badge variant={rule.isActive ? 'success' : 'neutral'}>{rule.isActive ? 'Active' : 'Inactive'}</Badge></Td>
                    <Td>
                      <button onClick={() => toggle.mutate(rule.id)} className="text-slate-400 hover:text-slate-200 transition-colors">
                        {rule.isActive ? <ToggleRight className="w-5 h-5 text-success"/> : <ToggleLeft className="w-5 h-5"/>}
                      </button>
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          </Card>
        </div>
      )}

      {/* Report Tab */}
      {activeTab === 'report' && isAdmin && report && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card>
            <CardHeader><CardTitle>By Role</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {report.byRole.map((r: any) => (
                <div key={r.role} className="flex items-center justify-between">
                  <span className={cn('text-xs px-2 py-0.5 rounded font-medium', ROLE_COLORS[r.role])}>{ROLE_LABELS[r.role]}</span>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-success">{formatCurrency(r.total)}</p>
                    <p className="text-2xs text-slate-500">{r.count} transactions</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Summary</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-2xs text-slate-500 uppercase tracking-wider mb-1">Total Distributed</p>
                <p className="text-2xl font-bold text-success">{formatCurrency(report.totalPaid)}</p>
              </div>
              <div>
                <p className="text-2xs text-slate-500 uppercase tracking-wider mb-1">Transactions</p>
                <p className="text-xl font-bold text-slate-200">{report.totalTransactions}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
