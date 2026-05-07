import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

export function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('bg-white border border-gray-200 rounded-xl shadow-card', className)}>{children}</div>;
}

export function CardHeader({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('flex items-center justify-between px-5 py-4 border-b border-gray-100', className)}>{children}</div>;
}

export function CardTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-sm font-semibold text-gray-900">{children}</h3>;
}

export function CardContent({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('p-5', className)}>{children}</div>;
}

interface StatCardProps {
  label: string;
  value: string;
  delta?: string;
  deltaType?: 'up' | 'down' | 'neutral';
  icon?: React.ReactNode;
  iconBg?: string;
  loading?: boolean;
}

export function StatCard({ label, value, delta, deltaType = 'neutral', icon, iconBg, loading }: StatCardProps) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{label}</p>
        {icon && <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', iconBg || 'bg-gray-100')}>{icon}</div>}
      </div>
      {loading ? <div className="h-7 w-24 bg-gray-100 rounded animate-pulse" /> : (
        <p className="text-2xl font-bold tracking-tight text-gray-900">{value}</p>
      )}
      {delta && (
        <p className={cn('mt-1.5 text-xs flex items-center gap-1',
          deltaType === 'up' ? 'text-emerald-600' : deltaType === 'down' ? 'text-red-600' : 'text-gray-400')}>
          {deltaType === 'up' ? '↑' : deltaType === 'down' ? '↓' : '•'} {delta}
        </p>
      )}
    </Card>
  );
}

type BadgeVariant = 'success' | 'danger' | 'warning' | 'info' | 'neutral';

export function Badge({ children, variant = 'neutral' }: { children: React.ReactNode; variant?: BadgeVariant }) {
  return <span className={cn('badge-' + variant, 'inline-flex items-center')}>{children}</span>;
}

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn('w-4 h-4 animate-spin text-gray-400', className)} />;
}

export function EmptyState({ icon, title, description }: { icon?: React.ReactNode; title: string; description?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {icon && <div className="mb-4 text-gray-300">{icon}</div>}
      <p className="text-sm font-medium text-gray-500">{title}</p>
      {description && <p className="text-xs text-gray-400 mt-1 max-w-xs">{description}</p>}
    </div>
  );
}

export function Table({ children }: { children: React.ReactNode }) {
  return <div className="overflow-x-auto"><table className="w-full">{children}</table></div>;
}

export function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return <th className={cn('px-4 py-3 text-left text-2xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-50', className)}>{children}</th>;
}

export function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={cn('px-4 py-3.5 text-sm text-gray-700', className)}>{children}</td>;
}

export function Tr({ children, className }: { children: React.ReactNode; className?: string }) {
  return <tr className={cn('border-b border-gray-100 hover:bg-gray-50 transition-colors', className)}>{children}</tr>;
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('bg-gray-100 rounded animate-pulse', className)} />;
}

export function WalletCard({ primary, secondary, hold }: { primary: number; secondary: number; hold?: number }) {
  const fmt = (n: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(n);
  return (
    <div className="relative overflow-hidden rounded-xl bg-wallet-gradient border border-blue-700 p-5">
      <div className="absolute -top-8 -right-8 w-32 h-32 bg-white/10 rounded-full pointer-events-none" />
      <div className="absolute -bottom-10 right-8 w-24 h-24 bg-white/5 rounded-full pointer-events-none" />
      <p className="text-xs text-blue-200 uppercase tracking-wider mb-1 relative">Primary Balance</p>
      <p className="text-3xl font-bold tracking-tight text-white mb-4 relative">{fmt(primary)}</p>
      <div className="flex gap-5 border-t border-white/20 pt-3.5 relative">
        <div><p className="text-2xs text-blue-200">Secondary</p><p className="text-sm font-semibold text-white">{fmt(secondary)}</p></div>
        {hold !== undefined && (<div><p className="text-2xs text-blue-200">On Hold</p><p className="text-sm font-semibold text-white">{fmt(hold)}</p></div>)}
      </div>
    </div>
  );
}
