import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '@/api/auth';
import { apiErrorMessage } from '@/api/axiosClient';
import { useAuthStore, isAdminPanelRole } from '@/store/authStore';
import { useSiteName } from '@/hooks/useSiteName';
import { Button } from '@/components/ui/Button';
import { Logo } from '@/components/ui/Logo';
import { toast } from '@/store/toastStore';
import { IconChevronRight } from '@/components/ui/icons';
import { LightField, LightInput } from './AuthFormKit';

const LOGIN_IMG = 'https://images.unsplash.com/photo-1554744512-d6c603f27c54?auto=format&fit=crop&w=1200&q=75';

export function LoginPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const { companyName } = useSiteName();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await authApi.login(email, password);
      setAuth({ accessToken: res.accessToken, refreshToken: res.refreshToken }, res.user);
      toast.success(`Welcome back, ${res.user.name}`);
      navigate(isAdminPanelRole(res.user.role) ? '/admin' : '/agent', { replace: true });
    } catch (err) {
      setError(apiErrorMessage(err, 'Invalid email or password'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen bg-white">
      {/* Image panel */}
      <div className="relative hidden w-1/2 shrink-0 lg:block">
        <img src={LOGIN_IMG} alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-neutral-950/90 via-neutral-950/25 to-neutral-950/10" />
        <Link to="/" className="absolute left-8 top-8 flex items-center gap-2.5">
          <Logo className="h-9 w-9 rounded-xl text-sm shadow-lg shadow-amber-500/25" />
          <span className="text-sm font-semibold text-white">{companyName}</span>
        </Link>
        <div className="absolute inset-x-0 bottom-0 p-10">
          <p className="text-3xl font-semibold leading-tight text-white">
            Your Ride,
            <br />
            Your Business.
          </p>
          <p className="mt-3 max-w-sm text-sm text-white/70">
            Sign back in to manage sales, track your team, and keep your commissions moving.
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

          <h1 className="text-2xl font-semibold text-slate-900">Welcome back</h1>
          <p className="mt-1.5 text-sm text-slate-500">Sign in to your Admin or Agent account</p>

          <form onSubmit={onSubmit} className="mt-8 space-y-4">
            <LightField label="Email">
              <LightInput type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoFocus />
            </LightField>
            <LightField label="Password">
              <LightInput type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
            </LightField>
            {error && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>}
            <Button type="submit" size="lg" className="w-full justify-center" loading={loading}>
              Sign In
            </Button>
          </form>

          <p className="mt-8 text-center text-sm text-slate-500">
            New driver-partner?{' '}
            <Link to="/join" className="font-medium text-amber-600 hover:text-amber-700">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
