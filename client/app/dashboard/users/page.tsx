'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card, CardHeader, CardTitle, Badge, Table, Th, Td, Tr, EmptyState, Skeleton } from '@/components/ui';
import { formatCurrency, formatDate, ROLE_LABELS, ROLE_COLORS, cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth.store';
import { CreateAgentModal } from '@/components/dashboard/create-agent-modal';
import { ChevronLeft, ChevronRight, Search, UserPlus, Users, UserCheck, UserX } from 'lucide-react';

export default function UsersPage() {
  const { user } = useAuthStore();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [showCreateAgent, setShowCreateAgent] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['users', page, search, roleFilter],
    queryFn: async () => {
      const { data } = await api.get('/users', {
        params: { page, limit: 15, search: search || undefined, role: roleFilter || undefined },
      });
      return data;
    },
  });

  const users: any[] = data?.data ?? [];
  const meta = data?.meta ?? { total: 0, totalPages: 1 };

  const kycBadge = (status?: string) => {
    if (!status) return <Badge variant="neutral">Not submitted</Badge>;
    const map: Record<string, any> = { PENDING: 'warning', APPROVED: 'success', REJECTED: 'danger' };
    return <Badge variant={map[status] || 'neutral'}>{status}</Badge>;
  };

  return (
    <>
      <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Users', value: meta.total, icon: <Users className="w-4 h-4 text-brand-400" />, bg: 'bg-brand-500/10' },
          { label: 'KYC Pending', value: '—', icon: <UserCheck className="w-4 h-4 text-warning" />, bg: 'bg-warning/10' },
          { label: 'Inactive', value: '—', icon: <UserX className="w-4 h-4 text-danger" />, bg: 'bg-danger/10' },
        ].map((s) => (
          <Card key={s.label} className="p-4 flex items-center gap-3">
            <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0', s.bg)}>{s.icon}</div>
            <div>
              <p className="text-2xs text-slate-500 uppercase tracking-wider">{s.label}</p>
              <p className="text-lg font-bold text-white">{s.value}</p>
            </div>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Users</CardTitle>
          <div className="flex items-center gap-2">
            {user?.role === 'CLIENT' && (
              <button onClick={() => setShowCreateAgent(true)} className="btn-primary py-1.5">
                <UserPlus className="w-4 h-4 mr-2" />
                Create Agent
              </button>
            )}
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
              <input
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="input pl-8 py-1.5 w-48 text-xs"
                placeholder="Search name, email..."
              />
            </div>
            {/* Role filter */}
            <select
              value={roleFilter}
              onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
              className="input py-1.5 text-xs w-36"
            >
              <option value="">All roles</option>
              <option value="ADMIN">Admin</option>
              <option value="CLIENT">Client</option>
              <option value="AGENT">Agent</option>
            </select>
          </div>
        </CardHeader>

        <Table>
          <thead>
            <tr className="border-b border-white/[0.06]">
              <Th>User</Th>
              <Th>Role</Th>
              <Th>KYC</Th>
              <Th>Balance</Th>
              <Th>Status</Th>
              <Th>Joined</Th>
              <Th>Actions</Th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <Tr key={i}>{Array.from({ length: 7 }).map((__, j) => <Td key={j}><Skeleton className="h-4 w-20" /></Td>)}</Tr>
              ))
            ) : users.length === 0 ? (
              <tr><td colSpan={7}><EmptyState icon={<Users className="w-8 h-8" />} title="No users found" /></td></tr>
            ) : (
              users.map((u) => (
                <Tr key={u.id}>
                  <Td>
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-brand-gradient flex items-center justify-center text-2xs font-semibold text-white flex-shrink-0">
                        {u.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
                      </div>
                      <div>
                        <p className="text-xs font-medium text-slate-200">{u.name}</p>
                        <p className="text-2xs text-slate-600">{u.email}</p>
                      </div>
                    </div>
                  </Td>
                  <Td>
                    <span className={cn('text-xs px-2 py-0.5 rounded font-medium', ROLE_COLORS[u.role])}>
                      {ROLE_LABELS[u.role]}
                    </span>
                  </Td>
                  <Td>{kycBadge(u.kyc?.status)}</Td>
                  <Td className="font-mono text-xs">
                    {u.wallet ? formatCurrency(u.wallet.primaryBalance) : '—'}
                  </Td>
                  <Td>
                    <Badge variant={u.isActive ? 'success' : 'danger'}>
                      {u.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </Td>
                  <Td className="text-xs text-slate-500">{formatDate(u.createdAt)}</Td>
                  <Td>
                    <div className="flex gap-1">
                      {u.kyc?.status === 'PENDING' && (
                        <button className="text-2xs px-2 py-1 rounded bg-success/10 text-success hover:bg-success/20 transition-colors">
                          Approve
                        </button>
                      )}
                      <button className="text-2xs px-2 py-1 rounded bg-surface-700 text-slate-400 hover:text-slate-200 transition-colors">
                        View
                      </button>
                    </div>
                  </Td>
                </Tr>
              ))
            )}
          </tbody>
        </Table>

        {meta.totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-white/[0.06]">
            <p className="text-xs text-slate-500">Page {page} of {meta.totalPages} · {meta.total} users</p>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-ghost px-2 py-1.5 disabled:opacity-30">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button onClick={() => setPage(p => Math.min(meta.totalPages, p + 1))} disabled={page >= meta.totalPages} className="btn-ghost px-2 py-1.5 disabled:opacity-30">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </Card>
    </div>

    <CreateAgentModal isOpen={showCreateAgent} onClose={() => setShowCreateAgent(false)} />
    </>
  );
}
