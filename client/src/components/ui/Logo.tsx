import { useSiteName } from '@/hooks/useSiteName';
import { cn } from '@/utils/cn';

/** The brand mark used everywhere (nav, sidebars, auth pages, printed tickets): the admin-uploaded
 *  logo image when one is set (Admin → Settings → Site Logo), else a gradient initials badge.
 *  `className` carries sizing/shadow/text-size from the call site — nothing here collides with it. */
export function Logo({ className, tone = 'amber' }: { className?: string; tone?: 'amber' | 'emerald' }) {
  const { logoUrl, initials } = useSiteName();

  // Rounding varies per call site (rounded-lg/xl/2xl) so it's never set here — only in className —
  // to avoid two classes fighting over the same property with an unpredictable winner.
  if (logoUrl) {
    return <img src={logoUrl} alt="" className={cn('shrink-0 bg-white object-contain', className)} />;
  }

  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center bg-gradient-to-br font-bold text-neutral-950',
        tone === 'emerald' ? 'from-emerald-400 to-emerald-600' : 'from-amber-400 to-amber-600',
        className,
      )}
    >
      {initials}
    </div>
  );
}
