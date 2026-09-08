import { cn } from '@/utils/cn';

export function Switch({
  checked,
  onChange,
  accent = 'amber',
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  accent?: 'amber' | 'emerald';
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors',
        'outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900',
        disabled && 'cursor-not-allowed opacity-50',
        checked
          ? accent === 'amber'
            ? 'border-amber-500 bg-amber-500 focus-visible:ring-amber-500/50'
            : 'border-emerald-500 bg-emerald-500 focus-visible:ring-emerald-500/50'
          : 'border-white/15 bg-white/10 focus-visible:ring-white/30',
      )}
    >
      <span
        className={cn(
          'pointer-events-none block h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200 ease-in-out',
          checked ? 'translate-x-[1.375rem]' : 'translate-x-[0.1875rem]',
        )}
      />
    </button>
  );
}
