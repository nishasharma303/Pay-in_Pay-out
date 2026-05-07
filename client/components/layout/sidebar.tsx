'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, ArrowDownCircle, ArrowUpCircle, BookOpen, Users, Percent, Grid3x3, ShieldCheck, Settings, Zap, LogOut, ChevronRight, Wallet, FileCheck, Crown, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth.store';
import { useLogout } from '@/hooks/use-auth';

// Role labels and colors for light theme
const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Admin',
  CLIENT: 'Client',
  AGENT: 'Agent',
};

const ROLE_COLORS: Record<string, string> = {
  SUPER_ADMIN: 'text-purple-700 bg-purple-50 border border-purple-200',
  ADMIN: 'text-brand-700 bg-brand-50 border border-brand-200',
  CLIENT: 'text-emerald-700 bg-emerald-50 border border-emerald-200',
  AGENT: 'text-amber-700 bg-amber-50 border border-amber-200',
};

// Define nav item types
interface NavLink {
  label: string;
  href: string;
  icon: LucideIcon;
  roles?: string[];
}

interface NavSection {
  section: string;
  items: NavLink[];
}

type NavItem = NavLink | NavSection;

const NAV: NavItem[] = [
  { label: 'Overview', href: '/dashboard/overview', icon: LayoutDashboard },
  {
    section: 'Transactions',
    items: [
      { label: 'Pay-In',  href: '/dashboard/pay-in',  icon: ArrowDownCircle },
      { label: 'Pay-Out', href: '/dashboard/pay-out', icon: ArrowUpCircle },
      { label: 'Ledger',  href: '/dashboard/ledger',  icon: BookOpen },
      { label: 'Wallet',  href: '/dashboard/wallet',  icon: Wallet },
    ],
  },
  {
    section: 'Account',
    items: [
      { label: 'My KYC',      href: '/dashboard/kyc',        icon: FileCheck },
      { label: 'Commissions', href: '/dashboard/commissions', icon: Percent },
    ],
  },
  {
    section: 'Management',
    items: [
      { label: 'Users',      href: '/dashboard/users',     icon: Users,       roles: ['SUPER_ADMIN','ADMIN','CLIENT'] },
      { label: 'KYC Review', href: '/dashboard/kyc/admin', icon: ShieldCheck, roles: ['SUPER_ADMIN','ADMIN'] },
      { label: 'Services',   href: '/dashboard/services',  icon: Grid3x3 },
    ],
  },
  {
    section: 'Admin',
    items: [
      { label: 'Admin Panel',  href: '/dashboard/admin',       icon: ShieldCheck, roles: ['SUPER_ADMIN','ADMIN'] },
      { label: 'Super Admin',  href: '/dashboard/super-admin', icon: Crown,       roles: ['SUPER_ADMIN'] },
      { label: 'Settings',     href: '/dashboard/settings',    icon: Settings },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const logout = useLogout();
  const initials = user?.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0,2) || 'U';

  // Helper function to check if a nav link is active
  const isActive = (href: string) => {
    if (href === '/dashboard/kyc') {
      return pathname === href;
    }
    return pathname === href || (pathname.startsWith(href) && href !== '/dashboard');
  };

  return (
    <aside className="w-56 flex-shrink-0 flex flex-col bg-white border-r border-gray-200 h-full shadow-sm">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 py-5 border-b border-gray-100">
        <div className="w-8 h-8 bg-gradient-to-r from-brand-600 to-brand-500 rounded-xl flex items-center justify-center flex-shrink-0">
          <Zap className="w-4 h-4 text-white" />
        </div>
        <div>
          <p className="text-sm font-semibold tracking-tight text-gray-900">PayFlow</p>
          <p className="text-[10px] text-gray-400">Fintech Platform</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
        {NAV.map((item, i) => {
          // Check if it's a direct link (has href property)
          if ('href' in item && typeof item.href === 'string') {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link key={item.href} href={item.href} className={cn('nav-item', active && 'active')}>
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span>{item.label}</span>
                {active && <ChevronRight className="w-3 h-3 ml-auto opacity-40" />}
              </Link>
            );
          }
          
          // It's a section with items
          if ('section' in item && item.items) {
            return (
              <div key={item.section}>
                <p className="px-3 pt-4 pb-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-widest">
                  {item.section}
                </p>
                {item.items
                  .filter(navItem => !navItem.roles || navItem.roles.includes(user?.role || ''))
                  .map(navItem => {
                    const Icon = navItem.icon;
                    const active = isActive(navItem.href);
                    const isSuperAdmin = navItem.href === '/dashboard/super-admin';
                    
                    return (
                      <Link 
                        key={navItem.href} 
                        href={navItem.href} 
                        className={cn('nav-item', active && 'active')}
                      >
                        <Icon className={cn('w-4 h-4 flex-shrink-0', isSuperAdmin && 'text-amber-500')} />
                        <span>{navItem.label}</span>
                        {active && <ChevronRight className="w-3 h-3 ml-auto opacity-40" />}
                      </Link>
                    );
                  })}
              </div>
            );
          }
          
          return null;
        })}
      </nav>

      {/* User footer */}
      <div className="border-t border-gray-100 p-3 space-y-1">
        <div className="flex items-center gap-2.5 px-2 py-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-brand-600 to-brand-500 flex items-center justify-center text-xs font-semibold text-white flex-shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-gray-800 truncate">{user?.name}</p>
            <span className={cn('text-[10px] px-1.5 py-0.5 rounded font-medium', ROLE_COLORS[user?.role || 'AGENT'])}>
              {ROLE_LABELS[user?.role || 'AGENT']}
            </span>
          </div>
        </div>
        <button 
          onClick={() => logout.mutate()} 
          className="nav-item w-full text-gray-400 hover:text-red-600 hover:bg-red-50"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign out</span>
        </button>
      </div>
    </aside>
  );
}