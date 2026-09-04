import type { ReactNode } from 'react';
import { cn } from '@/utils/cn';

interface StatCardProps {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
  accent?: 'amber' | 'emerald' | 'sky' | 'violet' | 'rose';
  hint?: string;
}

const accentClasses = {
  amber: 'text-amber-300 bg-amber-500/10 ring-amber-500/20',
  emerald: 'text-emerald-300 bg-emerald-500/10 ring-emerald-500/20',
  sky: 'text-sky-300 bg-sky-500/10 ring-sky-500/20',
  violet: 'text-violet-300 bg-violet-500/10 ring-violet-500/20',
  rose: 'text-rose-300 bg-rose-500/10 ring-rose-500/20',
};

export function StatCard({ label, value, icon, accent = 'amber', hint }: StatCardProps) {
  return (
    <div className="rounded-2xl border border-white/8 bg-gradient-to-b from-white/[0.05] to-transparent p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-slate-400">{label}</p>
          <p className="mt-2 text-2xl font-semibold text-slate-50 tabular-nums">{value}</p>
          {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
        </div>
        {icon && <div className={cn('rounded-xl p-2.5 ring-1', accentClasses[accent])}>{icon}</div>}
      </div>
    </div>
  );
}
