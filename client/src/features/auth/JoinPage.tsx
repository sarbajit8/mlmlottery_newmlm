import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { authApi } from '@/api/auth';
import { apiErrorMessage } from '@/api/axiosClient';
import { useSiteName } from '@/hooks/useSiteName';
import { Button } from '@/components/ui/Button';
import { Logo } from '@/components/ui/Logo';
import { IconCheck, IconChevronRight, IconUserPlus } from '@/components/ui/icons';
import { LightField, LightInput } from './AuthFormKit';

const JOIN_IMG = 'https://images.unsplash.com/photo-1550355291-bbee04a92027?auto=format&fit=crop&w=1200&q=75';

export function JoinPage() {
  const { companyName } = useSiteName();
  const [params] = useSearchParams();
  const ref = params.get('ref');
  const [form, setForm] = useState({ name: '', email: '', mobile: '', whatsapp: '', password: '', referralCode: ref ?? '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await authApi.registerAgent({ ...form, referralCode: form.referralCode || undefined });
      setDone(true);
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not complete registration'));
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="relative flex min-h-screen items-center justify-center bg-white px-4">
        <Link to="/" className="absolute left-6 top-6 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-slate-900">
          <IconChevronRight className="h-4 w-4 rotate-180" />
          Back to Home
        </Link>

        <div className="w-full max-w-sm animate-fade-in rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-xl shadow-slate-900/5">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
            <IconCheck className="h-6 w-6" />
          </div>
          <h1 className="text-lg font-semibold text-slate-900">You're all set!</h1>
          <p className="mt-1.5 text-sm text-slate-500">Your account is active — log in now, then add your bank and UPI details to start selling.</p>
          <Link to="/login" className="mt-6 block">
            <Button size="lg" className="w-full justify-center">
              Login Now
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-white">
      {/* Image panel */}
      <div className="relative hidden w-1/2 shrink-0 lg:block">
        <img src={JOIN_IMG} alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-neutral-950/90 via-neutral-950/25 to-neutral-950/10" />
        <Link to="/" className="absolute left-8 top-8 flex items-center gap-2.5">
          <Logo className="h-9 w-9 rounded-xl text-sm shadow-lg shadow-amber-500/25" />
          <span className="text-sm font-semibold text-white">{companyName}</span>
        </Link>
        <div className="absolute inset-x-0 bottom-0 p-10">
          <p className="text-3xl font-semibold leading-tight text-white">
            Drive on
            <br />
            Your Own Schedule.
          </p>
          <p className="mt-3 max-w-sm text-sm text-white/70">
            Register as a driver-partner, start selling right away, and earn commission on your whole team's sales.
          </p>
        </div>
      </div>

      {/* Form panel */}
      <div className="relative flex w-full flex-col items-center justify-center px-6 py-12 lg:w-1/2">
        <Link to="/" className="absolute left-6 top-6 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-slate-900">
          <IconChevronRight className="h-4 w-4 rotate-180" />
          Back to Home
        </Link>

        <div className="w-full max-w-sm animate-fade-in">
          <div className="mb-8 flex flex-col items-center text-center lg:hidden">
            <Logo className="mb-3 h-11 w-11 rounded-2xl text-sm shadow-lg shadow-amber-500/25" />
            <span className="text-sm font-semibold text-slate-900">{companyName}</span>
          </div>

          {ref && (
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3.5 py-1.5 text-xs text-emerald-700">
              <IconUserPlus className="h-3.5 w-3.5" />
              Invited by referral code <span className="font-mono font-semibold">{ref}</span>
            </div>
          )}

          <h1 className="text-2xl font-semibold text-slate-900">Become a driver-partner</h1>
          <p className="mt-1.5 text-sm text-slate-500">Create your account and start selling right away — no admin approval needed.</p>

          <form onSubmit={onSubmit} className="mt-8 space-y-4">
            <LightField label="Full Name" required>
              <LightInput required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </LightField>
            <LightField label="Email" required>
              <LightInput type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </LightField>
            <LightField label="Mobile" required>
              <LightInput required value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} />
            </LightField>
            <LightField label="WhatsApp (optional)">
              <LightInput value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} />
            </LightField>
            <LightField label="Password" required>
              <LightInput type="password" required minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            </LightField>
            <LightField label="Referral Code (optional)" hint="Have a sponsor's code? Enter it here. Leave blank to register directly under the platform admin.">
              <LightInput value={form.referralCode} onChange={(e) => setForm({ ...form, referralCode: e.target.value.toUpperCase() })} placeholder="e.g. AGT00001" className="font-mono" />
            </LightField>
            {error && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>}
            <Button type="submit" size="lg" className="w-full justify-center" loading={loading}>
              Create Account
            </Button>
          </form>

          <p className="mt-8 text-center text-sm text-slate-500">
            Already a driver-partner?{' '}
            <Link to="/login" className="font-medium text-amber-600 hover:text-amber-700">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
