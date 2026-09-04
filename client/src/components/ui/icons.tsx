import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;
const base = (props: IconProps) => ({ viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, ...props });

export const IconDashboard = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="3" y="3" width="7" height="9" rx="1.5" />
    <rect x="14" y="3" width="7" height="5" rx="1.5" />
    <rect x="14" y="12" width="7" height="9" rx="1.5" />
    <rect x="3" y="16" width="7" height="5" rx="1.5" />
  </svg>
);
export const IconUsers = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="9" cy="8" r="3.2" />
    <path d="M2.5 20c0-3.6 2.9-6.2 6.5-6.2s6.5 2.6 6.5 6.2" />
    <circle cx="17.5" cy="8.5" r="2.6" />
    <path d="M15 13.6c2.9.4 5 2.7 5 6.4" />
  </svg>
);
export const IconTicket = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M3 8a2 2 0 012-2h14a2 2 0 012 2v2a2 2 0 000 4v2a2 2 0 01-2 2H5a2 2 0 01-2-2v-2a2 2 0 000-4V8z" />
    <path d="M10 6v12" strokeDasharray="2 2" />
  </svg>
);
export const IconLayers = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 3l9 5-9 5-9-5 9-5z" />
    <path d="M3 13l9 5 9-5" />
    <path d="M3 17.5l9 5 9-5" />
  </svg>
);
export const IconNetwork = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="12" cy="4.5" r="2.2" />
    <circle cx="5" cy="18" r="2.2" />
    <circle cx="19" cy="18" r="2.2" />
    <path d="M12 6.7v4.3M12 11l-6 5M12 11l6 5" />
  </svg>
);
export const IconWallet = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="3" y="6" width="18" height="13" rx="2" />
    <path d="M3 10h18" />
    <circle cx="16.5" cy="14" r="1.3" fill="currentColor" stroke="none" />
  </svg>
);
export const IconFile = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M6 2.5h8l4 4V20a1.5 1.5 0 01-1.5 1.5h-11A1.5 1.5 0 014 20V4a1.5 1.5 0 011.5-1.5z" />
    <path d="M14 2.5V7h4.5" />
    <path d="M8 12h8M8 16h8" />
  </svg>
);
export const IconSettings = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="3.2" />
    <path d="M19.4 13.5a1.7 1.7 0 000-3l1-1.6-1.7-1.7-1.6 1a1.7 1.7 0 00-3 0l-1-1.6-1.7 1.7 1 1.6a1.7 1.7 0 000 3l-1 1.6 1.7 1.7 1.6-1a1.7 1.7 0 003 0l1 1.6 1.7-1.7-1-1.6z" />
  </svg>
);
export const IconLogout = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
    <path d="M16 17l5-5-5-5M21 12H9" />
  </svg>
);
export const IconMenu = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M4 7h16M4 12h16M4 17h16" />
  </svg>
);
export const IconSearch = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="11" cy="11" r="7" />
    <path d="M21 21l-4.3-4.3" />
  </svg>
);
export const IconPlus = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);
export const IconMinus = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M5 12h14" />
  </svg>
);
export const IconTrash = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M4 7h16M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2m-8 0l1 13a1 1 0 001 1h6a1 1 0 001-1l1-13" />
  </svg>
);
export const IconDownload = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 3v13m0 0l-4.5-4.5M12 16l4.5-4.5" />
    <path d="M4 18v1a2 2 0 002 2h12a2 2 0 002-2v-1" />
  </svg>
);
export const IconCheck = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M5 13l4 4L19 7" />
  </svg>
);
export const IconX = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M18 6L6 18M6 6l12 12" />
  </svg>
);
export const IconChevronRight = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M9 6l6 6-6 6" />
  </svg>
);
export const IconQrCode = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
    <path d="M14 14h3v3h-3zM19 14h2M14 19h2M17 17h4v4h-4z" />
  </svg>
);
export const IconCart = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="9" cy="20" r="1.3" fill="currentColor" stroke="none" />
    <circle cx="18" cy="20" r="1.3" fill="currentColor" stroke="none" />
    <path d="M2.5 3h2.4l2.4 12.2a2 2 0 002 1.6h8.4a2 2 0 002-1.7l1.4-7.6H6" />
  </svg>
);
export const IconTrophy = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M8 4h8v5a4 4 0 01-8 0V4z" />
    <path d="M8 5H5a3 3 0 003 3M16 5h3a3 3 0 01-3 3" />
    <path d="M12 13v3m-3 4h6m-3 0v-4" />
  </svg>
);
export const IconUserPlus = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="9" cy="8" r="3.2" />
    <path d="M2.5 20c0-3.6 2.9-6.2 6.5-6.2s6.5 2.6 6.5 6.2" />
    <path d="M18 8v5M20.5 10.5H15.5" />
  </svg>
);
export const IconChat = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M4 5.5A2.5 2.5 0 016.5 3h11A2.5 2.5 0 0120 5.5v8A2.5 2.5 0 0117.5 16H10l-4.5 4v-4H6.5A2.5 2.5 0 014 13.5v-8z" />
    <path d="M8 8.5h8M8 11.5h5" />
  </svg>
);
export const IconBell = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M6 9a6 6 0 1112 0c0 4 1.5 5.5 1.5 5.5h-15S6 13 6 9z" />
    <path d="M10 18a2 2 0 004 0" />
  </svg>
);
export const IconClipboard = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="6" y="4" width="12" height="17" rx="2" />
    <path d="M9 4V3a1 1 0 011-1h4a1 1 0 011 1v1M9 10h6M9 14h6" />
  </svg>
);
export const IconKey = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="8" cy="15" r="4.2" />
    <path d="M11 12l9-9M17 6l2.5 2.5M14 9l2 2" />
  </svg>
);
export const IconSend = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M21 3L3 10.5l7.5 3M21 3l-7.5 18-3-7.5M21 3L10.5 13.5" />
  </svg>
);
export const IconBank = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M3 10l9-6 9 6" />
    <path d="M4.5 10h15v9h-15z" />
    <path d="M4 19h16M8 13v4M12 13v4M16 13v4" />
  </svg>
);
export const IconCar = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M4 16.5V12a1 1 0 01.3-.7l2.4-2.4A2 2 0 018.1 8h7.8a2 2 0 011.4.6l2.4 2.4a1 1 0 01.3.7v4.8" />
    <path d="M4 16.5h16" />
    <path d="M7 11.5h10" />
    <circle cx="8" cy="16.5" r="1.6" fill="currentColor" stroke="none" />
    <circle cx="16" cy="16.5" r="1.6" fill="currentColor" stroke="none" />
  </svg>
);
export const IconBike = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="5.5" cy="17" r="3.2" />
    <circle cx="18.5" cy="17" r="3.2" />
    <path d="M5.5 17l4-8h3.5l2.5 5h3" />
    <path d="M9.5 9h3" />
    <path d="M11 9l3.5 8" />
  </svg>
);
export const IconMapPin = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 21s7-6.7 7-11.7A7 7 0 105 9.3C5 14.3 12 21 12 21z" />
    <circle cx="12" cy="9.3" r="2.3" />
  </svg>
);
export const IconClock = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 2" />
  </svg>
);
export const IconStar = (p: IconProps) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...p}>
    <path d="M12 2.5l2.9 6 6.6.7-4.9 4.5 1.3 6.5L12 16.9l-5.9 3.3 1.3-6.5-4.9-4.5 6.6-.7L12 2.5z" />
  </svg>
);
export const IconShieldCheck = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 3l7 3v5c0 5-3.5 8.5-7 10-3.5-1.5-7-5-7-10V6l7-3z" />
    <path d="M9 12l2 2 4-4" />
  </svg>
);
export const IconSwap = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M7 3v14M7 17l-3-3M7 17l3-3" />
    <path d="M17 21V7M17 7l-3 3M17 7l3 3" />
  </svg>
);
export const IconHeadset = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M4 14v-2a8 8 0 0116 0v2" />
    <rect x="3" y="14" width="4" height="5.5" rx="1.5" />
    <rect x="17" y="14" width="4" height="5.5" rx="1.5" />
    <path d="M20 19.5a4 4 0 01-4 3h-2" />
  </svg>
);
export const IconNavigation = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 2L4 21l8-5 8 5L12 2z" />
  </svg>
);
export const IconWhatsapp = (p: IconProps) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...p}>
    <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.39 1.26 4.82L2 22l5.42-1.37a9.85 9.85 0 004.62 1.17h.01c5.46 0 9.9-4.45 9.9-9.91S17.5 2 12.04 2zm5.8 14.02c-.25.7-1.24 1.29-2.03 1.46-.55.11-1.26.2-3.65-.78-3.06-1.27-5.03-4.38-5.19-4.58-.15-.2-1.24-1.65-1.24-3.15s.79-2.24 1.07-2.55c.28-.31.6-.38.8-.38.2 0 .4 0 .58.01.19.01.44-.07.68.52.25.6.86 2.08.93 2.23.07.15.12.33.02.53-.1.2-.15.32-.3.5-.15.18-.31.4-.44.53-.15.15-.3.31-.13.6.17.3.77 1.27 1.65 2.06 1.13 1.01 2.09 1.32 2.38 1.47.3.15.47.13.64-.08.18-.2.75-.87.95-1.17.2-.3.4-.25.68-.15.28.1 1.77.84 2.08.99.3.15.5.23.57.35.08.13.08.7-.17 1.4z" />
  </svg>
);
