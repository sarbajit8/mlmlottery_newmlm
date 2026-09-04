import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/utils/cn';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';
type Accent = 'amber' | 'emerald' | 'slate';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  accent?: Accent;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
}

const accentSolid: Record<Accent, string> = {
  amber: 'bg-amber-500 hover:bg-amber-400 text-neutral-950 shadow-amber-500/20',
  emerald: 'bg-emerald-500 hover:bg-emerald-400 text-neutral-950 shadow-emerald-500/20',
  slate: 'bg-slate-100 hover:bg-white text-neutral-950 shadow-black/20',
};

const accentSecondary: Record<Accent, string> = {
  amber: 'border-amber-500/30 text-amber-300 hover:bg-amber-500/10',
  emerald: 'border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10',
  slate: 'border-white/15 text-slate-200 hover:bg-white/5',
};

const sizeClasses: Record<Size, string> = {
  sm: 'px-2.5 py-1.5 text-xs gap-1.5',
  md: 'px-4 py-2 text-sm gap-2',
  lg: 'px-5 py-2.5 text-base gap-2',
};

export function Button({
  variant = 'primary',
  accent = 'amber',
  size = 'md',
  loading,
  icon,
  className,
  children,
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center rounded-lg font-medium transition-all duration-150 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none active:scale-[0.98]',
        sizeClasses[size],
        variant === 'primary' && accentSolid[accent],
        variant === 'secondary' && cn('border bg-transparent', accentSecondary[accent]),
        variant === 'danger' && 'bg-red-500/15 text-red-300 border border-red-500/30 hover:bg-red-500/25',
        variant === 'ghost' && 'bg-transparent text-slate-300 hover:bg-white/5',
        className,
      )}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? (
        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
        </svg>
      ) : (
        icon
      )}
      {children}
    </button>
  );
}
