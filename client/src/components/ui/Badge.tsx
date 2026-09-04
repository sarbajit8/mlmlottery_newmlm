import type { ReactNode } from 'react';
import { cn } from '@/utils/cn';

type Tone = 'neutral' | 'green' | 'red' | 'amber' | 'blue' | 'purple';

const toneClasses: Record<Tone, string> = {
  neutral: 'bg-white/8 text-slate-300 border-white/10',
  green: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/25',
  red: 'bg-red-500/10 text-red-300 border-red-500/25',
  amber: 'bg-amber-500/10 text-amber-300 border-amber-500/25',
  blue: 'bg-sky-500/10 text-sky-300 border-sky-500/25',
  purple: 'bg-violet-500/10 text-violet-300 border-violet-500/25',
};

export function Badge({ tone = 'neutral', children, dot }: { tone?: Tone; children: ReactNode; dot?: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide',
        toneClasses[tone],
      )}
    >
      {dot && <span className={cn('h-1.5 w-1.5 rounded-full', toneClasses[tone].split(' ')[1])} style={{ backgroundColor: 'currentColor' }} />}
      {children}
    </span>
  );
}

const STATUS_TONE: Record<string, Tone> = {
  ACTIVE: 'green',
  OPEN_NOW: 'green',
  AVAILABLE: 'green',
  PAID: 'green',
  APPROVED: 'blue',
  COMPLETED: 'green',
  DRAW_DONE: 'blue',
  SOLD: 'blue',
  WINNER: 'amber',
  PENDING: 'amber',
  PENDING_KYC: 'amber',
  CLOSED: 'red',
  INACTIVE: 'red',
  REJECTED: 'red',
  CANCELLED: 'red',
  REVERSED: 'red',
  LOCKED: 'purple',
  OPEN: 'neutral',
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <Badge tone={STATUS_TONE[status] ?? 'neutral'} dot>
      {status.replace(/_/g, ' ')}
    </Badge>
  );
}
