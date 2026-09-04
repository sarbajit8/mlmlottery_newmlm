import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { resultsApi } from '@/api/results';
import { drawSlotsApi } from '@/api/drawSlots';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { Input, Select } from '@/components/ui/Input';
import { formatCurrency, formatDate } from '@/utils/format';
import type { DrawResultListItem } from '@/types/api';

export function ResultsPage() {
  const [drawDate, setDrawDate] = useState('');
  const [drawSlotId, setDrawSlotId] = useState('');
  const [page, setPage] = useState(1);

  const { data: slots } = useQuery({ queryKey: ['draw-slots'], queryFn: drawSlotsApi.list });
  const { data, isLoading } = useQuery({
    queryKey: ['results', drawDate, drawSlotId, page],
    queryFn: () => resultsApi.list({ drawDate: drawDate || undefined, drawSlotId: drawSlotId ? Number(drawSlotId) : undefined, page, pageSize: 20 }),
  });

  const columns: Column<DrawResultListItem>[] = [
    { key: 'name', header: 'Draw Name', render: (r) => <span className="font-medium text-slate-100">{r.drawName}</span> },
    { key: 'number', header: 'Draw No.', render: (r) => r.drawNumber },
    { key: 'date', header: 'Draw Date', render: (r) => formatDate(r.drawDate) },
    { key: 'slot', header: 'Slot', render: (r) => r.drawSlot.name },
    { key: '1st', header: '1st Prize', render: (r) => <span className="font-mono text-emerald-300">{r.firstPrizeTicket.ticketNumber}</span> },
    { key: 'amount', header: '1st Prize Amount', render: (r) => formatCurrency(r.firstPrizeAmount) },
    { key: 'winners', header: 'Total Winners', render: (r) => <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-300">{r.totalWinners}</span> },
  ];

  return (
    <div>
      <PageHeader title="Results" description="Every declared draw result." />
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
        <DataTable columns={columns} data={data?.items ?? []} rowKey={(r) => r.id} loading={isLoading} total={data?.total} page={page} pageSize={20} onPageChange={setPage} emptyTitle="No results declared yet" accent="emerald" />
      </Card>
    </div>
  );
}
