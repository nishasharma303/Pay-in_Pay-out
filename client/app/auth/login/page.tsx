'use client';
import { useState } from 'react';
import { useLogin } from '@/hooks/use-auth';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { Eye, EyeOff, Loader2, Lock, Mail, Zap, Shield, TrendingUp, Clock } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const login = useLogin();
  
  // Check if redirected from registration or signup disabled
  const isRegistered = typeof window !== 'undefined' && 
    window.location.search.includes('registered=true');
  const signupDisabled = typeof window !== 'undefined' && 
    window.location.search.includes('signup_disabled=true');

  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); login.mutate({ email, password }); };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 relative flex-col justify-between p-12 bg-white border-r border-gray-200">
        <div>
          <div className="flex items-center gap-3 mb-16">
            <div className="w-9 h-9 bg-brand-gradient rounded-xl flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-semibold text-gray-900">PayFlow</span>
          </div>
          <h1 className="text-4xl font-bold tracking-tight leading-tight text-gray-900 mb-4">
            The smarter way<br />to move money
          </h1>
          <p className="text-gray-500 text-base leading-relaxed max-w-sm">
            Enterprise-grade Pay-In / Pay-Out infrastructure with real-time wallet management and multi-level commission distribution.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {[
            { icon: <TrendingUp className="w-5 h-5 text-blue-600" />, label: 'Transactions/day', value: '50K+', bg: 'bg-blue-50' },
            { icon: <Shield className="w-5 h-5 text-emerald-600" />, label: 'Uptime SLA',       value: '99.9%', bg: 'bg-emerald-50' },
            { icon: <Clock className="w-5 h-5 text-amber-600" />,    label: 'Settlement',       value: '<2s',   bg: 'bg-amber-50' },
          ].map(s => (
            <div key={s.label} className="bg-gray-50 border border-gray-200 rounded-xl p-4">
              <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center mb-2', s.bg)}>{s.icon}</div>
              <p className="text-xl font-bold text-gray-900">{s.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-sm">
          <div className="flex lg:hidden items-center gap-2 mb-6 sm:mb-8">
            <div className="w-8 h-8 bg-brand-gradient rounded-lg flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-gray-900">PayFlow</span>
          </div>

          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900 mb-1">Welcome back</h2>
          <p className="text-sm text-gray-500 mb-6 sm:mb-8">Sign in to your account to continue</p>

          {isRegistered && (
            <div className="mb-5 px-4 py-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm">
              ✅ Account created successfully! Please login below.
            </div>
          )}

          {signupDisabled && (
            <div className="mb-5 px-4 py-3 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 text-sm">
              ℹ️ Account creation is handled by administrators only.
            </div>
          )}

          {login.error && (
            <div className="mb-5 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
              {(login.error as any)?.response?.data?.error?.message || 'Invalid credentials'}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Email address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="input pl-9" placeholder="you@example.com" required autoComplete="email" />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-gray-600">Password</label>
                <Link href="#" className="text-xs text-brand-600 hover:text-brand-700">Forgot password?</Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} className="input pl-9 pr-10" placeholder="••••••••" required autoComplete="current-password" />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={login.isPending}
              className={cn('btn-primary w-full mt-2 justify-center', login.isPending && 'opacity-70 cursor-not-allowed')}>
              {login.isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Signing in...</> : 'Sign in'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500">
            Don&apos;t have an account?{' '}
            <span className="text-gray-400 font-medium">Ask your administrator</span>
          </p>

          <div className="mt-8 p-3 rounded-lg bg-gray-50 border border-gray-200">
            <p className="text-2xs text-gray-400 font-semibold mb-2 uppercase tracking-wider">Demo credentials</p>
            {[
              { role: 'Super Admin', email: 'superadmin@payflow.com', pw: 'SuperAdmin@123' },
              { role: 'Admin',       email: 'admin@payflow.com',      pw: 'Admin@123' },
              { role: 'Agent',       email: 'agent@payflow.com',      pw: 'Agent@123' },
            ].map(c => (
              <button key={c.role} type="button" onClick={() => { setEmail(c.email); setPassword(c.pw); }}
                className="w-full text-left text-2xs text-gray-500 hover:text-gray-800 py-1 px-2 rounded hover:bg-white transition-colors">
                <span className="text-brand-600 font-medium">{c.role}</span> — {c.email}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}