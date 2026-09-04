import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { dashboardApi } from '@/api/dashboard';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { CardSkeleton } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/Button';
import { formatCurrency, formatNumber } from '@/utils/format';
import { IconCart, IconNetwork, IconTicket, IconWallet } from '@/components/ui/icons';

export function AgentDashboardPage() {
  const { data, isLoading } = useQuery({ queryKey: ['agent-dashboard'], queryFn: dashboardApi.agent, refetchInterval: 30000 });

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Your sales, commissions and team performance."
        actions={
          <Link to="/agent/sell">
            <Button accent="emerald" icon={<IconCart className="h-4 w-4" />}>
              Sell Tickets
            </Button>
          </Link>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        {isLoading || !data ? (
          Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)
        ) : (
          <>
            <StatCard label="Today's SEM" value={formatCurrency(data.todaySemValue)} icon={<IconTicket className="h-5 w-5" />} accent="emerald" />
            <StatCard label="Today's Tickets" value={formatNumber(data.todayTicketCount)} icon={<IconTicket className="h-5 w-5" />} accent="emerald" />
            <StatCard label="Today's Commission" value={formatCurrency(data.todayCommission)} icon={<IconWallet className="h-5 w-5" />} accent="amber" />
            <StatCard label="Monthly SEM" value={formatCurrency(data.monthlySemValue)} icon={<IconTicket className="h-5 w-5" />} accent="sky" />
            <StatCard label="Team Sales" value={formatCurrency(data.teamSales)} icon={<IconNetwork className="h-5 w-5" />} accent="violet" />
            <StatCard label="Direct Referrals" value={formatNumber(data.directReferrals)} icon={<IconNetwork className="h-5 w-5" />} accent="violet" />
          </>
        )}
      </div>
    </div>
  );
}
