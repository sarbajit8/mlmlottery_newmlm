import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { resultsApi } from '@/api/results';
import { drawSlotsApi } from '@/api/drawSlots';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { Input, Select } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { formatCurrency, formatDateTime } from '@/utils/format';
import type { DrawResultWinnerEntry, PrizeTier } from '@/types/api';

const tierLabel: Record<PrizeTier, string> = { FIRST: '1st Prize', SECOND: '2nd Prize', THIRD: '3rd Prize', FOURTH: '4th Prize', FIFTH: '5th Prize' };
const tierTone: Record<PrizeTier, 'amber' | 'blue' | 'purple' | 'green' | 'neutral'> = { FIRST: 'amber', SECOND: 'blue', THIRD: 'purple', FOURTH: 'green', FIFTH: 'neutral' };

export function PrizeWinnersPage() {
  const [drawDate, setDrawDate] = useState('');
  const [drawSlotId, setDrawSlotId] = useState('');
  const [page, setPage] = useState(1);

  const { data: slots } = useQuery({ queryKey: ['draw-slots'], queryFn: drawSlotsApi.list });
  const { data, isLoading } = useQuery({
    queryKey: ['winners-all', drawDate, drawSlotId, page],
    queryFn: () => resultsApi.listWinners({ drawDate: drawDate || undefined, drawSlotId: drawSlotId ? Number(drawSlotId) : undefined, page, pageSize: 20 }),
  });

  const columns: Column<DrawResultWinnerEntry>[] = [
    { key: 'ticket', header: 'Ticket #', render: (r) => <span className="font-mono text-amber-300">{r.ticket.ticketNumber}</span> },
    { key: 'tier', header: 'Tier', render: (r) => <Badge tone={tierTone[r.prizeTier]}>{tierLabel[r.prizeTier]}</Badge> },
    { key: 'draw', header: 'Draw', render: (r) => `${r.drawResult?.drawName} #${r.drawResult?.drawNumber}` },
    { key: 'slot', header: 'Slot', render: (r) => r.drawResult?.drawSlot.name },
    { key: 'prize', header: 'Prize', render: (r) => <span className="font-semibold text-emerald-300">{formatCurrency(r.prizeAmount)}</span> },
    { key: 'agent', header: 'Sold By', render: (r) => r.ticket.soldByAgent?.name ?? '—' },
    { key: 'customer', header: 'Customer', render: (r) => r.ticket.soldToCustomer?.name ?? '—' },
    { key: 'declared', header: 'Declared At', render: (r) => (r.drawResult ? formatDateTime(r.drawResult.declaredAt) : '—') },
  ];

  return (
    <div>
      <PageHeader title="Prize Winners" description="Every winning ticket across every declared result, all tiers." />
      <Card>
        <div className="flex flex-wrap items-center gap-2 border-b border-white/8 p-4">
          <Input type="date" value={drawDate} onChange={(e) => { setDrawDate(e.target.value); setPage(1); }} className="max-w-44" />
          <Select value={drawSlotId} onChange={(e) => { setDrawSlotId(e.target.value); setPage(1); }} className="max-w-48">
            <option value="">All slots</option>
            {slots?.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </div>
        <DataTable columns={columns} data={data?.items ?? []} rowKey={(r) => r.id} loading={isLoading} total={data?.total} page={page} pageSize={20} onPageChange={setPage} emptyTitle="No winners yet" />
      </Card>
    </div>
  );
}
