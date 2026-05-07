'use client';
import { useState } from 'react';
import { useRegister } from '@/hooks/use-auth';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { Eye, EyeOff, Loader2, Lock, Mail, Phone, User, Zap } from 'lucide-react';

export default function SignupPage() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [showPw, setShowPw] = useState(false);
  const register = useRegister();

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    register.mutate(form);
  };

  const pwStrength = (() => {
    const pw = form.password;
    let score = 0;
    if (pw.length >= 8) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    return score;
  })();

  const strengthColors = ['bg-danger', 'bg-warning', 'bg-warning', 'bg-success'];
  const strengthLabels = ['Weak', 'Fair', 'Good', 'Strong'];

  return (
    <div className="min-h-screen bg-surface-950 flex items-center justify-center p-8">
      <div className="w-full max-w-md animate-fade-in">
        <div className="flex items-center gap-2 mb-8">
          <div className="w-8 h-8 bg-brand-gradient rounded-lg flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold">PayFlow</span>
        </div>

        <h2 className="text-2xl font-bold tracking-tight text-white mb-1">Create your account</h2>
        <p className="text-sm text-slate-500 mb-8">Join thousands of agents using PayFlow</p>

        {register.error && (
          <div className="mb-5 px-4 py-3 rounded-lg bg-danger/10 border border-danger/20 text-danger text-sm">
            {(register.error as any)?.response?.data?.error?.message || 'Registration failed'}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Full name</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input type="text" value={form.name} onChange={set('name')} className="input pl-9" placeholder="John Doe" required />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Email address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input type="email" value={form.email} onChange={set('email')} className="input pl-9" placeholder="you@example.com" required />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Phone number</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input type="tel" value={form.phone} onChange={set('phone')} className="input pl-9" placeholder="9876543210" pattern="[6-9][0-9]{9}" required />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input type={showPw ? 'text' : 'password'} value={form.password} onChange={set('password')} className="input pl-9 pr-10" placeholder="••••••••" required />
              <button type="button" onClick={() => setShowPw(!showPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors">
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {form.password && (
              <div className="mt-2">
                <div className="flex gap-1 mb-1">
                  {[0, 1, 2, 3].map((i) => (
                    <div key={i} className={cn('h-1 flex-1 rounded-full transition-all duration-300',
                      i < pwStrength ? strengthColors[pwStrength - 1] : 'bg-surface-700')} />
                  ))}
                </div>
                <p className="text-2xs text-slate-500">{form.password ? strengthLabels[pwStrength - 1] || 'Too weak' : ''} password</p>
              </div>
            )}
          </div>

          <button type="submit" disabled={register.isPending}
            className={cn('btn-primary w-full mt-2', register.isPending && 'opacity-70 cursor-not-allowed')}>
            {register.isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating account...</> : 'Create account'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          Already have an account?{' '}
          <Link href="/auth/login" className="text-brand-400 hover:text-brand-300 font-medium transition-colors">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
