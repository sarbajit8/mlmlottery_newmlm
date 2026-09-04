import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { mlmApi } from '@/api/mlm';
import { ticketsApi } from '@/api/tickets';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { formatCurrency, formatNumber } from '@/utils/format';

export function ReportsPage() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [leaderboardType, setLeaderboardType] = useState<'personal' | 'team'>('personal');

  const { data: summary } = useQuery({ queryKey: ['finance-summary'], queryFn: () => ticketsApi.summary() });
  const { data: leaderboard } = useQuery({
    queryKey: ['leaderboard', leaderboardType, from, to],
    queryFn: () => mlmApi.leaderboard({ type: leaderboardType, from: from || undefined, to: to || undefined, limit: 15 }) as any,
  });

  const totalRevenue = summary?.reduce((sum, s) => sum + Number(s.revenue), 0) ?? 0;
  const totalSold = summary?.reduce((sum, s) => sum + s.sold, 0) ?? 0;

  return (
    <div>
      <PageHeader
        title="Reports"
        description="Slot-wise revenue and top-performer leaderboards."
        actions={
          <div className="flex gap-2">
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Slot-wise Revenue (all-time)</CardTitle>
          </CardHeader>
          <CardBody className="space-y-2">
            {summary?.map((s) => (
              <div key={s.drawSlotId} className="flex items-center justify-between text-sm">
                <span className="text-slate-300">{s.drawSlotName}</span>
                <span className="text-slate-200">
                  {formatNumber(s.sold)} sold &middot; <span className="font-medium text-emerald-300">{formatCurrency(s.revenue)}</span>
                </span>
              </div>
            ))}
            <div className="mt-2 flex items-center justify-between border-t border-white/8 pt-2 text-sm font-semibold">
              <span className="text-slate-200">Total</span>
              <span>
                {formatNumber(totalSold)} sold &middot; <span className="text-emerald-300">{formatCurrency(totalRevenue)}</span>
              </span>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Leaderboard</CardTitle>
            <div className="flex gap-1.5">
              <Button size="sm" variant={leaderboardType === 'personal' ? 'primary' : 'secondary'} onClick={() => setLeaderboardType('personal')}>
                Personal
              </Button>
              <Button size="sm" variant={leaderboardType === 'team' ? 'primary' : 'secondary'} onClick={() => setLeaderboardType('team')}>
                Team
              </Button>
            </div>
          </CardHeader>
          <CardBody className="space-y-2">
            {leaderboard?.map((row: any, i: number) => (
              <div key={row.agent?.id ?? i} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-slate-300">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/8 text-[10px] text-slate-400">{i + 1}</span>
                  {row.agent?.name ?? '—'}
                </span>
                <span className="font-medium text-amber-300">{formatCurrency(row.totalSemValue ?? row.teamSemValue ?? 0)}</span>
              </div>
            ))}
            {!leaderboard?.length && <p className="py-6 text-center text-sm text-slate-500">No sales data yet</p>}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
