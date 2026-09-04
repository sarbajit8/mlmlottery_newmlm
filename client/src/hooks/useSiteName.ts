import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { systemApi } from '@/api/system';

const DEFAULT_COMPANY_NAME = 'FirstDialCab';
const DEFAULT_FAVICON_HREF = '/favicon.svg';
const DEFAULT_FAVICON_TYPE = 'image/svg+xml';

function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return 'BC';
  return words
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('');
}

/** Shared, cached read of the admin-configurable site/company name — used everywhere the brand
 * appears (landing page, login/join, sidebars, printed tickets), including before login. */
export function useSiteName() {
  const { data } = useQuery({
    queryKey: ['public-settings'],
    queryFn: systemApi.publicSettings,
    staleTime: 5 * 60 * 1000,
  });

  const companyName = data?.companyName ?? DEFAULT_COMPANY_NAME;
  const logoUrl = data?.logoUrl ?? null;

  useEffect(() => {
    document.title = companyName;
  }, [companyName]);

  // Browser-tab icon — mirrors the uploaded site logo (Admin → Settings → Site Logo) so it doesn't
  // need a second upload. index.html's static <link rel="icon"> is just the pre-upload default.
  useEffect(() => {
    let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    if (logoUrl) {
      const mimeMatch = /^data:([^;]+);/.exec(logoUrl);
      link.type = mimeMatch?.[1] ?? '';
      link.href = logoUrl;
    } else {
      link.type = DEFAULT_FAVICON_TYPE;
      link.href = DEFAULT_FAVICON_HREF;
    }
  }, [logoUrl]);

  return { companyName, logoUrl, initials: initialsOf(companyName) };
}
