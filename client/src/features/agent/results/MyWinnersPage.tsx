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
    { key: 'prize', header: 'Prize', render: (r) => <span className="font-semibold text-amber-300">{formatCurrency(r.prizeAmount)}</span> },
    { key: 'declared', header: 'Declared At', render: (r) => (r.drawResult ? formatDateTime(r.drawResult.declaredAt) : '—') },
  ];

  return (
    <div>
      <PageHeader title="My Winners" description="Winning tickets sold by you — prize amounts are credited straight to your wallet the moment a result is declared." />
      <Card>
        <DataTable columns={columns} data={data?.items ?? []} rowKey={(r) => r.id} loading={isLoading} total={data?.total} page={page} pageSize={20} onPageChange={setPage} emptyTitle="None of your tickets have won yet" accent="emerald" />
      </Card>
    </div>
  );
}
