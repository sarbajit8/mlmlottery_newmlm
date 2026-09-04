import { useQuery } from '@tanstack/react-query';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { dashboardApi } from '@/api/dashboard';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { CardSkeleton } from '@/components/ui/Skeleton';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/Card';
import { formatCurrency, formatNumber, formatDate } from '@/utils/format';
import { IconTicket, IconWallet, IconUsers, IconTrophy } from '@/components/ui/icons';

export function AdminDashboardPage() {
  const { data, isLoading } = useQuery({ queryKey: ['admin-dashboard'], queryFn: dashboardApi.admin, refetchInterval: 30000 });

  return (
    <div>
      <PageHeader title="Dashboard" description="Live overview of sales, revenue and MLM payouts across the platform." />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {isLoading || !data ? (
          Array.from({ length: 8 }).map((_, i) => <CardSkeleton key={i} />)
        ) : (
          <>
            <StatCard label="Tickets Sold Today" value={formatNumber(data.ticketsSoldToday)} icon={<IconTicket className="h-5 w-5" />} accent="amber" />
            <StatCard label="Revenue Today" value={formatCurrency(data.revenueToday)} icon={<IconWallet className="h-5 w-5" />} accent="emerald" />
            <StatCard label="Active Agents" value={formatNumber(data.activeAgents)} icon={<IconUsers className="h-5 w-5" />} accent="sky" />
            <StatCard label="Pending Withdrawals" value={formatNumber(data.pendingWithdrawals)} icon={<IconWallet className="h-5 w-5" />} accent="rose" />
            <StatCard label="Tickets Sold (All Time)" value={formatNumber(data.ticketsSoldTotal)} icon={<IconTicket className="h-5 w-5" />} accent="amber" />
            <StatCard label="Revenue (All Time)" value={formatCurrency(data.revenueTotal)} icon={<IconWallet className="h-5 w-5" />} accent="emerald" />
            <StatCard label="Commission Paid Today" value={formatCurrency(data.commissionPaidToday)} icon={<IconTrophy className="h-5 w-5" />} accent="violet" />
            <StatCard label="Commission Paid (All Time)" value={formatCurrency(data.commissionPaidTotal)} icon={<IconTrophy className="h-5 w-5" />} accent="violet" />
          </>
        )}
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Sales Trend — Last 7 Days</CardTitle>
        </CardHeader>
        <CardBody>
          {data && (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={data.trend}>
                <defs>
                  <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#ffffff10" vertical={false} />
                <XAxis dataKey="date" tickFormatter={(v) => formatDate(v)} stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ background: '#0a0e16', border: '1px solid #ffffff15', borderRadius: 12, fontSize: 12 }}
                  labelFormatter={(v) => formatDate(v as string)}
                  formatter={(value, name) => [name === 'revenue' ? formatCurrency(Number(value)) : Number(value), name === 'revenue' ? 'Revenue' : 'Tickets']}
                />
                <Area type="monotone" dataKey="revenue" stroke="#f59e0b" fill="url(#revenueFill)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
