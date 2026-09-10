import { useState, type ComponentType, type SVGProps } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useSiteName } from '@/hooks/useSiteName';
import { authApi } from '@/api/auth';
import { supportApi } from '@/api/support';
import { cn } from '@/utils/cn';
import { Logo } from '@/components/ui/Logo';
import {
  IconBank,
  IconBell,
  IconChat,
  IconClipboard,
  IconDashboard,
  IconFile,
  IconLayers,
  IconLogout,
  IconMenu,
  IconNetwork,
  IconPlus,
  IconQrCode,
  IconSettings,
  IconTicket,
  IconTrophy,
  IconUsers,
  IconWallet,
  IconX,
} from '@/components/ui/icons';

interface NavItem {
  label: string;
  to: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
}
interface NavSection {
  title: string;
  items: NavItem[];
}

const sections: NavSection[] = [
  { title: 'Main', items: [{ label: 'Dashboard', to: '/admin', icon: IconDashboard }] },
  {
    title: 'Users',
    items: [
      { label: 'Users', to: '/admin/users', icon: IconUsers },
      { label: 'Bank Detail Requests', to: '/admin/users/bank-details', icon: IconBank },
      { label: 'Support Chat', to: '/admin/support', icon: IconChat },
    ],
  },
  {
    title: 'Lottery',
    items: [
      { label: 'Draw Slots', to: '/admin/draw-slots', icon: IconClipboard },
      { label: 'Series (SEM)', to: '/admin/series', icon: IconLayers },
      { label: 'Generate Tickets', to: '/admin/generate-tickets', icon: IconTicket },
      { label: 'All Tickets', to: '/admin/tickets', icon: IconTicket },
      { label: 'Prize Settings', to: '/admin/prize-settings', icon: IconSettings },
      { label: 'Declare Results', to: '/admin/declare-results', icon: IconTrophy },
      { label: 'Prize Winners', to: '/admin/winners', icon: IconTrophy },
    ],
  },
  {
    title: 'MLM',
    items: [
      { label: 'MLM Settings', to: '/admin/mlm/settings', icon: IconSettings },
      { label: 'MLM Tree', to: '/admin/mlm/tree', icon: IconNetwork },
      { label: 'Commission Reports', to: '/admin/mlm/commissions', icon: IconFile },
      { label: 'Withdrawal Requests', to: '/admin/mlm/withdrawals', icon: IconWallet },
    ],
  },
  {
    title: 'Finance',
    items: [
      { label: 'Reports', to: '/admin/finance/reports', icon: IconFile },
      { label: 'Agent Sales & Commission', to: '/admin/finance/agent-activity', icon: IconFile },
      { label: 'Transaction History', to: '/admin/finance/transactions', icon: IconWallet },
      { label: 'Deposits & Adjustments', to: '/admin/finance/deposits', icon: IconPlus },
      { label: 'Wallet / Payouts', to: '/admin/finance/payouts', icon: IconWallet },
      { label: 'Payment Methods', to: '/admin/finance/payment-methods', icon: IconQrCode },
    ],
  },
  {
    title: 'System',
    items: [
      { label: 'Roles & Permissions', to: '/admin/system/roles', icon: IconUsers },
      { label: 'Activity Logs', to: '/admin/system/activity', icon: IconClipboard },
      { label: 'Settings', to: '/admin/system/settings', icon: IconSettings },
    ],
  },
];

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { companyName } = useSiteName();
  const { data: unread } = useQuery({ queryKey: ['support-unread'], queryFn: supportApi.unreadCount, refetchInterval: 15000 });
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <Logo className="h-9 w-9 rounded-xl shadow-lg shadow-amber-500/20" />
        <div>
          <p className="text-sm font-semibold text-slate-100 leading-tight">{companyName}</p>
          <p className="text-[11px] text-amber-400/80 leading-tight">Admin Console</p>
        </div>
      </div>
      <nav className="flex-1 space-y-5 overflow-y-auto px-3 pb-6">
        {sections.map((section) => (
          <div key={section.title}>
            <p className="px-2.5 pb-1.5 text-[10px] font-semibold uppercase tracking-widest text-slate-600">{section.title}</p>
            <div className="space-y-0.5">
              {section.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/admin'}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors',
                      isActive ? 'bg-amber-500/12 text-amber-300' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200',
                    )
                  }
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  {item.label}
                  {item.to === '/admin/support' && Boolean(unread?.count) && (
                    <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1.5 text-[10px] font-semibold text-neutral-950">
                      {unread!.count}
                    </span>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>
    </div>
  );
}

export function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  async function handleLogout() {
    try {
      await authApi.logout();
    } catch {
      /* ignore */
    }
    logout();
    navigate('/login');
  }

  return (
    <div className="flex h-screen bg-neutral-950">
      <aside className="hidden w-64 shrink-0 border-r border-white/8 bg-neutral-950/60 md:block">
        <SidebarContent />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/70" onClick={() => setMobileOpen(false)} />
          <aside className="relative z-10 h-full w-72 border-r border-white/10 bg-neutral-950">
            <button className="absolute right-3 top-4 text-slate-400" onClick={() => setMobileOpen(false)}>
              <IconX className="h-5 w-5" />
            </button>
            <SidebarContent onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-white/8 bg-neutral-950/80 px-4 py-3 backdrop-blur md:px-6">
          <button className="text-slate-400 md:hidden" onClick={() => setMobileOpen(true)}>
            <IconMenu className="h-5 w-5" />
          </button>
          <div className="hidden md:block" />
          <div className="flex items-center gap-3">
            <button className="rounded-lg p-2 text-slate-400 hover:bg-white/5 hover:text-slate-200">
              <IconBell className="h-4.5 w-4.5" />
            </button>
            <div className="flex items-center gap-2.5 rounded-lg border border-white/8 px-2.5 py-1.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-500/15 text-xs font-semibold text-amber-300">
                {user?.name?.[0]?.toUpperCase()}
              </div>
              <div className="hidden text-left sm:block">
                <p className="text-xs font-medium text-slate-200 leading-tight">{user?.name}</p>
                <p className="text-[10px] text-slate-500 leading-tight">{user?.role.replace('_', ' ')}</p>
              </div>
            </div>
            <button onClick={handleLogout} className="rounded-lg p-2 text-slate-400 hover:bg-red-500/10 hover:text-red-300" title="Logout">
              <IconLogout className="h-4.5 w-4.5" />
            </button>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
