import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { resultsApi } from '@/api/results';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { Badge } from '@/components/ui/Badge';
import { formatCurrency, formatDateTime } from '@/utils/format';
import type { DrawResultWinnerEntry, PrizeTier } from '@/types/api';

const tierLabel: Record<PrizeTier, string> = { FIRST: '1st Prize', SECOND: '2nd Prize', THIRD: '3rd Prize', FOURTH: '4th Prize', FIFTH: '5th Prize' };
const tierTone: Record<PrizeTier, 'amber' | 'blue' | 'purple' | 'green' | 'neutral'> = { FIRST: 'amber', SECOND: 'blue', THIRD: 'purple', FOURTH: 'green', FIFTH: 'neutral' };

export function MyWinnersPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useQuery({ queryKey: ['my-winners', page], queryFn: () => resultsApi.listWinners({ mine: true, page, pageSize: 20 }) });

  const columns: Column<DrawResultWinnerEntry>[] = [
    { key: 'ticket', header: 'Winning Ticket', render: (r) => <span className="font-mono text-emerald-300">{r.ticket.ticketNumber}</span> },
    { key: 'tier', header: 'Tier', render: (r) => <Badge tone={tierTone[r.prizeTier]}>{tierLabel[r.prizeTier]}</Badge> },
    { key: 'draw', header: 'Draw', render: (r) => `${r.drawResult?.drawName} #${r.drawResult?.drawNumber}` },
    { key: 'slot', header: 'Slot', render: (r) => r.drawResult?.drawSlot.name },
    { key: 'customer', header: 'Customer', render: (r) => r.ticket.soldToCustomer?.name ?? '—' },
    { key: 'gross', header: 'Prize Won', render: (r) => <span className="text-slate-400">{formatCurrency(r.grossPrizeAmount)}</span> },
    {
      key: 'prize',
      header: 'Net Prize',
      render: (r) => {
        const cut = Number(r.grossPrizeAmount) - Number(r.prizeAmount);
        return (
          <span className="font-semibold text-amber-300">
            {formatCurrency(r.prizeAmount)}
            {cut > 0 && <span className="ml-1 text-[10px] font-normal text-slate-500">(− {formatCurrency(cut)} commission)</span>}
          </span>
        );
      },
    },
    { key: 'declared', header: 'Declared At', render: (r) => (r.drawResult ? formatDateTime(r.drawResult.declaredAt) : '—') },
  ];

  return (
    <div>
      <PageHeader title="My Winners" description="Winning tickets you sold. When a result is declared you get the Net Prize plus your own level-1 win commission in your wallet; the rest of the commission goes up your sponsor chain." />
      <Card>
        <DataTable columns={columns} data={data?.items ?? []} rowKey={(r) => r.id} loading={isLoading} total={data?.total} page={page} pageSize={20} onPageChange={setPage} emptyTitle="None of your tickets have won yet" accent="emerald" />
      </Card>
    </div>
  );
}
