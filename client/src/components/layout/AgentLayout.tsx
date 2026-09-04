import { useState, type ComponentType, type SVGProps } from 'react';
import { NavLink, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
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
  IconCart,
  IconChat,
  IconClipboard,
  IconDashboard,
  IconFile,
  IconLogout,
  IconMenu,
  IconNetwork,
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

const allItems: NavItem[] = [
  { label: 'Dashboard', to: '/agent', icon: IconDashboard },
  { label: 'Sell Tickets', to: '/agent/sell', icon: IconCart },
  { label: 'My Team', to: '/agent/team', icon: IconNetwork },
  { label: 'Customers', to: '/agent/customers', icon: IconUsers },
  { label: 'My Reports', to: '/agent/reports', icon: IconFile },
  { label: 'My Commissions', to: '/agent/wallet', icon: IconWallet },
  { label: 'Results', to: '/agent/results', icon: IconClipboard },
  { label: 'My Winners', to: '/agent/winners', icon: IconTrophy },
  { label: 'Bank Details', to: '/agent/bank-details', icon: IconBank },
  { label: 'Support', to: '/agent/support', icon: IconChat },
];

const bottomNavItems = allItems.slice(0, 4);

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { companyName } = useSiteName();
  const { data: unread } = useQuery({ queryKey: ['support-unread'], queryFn: supportApi.unreadCount, refetchInterval: 15000 });
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <Logo tone="emerald" className="h-9 w-9 rounded-xl shadow-lg shadow-emerald-500/20" />
        <div>
          <p className="text-sm font-semibold text-slate-100 leading-tight">{companyName}</p>
          <p className="text-[11px] text-emerald-400/80 leading-tight">Agent Panel</p>
        </div>
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 pb-6">
        {allItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/agent'}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors',
                isActive ? 'bg-emerald-500/12 text-emerald-300' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200',
              )
            }
          >
            <item.icon className="h-4 w-4 shrink-0" />
            {item.label}
            {item.to === '/agent/support' && Boolean(unread?.count) && (
              <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-500 px-1.5 text-[10px] font-semibold text-neutral-950">
                {unread!.count}
              </span>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

export function AgentLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);

  async function handleLogout() {
    try {
      await authApi.logout();
    } catch {
      /* ignore */
    }
    logout();
    navigate('/login');
  }

  // Mandatory first step after registration — no bank/UPI details on file means every other agent
  // page bounces here until they're set (see BankDetailsPage).
  if (!user?.bankAccountNumber && location.pathname !== '/agent/bank-details') {
    return <Navigate to="/agent/bank-details" replace />;
  }

  return (
    <div className="flex h-screen bg-neutral-950">
      <aside className="hidden w-64 shrink-0 border-r border-white/8 bg-neutral-950/60 md:block">
        <SidebarContent />
      </aside>

      {drawerOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/70" onClick={() => setDrawerOpen(false)} />
          <aside className="absolute bottom-0 left-0 right-0 z-10 max-h-[80vh] rounded-t-2xl border-t border-white/10 bg-neutral-950 pb-6">
            <div className="flex items-center justify-between px-5 py-4">
              <p className="text-sm font-semibold text-slate-200">Menu</p>
              <button className="text-slate-400" onClick={() => setDrawerOpen(false)}>
                <IconX className="h-5 w-5" />
              </button>
            </div>
            <div className="px-3">
              {allItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/agent'}
                  onClick={() => setDrawerOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-2.5 rounded-lg px-2.5 py-2.5 text-sm',
                      isActive ? 'bg-emerald-500/12 text-emerald-300' : 'text-slate-300',
                    )
                  }
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  {item.label}
                </NavLink>
              ))}
              <button onClick={handleLogout} className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2.5 text-sm text-red-300">
                <IconLogout className="h-4 w-4" />
                Logout
              </button>
            </div>
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-white/8 bg-neutral-950/80 px-4 py-3 backdrop-blur md:px-6">
          <div className="flex items-center gap-2 md:hidden">
            <Logo tone="emerald" className="h-8 w-8 rounded-lg text-sm" />
          </div>
          <div className="hidden md:block" />
          <div className="flex items-center gap-3">
            <button className="rounded-lg p-2 text-slate-400 hover:bg-white/5 hover:text-slate-200">
              <IconBell className="h-4.5 w-4.5" />
            </button>
            <div className="flex items-center gap-2.5 rounded-lg border border-white/8 px-2.5 py-1.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500/15 text-xs font-semibold text-emerald-300">
                {user?.name?.[0]?.toUpperCase()}
              </div>
              <div className="hidden text-left sm:block">
                <p className="text-xs font-medium text-slate-200 leading-tight">{user?.name}</p>
                <p className="text-[10px] text-slate-500 leading-tight">{user?.role.replace('_', ' ')}</p>
              </div>
            </div>
            <button onClick={handleLogout} className="hidden rounded-lg p-2 text-slate-400 hover:bg-red-500/10 hover:text-red-300 md:block" title="Logout">
              <IconLogout className="h-4.5 w-4.5" />
            </button>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 pb-24 md:p-8 md:pb-8">
          <Outlet />
        </main>

        <nav className="fixed bottom-0 left-0 right-0 z-30 flex items-center justify-around border-t border-white/8 bg-neutral-950/95 backdrop-blur md:hidden">
          {bottomNavItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/agent'}
              className={({ isActive }) =>
                cn('flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px]', isActive ? 'text-emerald-300' : 'text-slate-500')
              }
            >
              <item.icon className="h-5 w-5" />
              {item.label.split(' ')[0]}
            </NavLink>
          ))}
          <button onClick={() => setDrawerOpen(true)} className="flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] text-slate-500">
            <IconMenu className="h-5 w-5" />
            More
          </button>
        </nav>
      </div>
    </div>
  );
}
