import { cn } from '@/utils/cn';

export function Switch({ checked, onChange, accent = 'amber' }: { checked: boolean; onChange: (v: boolean) => void; accent?: 'amber' | 'emerald' }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative h-6 w-11 shrink-0 rounded-full border transition-colors',
        checked ? (accent === 'amber' ? 'bg-amber-500 border-amber-500' : 'bg-emerald-500 border-emerald-500') : 'bg-white/10 border-white/15',
      )}
    >
      <span className={cn('absolute top-0.5 h-4.5 w-4.5 rounded-full bg-white transition-transform', checked ? 'translate-x-[22px]' : 'translate-x-0.5')} />
    </button>
  );
}
