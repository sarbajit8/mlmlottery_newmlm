import { forwardRef } from 'react';
import type { InputHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/utils/cn';

// The shared Input/FormField/Button(secondary+) components are tuned for the app's dark admin/agent
// screens — reusing them here and overriding colors via className risks a silent cascade-order
// conflict (Tailwind doesn't guarantee "later class in the string wins"). These are light-theme-only,
// self-contained equivalents for the two public auth pages instead.

export const LightInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(({ className, ...rest }, ref) => (
  <input
    ref={ref}
    className={cn(
      'w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-colors focus:border-amber-500 focus:ring-2 focus:ring-amber-500/15 disabled:opacity-50',
      className,
    )}
    {...rest}
  />
));
LightInput.displayName = 'LightInput';

export function LightField({ label, hint, required, children }: { label: string; hint?: string; required?: boolean; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-slate-600">
        {label} {required && <span className="text-red-500">*</span>}
      </span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-slate-400">{hint}</span>}
    </label>
  );
}
