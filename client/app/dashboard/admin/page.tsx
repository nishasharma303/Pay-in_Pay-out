'use client';
import { useState } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { useAdminStats, useAuditLogs, useTxReport, useSystemHealth } from '@/hooks/use-admin';
import { Card, CardHeader, CardTitle, CardContent, Badge, Table, Th, Td, Tr, StatCard, EmptyState, Skeleton } from '@/components/ui';
import { formatCurrency, formatDate, cn, ROLE_LABELS, ROLE_COLORS } from '@/lib/utils';
import { Activity, AlertTriangle, BookOpen, CheckCircle2, ChevronLeft, ChevronRight, Database, RefreshCw, TrendingUp, Users, Zap } from 'lucide-react';

const TX_TYPE_COLOR: Record<string, string> = {
  PAY_IN: 'text-success', PAY_OUT: 'text-danger', COMMISSION: 'text-brand-400',
  WALLET_TRANSFER: 'text-warning', REFUND: 'text-info',
};

export default function AdminPage() {
  const { user } = useAuthStore();
  const { data: stats, isLoading: statsLoading, refetch } = useAdminStats();
  const { data: health } = useSystemHealth();
  const { data: report } = useTxReport();
  const [auditPage, setAuditPage] = useState(1);
  const { data: auditData, isLoading: auditLoading } = useAuditLogs(auditPage);
  const [activeTab, setActiveTab] = useState<'overview' | 'transactions' | 'audit'>('overview');

  const auditLogs = auditData?.data ?? [];
  const auditMeta = auditData?.meta ?? { total: 0, totalPages: 1 };

  const tabs = [
    { key: 'overview', label: 'Overview', icon: <Activity className="w-3.5 h-3.5" /> },
    { key: 'transactions', label: 'Transactions', icon: <TrendingUp className="w-3.5 h-3.5" /> },
    { key: 'audit', label: 'Audit Log', icon: <BookOpen className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="space-y-5">
      {/* Tab bar */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1 p-1 bg-surface-800 border border-white/[0.06] rounded-xl">
          {tabs.map((t) => (
            <button key={t.key} onClick={() => setActiveTab(t.key as any)}
              className={cn('flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-medium transition-all',
                activeTab === t.key ? 'bg-brand-600 text-white' : 'text-slate-400 hover:text-slate-200')}>
              {t.icon}{t.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          {health && (
            <div className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium',
              health.status === 'healthy' ? 'bg-success/10 border-success/20 text-success' : 'bg-warning/10 border-warning/20 text-warning')}>
              {health.status === 'healthy' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
              System {health.status} · {health.latency}ms
            </div>
          )}
          <button onClick={() => refetch()} className="btn-ghost py-1.5"><RefreshCw className="w-4 h-4" /></button>
        </div>
      </div>

      {/* Overview tab */}
      {activeTab === 'overview' && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Total Users" value={statsLoading ? '…' : String(stats?.users?.total ?? 0)} deltaType="neutral"
              icon={<Users className="w-4 h-4 text-brand-400" />} iconBg="bg-brand-500/10" loading={statsLoading} />
            <StatCard label="Today's Volume" value={statsLoading ? '…' : formatCurrency(stats?.transactions?.todayVolume ?? 0)} deltaType="up"
              delta={`${stats?.transactions?.todayCount ?? 0} transactions`}
              icon={<Zap className="w-4 h-4 text-success" />} iconBg="bg-success/10" loading={statsLoading} />
            <StatCard label="Month Volume" value={statsLoading ? '…' : formatCurrency(stats?.transactions?.monthVolume ?? 0)}
              delta={`${stats?.transactions?.volumeChange > 0 ? '+' : ''}${stats?.transactions?.volumeChange ?? 0}% vs last month`}
              deltaType={stats?.transactions?.volumeChange >= 0 ? 'up' : 'down'}
              icon={<TrendingUp className="w-4 h-4 text-warning" />} iconBg="bg-warning/10" loading={statsLoading} />
            <StatCard label="KYC Pending" value={statsLoading ? '…' : String(stats?.kyc?.pending ?? 0)} deltaType="neutral"
              delta={`${stats?.kyc?.approved ?? 0} approved`}
              icon={<Database className="w-4 h-4 text-purple-400" />} iconBg="bg-purple-400/10" loading={statsLoading} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Chart */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader><CardTitle>Daily Volume — Last 30 Days</CardTitle></CardHeader>
                <CardContent>
                  {statsLoading ? <Skeleton className="h-40 w-full" /> : stats?.chart?.daily ? (
                    <div className="flex items-end gap-0.5 h-40 w-full">
                      {stats.chart.daily.slice(-21).map((d: any) => {
                        const maxVal = Math.max(...stats.chart.daily.map((x: any) => Math.max(x.credit, x.debit)), 1);
                        return (
                          <div key={d.date} className="flex-1 flex flex-col items-center gap-0 group" title={`${d.date}\nCredit: ₹${d.credit.toLocaleString()}\nDebit: ₹${d.debit.toLocaleString()}`}>
                            <div className="w-full flex flex-col justify-end gap-px" style={{ height: '152px' }}>
                              <div className="w-full bg-success/50 hover:bg-success rounded-t-sm transition-colors"
                                style={{ height: `${(d.credit / maxVal) * 100}%`, minHeight: d.credit > 0 ? '2px' : '0' }} />
                              <div className="w-full bg-danger/50 hover:bg-danger rounded-t-sm transition-colors"
                                style={{ height: `${(d.debit / maxVal) * 100}%`, minHeight: d.debit > 0 ? '2px' : '0' }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : <EmptyState title="No data yet" />}
                  <div className="flex gap-4 mt-3">
                    <div className="flex items-center gap-1.5 text-xs text-slate-400"><div className="w-2.5 h-2.5 rounded-full bg-success" />Pay-In</div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-400"><div className="w-2.5 h-2.5 rounded-full bg-danger" />Pay-Out</div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right column */}
            <div className="space-y-4">
              {/* Users by role */}
              <Card>
                <CardHeader><CardTitle>Users by Role</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {stats?.users?.byRole?.map((r: any) => (
                    <div key={r.role} className="flex items-center justify-between">
                      <span className={cn('text-xs px-2 py-0.5 rounded font-medium', ROLE_COLORS[r.role])}>{ROLE_LABELS[r.role]}</span>
                      <span className="font-semibold text-sm text-slate-200">{r.count}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* System health */}
              {health && (
                <Card>
                  <CardHeader><CardTitle>System Health</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    {[
                      { label: 'Database', ok: health.db },
                      { label: 'Pending payouts', value: health.pendingPayouts },
                      { label: 'Failed payouts', value: health.failedPayouts, danger: health.failedPayouts > 0 },
                      { label: 'Response', value: `${health.latency}ms` },
                    ].map((item) => (
                      <div key={item.label} className="flex items-center justify-between text-sm">
                        <span className="text-slate-500 text-xs">{item.label}</span>
                        {'ok' in item ? (
                          <Badge variant={item.ok ? 'success' : 'danger'}>{item.ok ? 'OK' : 'Error'}</Badge>
                        ) : (
                          <span className={cn('font-semibold text-xs', (item as any).danger ? 'text-danger' : 'text-slate-200')}>
                            {item.value}
                          </span>
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {/* Recent transactions */}
          {stats?.recent && stats.recent.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Recent Transactions</CardTitle></CardHeader>
              <Table>
                <thead><tr className="border-b border-white/[0.06]"><Th>User</Th><Th>Type</Th><Th>Status</Th><Th>Date</Th><Th className="text-right">Amount</Th></tr></thead>
                <tbody>
                  {stats.recent.map((t: any) => (
                    <Tr key={t.id}>
                      <Td>
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-brand-gradient flex items-center justify-center text-2xs font-bold text-white flex-shrink-0">
                            {t.user?.name?.[0] ?? '?'}
                          </div>
                          <div>
                            <p className="text-xs text-slate-200">{t.user?.name ?? 'Unknown'}</p>
                            <span className={cn('text-2xs px-1.5 py-0.5 rounded font-medium', ROLE_COLORS[t.user?.role ?? 'AGENT'])}>{ROLE_LABELS[t.user?.role ?? 'AGENT']}</span>
                          </div>
                        </div>
                      </Td>
                      <Td><span className={cn('text-xs font-medium', TX_TYPE_COLOR[t.type])}>{t.type.replace('_', ' ')}</span></Td>
                      <Td><Badge variant="success">SUCCESS</Badge></Td>
                      <Td className="text-xs text-slate-500">{formatDate(t.createdAt)}</Td>
                      <Td className="text-right font-semibold text-sm">{formatCurrency(t.amount)}</Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            </Card>
          )}
        </>
      )}

      {/* Transactions tab */}
      {activeTab === 'transactions' && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {report?.byType?.map((t: any) => (
            <Card key={t.type} className="p-5">
              <p className={cn('text-xs font-semibold uppercase tracking-wider mb-2', TX_TYPE_COLOR[t.type])}>{t.type.replace('_', ' ')}</p>
              <p className="text-xl font-bold text-white">{formatCurrency(t.amount)}</p>
              <p className="text-xs text-slate-500 mt-1">{t.count} transactions</p>
            </Card>
          ))}
          {report && (
            <Card className="p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Total Volume</p>
              <p className="text-xl font-bold text-white">{formatCurrency(report.total?.amount ?? 0)}</p>
              <p className="text-xs text-slate-500 mt-1">{report.total?.count} successful transactions</p>
            </Card>
          )}
        </div>
      )}

      {/* Audit log tab */}
      {activeTab === 'audit' && (
        <Card>
          <CardHeader><CardTitle>Audit Log</CardTitle><span className="text-xs text-slate-500">{auditMeta.total} entries</span></CardHeader>
          <Table>
            <thead><tr className="border-b border-white/[0.06]"><Th>Date</Th><Th>Action</Th><Th>User</Th><Th>Entity</Th></tr></thead>
            <tbody>
              {auditLoading ? Array.from({length:8}).map((_,i) => <Tr key={i}>{Array.from({length:4}).map((_,j) => <Td key={j}><Skeleton className="h-4 w-24"/></Td>)}</Tr>) :
              auditLogs.length === 0 ? <tr><td colSpan={4}><EmptyState title="No audit logs" /></td></tr> :
              auditLogs.map((log: any) => (
                <Tr key={log.id}>
                  <Td className="text-xs text-slate-500 whitespace-nowrap">{formatDate(log.createdAt)}</Td>
                  <Td>
                    <span className={cn('text-2xs px-2 py-0.5 rounded font-mono font-medium',
                      log.action.includes('APPROVED') ? 'bg-success/10 text-success' :
                      log.action.includes('FAILED') || log.action.includes('REJECTED') ? 'bg-danger/10 text-danger' :
                      'bg-surface-700 text-slate-300')}>
                      {log.action}
                    </span>
                  </Td>
                  <Td>
                    {log.user ? (
                      <div>
                        <p className="text-xs text-slate-200">{log.user.name}</p>
                        <span className={cn('text-2xs', ROLE_COLORS[log.user.role])}>{ROLE_LABELS[log.user.role]}</span>
                      </div>
                    ) : <span className="text-slate-600 text-xs">System</span>}
                  </Td>
                  <Td className="text-xs text-slate-500">{log.entity ?? '—'} {log.entityId ? `#${log.entityId.slice(-6)}` : ''}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
          {auditMeta.totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-white/[0.06]">
              <p className="text-xs text-slate-500">Page {auditPage} of {auditMeta.totalPages}</p>
              <div className="flex gap-2">
                <button onClick={() => setAuditPage(p => Math.max(1, p-1))} disabled={auditPage===1} className="btn-ghost px-2 py-1.5 disabled:opacity-30"><ChevronLeft className="w-4 h-4"/></button>
                <button onClick={() => setAuditPage(p => Math.min(auditMeta.totalPages, p+1))} disabled={auditPage>=auditMeta.totalPages} className="btn-ghost px-2 py-1.5 disabled:opacity-30"><ChevronRight className="w-4 h-4"/></button>
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
