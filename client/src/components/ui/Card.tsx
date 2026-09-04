import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/utils/cn';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function Card({ children, className, ...rest }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-white/8 bg-gradient-to-b from-white/[0.04] to-white/[0.01] backdrop-blur-sm shadow-[0_1px_0_rgba(255,255,255,0.04)_inset]',
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className, ...rest }: CardProps) {
  return (
    <div className={cn('flex items-center justify-between gap-3 border-b border-white/8 px-5 py-4', className)} {...rest}>
      {children}
    </div>
  );
}

export function CardTitle({ children, className, ...rest }: CardProps) {
  return (
    <h3 className={cn('text-sm font-semibold tracking-wide text-slate-100', className)} {...rest}>
      {children}
    </h3>
  );
}

export function CardBody({ children, className, ...rest }: CardProps) {
  return (
    <div className={cn('p-5', className)} {...rest}>
      {children}
    </div>
  );
}
