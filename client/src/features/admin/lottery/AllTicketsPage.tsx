import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ticketsApi } from '@/api/tickets';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { StatusBadge } from '@/components/ui/Badge';
import { TicketGridModal } from './TicketGridModal';
import { formatCurrency, formatDate } from '@/utils/format';
import { toast } from '@/store/toastStore';
import type { TicketBatch } from '@/types/api';

export function AllTicketsPage() {
  const qc = useQueryClient();
  const [drawDate, setDrawDate] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [viewingBatch, setViewingBatch] = useState<number | null>(null);

  const { data: cards } = useQuery({ queryKey: ['ticket-summary', drawDate], queryFn: () => ticketsApi.summary(drawDate || undefined) });
  const { data: batches, isLoading } = useQuery({
    queryKey: ['batches', drawDate, statusFilter, page],
    queryFn: () => ticketsApi.listBatches({ drawDate: drawDate || undefined, status: statusFilter || undefined, page, pageSize: 15 }),
  });

  const lockMut = useMutation({
    mutationFn: ticketsApi.lockBatch,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['batches'] });
      toast.success('Batch locked');
    },
  });

  const columns: Column<TicketBatch>[] = [
    { key: 'code', header: 'Batch', render: (r) => <span className="font-mono text-xs text-slate-300">{r.batchCode}</span> },
    { key: 'date', header: 'Draw Date', render: (r) => formatDate(r.drawDate) },
    { key: 'slot', header: 'Slot', render: (r) => r.drawSlot.name },
    { key: 'series', header: 'Series', render: (r) => r.series.name },
    { key: 'range', header: 'Ticket Range', render: (r) => <span className="font-mono text-xs">{r.prefix}-{r.startNumber} … +{r.quantity - 1}</span> },
    { key: 'total', header: 'Total', render: (r) => r.quantity },
    {
      key: 'progress',
      header: 'Sold / Available',
      render: (r) => (
        <div className="w-32">
          <div className="mb-1 flex justify-between text-[10px] text-slate-500">
            <span>{r.counts.sold} sold</span>
            <span>{r.soldPercent}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-white/8">
            <div className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-300" style={{ width: `${r.soldPercent}%` }} />
          </div>
        </div>
      ),
    },
    { key: 'sem', header: 'Total SEM', render: (r) => formatCurrency(r.totalSemValue) },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (r) => (
        <div className="flex justify-end gap-1.5">
          <Button size="sm" variant="secondary" onClick={() => setViewingBatch(r.id)}>
            View
          </Button>
          {r.status === 'OPEN' && (
            <Button size="sm" variant="ghost" onClick={() => confirm('Lock this batch? No more sales will be possible from it.') && lockMut.mutate(r.id)}>
              Lock
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="All Tickets" description="Ticket batches across every draw slot." />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {cards?.map((c) => (
          <Card key={c.drawSlotId} className="p-4">
            <p className="text-xs font-medium text-slate-400">{c.drawSlotName}</p>
            <div className="mt-2 flex items-baseline gap-3">
              <span className="text-lg font-semibold text-emerald-300">{c.available}</span>
              <span className="text-[10px] text-slate-500">avail</span>
              <span className="text-lg font-semibold text-sky-300">{c.sold}</span>
              <span className="text-[10px] text-slate-500">sold</span>
            </div>
            <p className="mt-1 text-[11px] text-slate-500">
              {formatCurrency(c.revenue)} revenue &middot; {c.batchCount} batches
            </p>
          </Card>
        ))}
      </div>

      <Card>
        <div className="flex flex-wrap items-center gap-2 border-b border-white/8 p-4">
          <Input type="date" value={drawDate} onChange={(e) => { setDrawDate(e.target.value); setPage(1); }} className="max-w-44" />
          <Select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="max-w-40">
            <option value="">All batch status</option>
            <option value="OPEN">Open</option>
            <option value="LOCKED">Locked</option>
          </Select>
          {(drawDate || statusFilter) && (
            <Button size="sm" variant="ghost" onClick={() => { setDrawDate(''); setStatusFilter(''); }}>
              Clear filters
            </Button>
          )}
        </div>
        <DataTable
          columns={columns}
          data={batches?.items ?? []}
          rowKey={(r) => r.id}
          loading={isLoading}
          total={batches?.total}
          page={page}
          pageSize={15}
          onPageChange={setPage}
          emptyTitle="No ticket batches yet"
          emptyDescription="Generate tickets from the Generate Tickets page."
        />
      </Card>

      {viewingBatch && <TicketGridModal batchId={viewingBatch} onClose={() => setViewingBatch(null)} />}
    </div>
  );
}
