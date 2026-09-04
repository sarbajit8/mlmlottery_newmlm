import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ticketsApi } from '@/api/tickets';
import { Modal } from '@/components/ui/Modal';
import { Input, Select } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { formatCurrency } from '@/utils/format';
import { downloadFile } from '@/utils/download';
import { IconDownload } from '@/components/ui/icons';
import { cn } from '@/utils/cn';
import type { TicketStatus } from '@/types/api';

const statusChipClass: Record<TicketStatus, string> = {
  AVAILABLE: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25',
  SOLD: 'bg-sky-500/15 text-sky-300 border-sky-500/25',
  WINNER: 'bg-amber-500/20 text-amber-200 border-amber-500/40 ring-1 ring-amber-400/40',
  CANCELLED: 'bg-white/5 text-slate-500 border-white/10',
};

export function TicketGridModal({ batchId, onClose }: { batchId: number; onClose: () => void }) {
  const [status, setStatus] = useState<TicketStatus | ''>('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data: batch } = useQuery({ queryKey: ['batch', batchId], queryFn: () => ticketsApi.getBatch(batchId) });
  const { data: tickets, isLoading } = useQuery({
    queryKey: ['batch-tickets', batchId, status, search, page],
    queryFn: () => ticketsApi.getBatchTickets(batchId, { status: status || undefined, search: search || undefined, page, pageSize: 300 }),
  });

  return (
    <Modal open onClose={onClose} size="xl" title={batch ? `${batch.batchCode} — ${batch.prefix} tickets` : 'Ticket Batch'}>
      {batch && (
        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <MiniStat label="Available" value={batch.counts.AVAILABLE ?? 0} tone="emerald" />
          <MiniStat label="Sold" value={(batch.counts.SOLD ?? 0) + (batch.counts.WINNER ?? 0)} tone="sky" />
          <MiniStat label="Total SEM" value={formatCurrency(batch.totalSemValue)} tone="amber" />
          <MiniStat label="Quantity" value={batch.quantity} tone="slate" />
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Input placeholder="Search ticket number…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="max-w-56" />
        <Select value={status} onChange={(e) => { setStatus(e.target.value as TicketStatus | ''); setPage(1); }} className="max-w-40">
          <option value="">All statuses</option>
          <option value="AVAILABLE">Available</option>
          <option value="SOLD">Sold</option>
          <option value="WINNER">Winner</option>
          <option value="CANCELLED">Cancelled</option>
        </Select>
        <Button
          variant="secondary"
          size="sm"
          icon={<IconDownload className="h-3.5 w-3.5" />}
          onClick={() => downloadFile(ticketsApi.exportBatchUrl(batchId), `${batch?.batchCode ?? 'batch'}.csv`)}
        >
          Export CSV
        </Button>
        <div className="ml-auto flex gap-3 text-[11px] text-slate-500">
          <Legend color="bg-emerald-400" label="Available" />
          <Legend color="bg-sky-400" label="Sold" />
          <Legend color="bg-amber-400" label="Winner" />
          <Legend color="bg-slate-500" label="Cancelled" />
        </div>
      </div>

      {isLoading ? (
        <p className="py-10 text-center text-sm text-slate-500">Loading tickets…</p>
      ) : (
        <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4 md:grid-cols-6">
          {tickets?.items.map((t) => (
            <div
              key={t.id}
              title={`${t.ticketNumber} — ${t.status}`}
              className={cn('truncate rounded-md border px-2 py-1.5 text-center font-mono text-[11px]', statusChipClass[t.status])}
            >
              {t.ticketNumber}
            </div>
          ))}
        </div>
      )}

      {tickets && tickets.total > 300 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-xs text-slate-500">
            Page {page} of {Math.ceil(tickets.total / 300)} &middot; {tickets.total} tickets
          </p>
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Previous
            </Button>
            <Button size="sm" variant="secondary" disabled={page >= Math.ceil(tickets.total / 300)} onClick={() => setPage((p) => p + 1)}>
              Next
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

function MiniStat({ label, value, tone }: { label: string; value: React.ReactNode; tone: 'emerald' | 'sky' | 'amber' | 'slate' }) {
  const toneClass = { emerald: 'text-emerald-300', sky: 'text-sky-300', amber: 'text-amber-300', slate: 'text-slate-300' }[tone];
  return (
    <div className="rounded-lg border border-white/8 px-3 py-2">
      <p className="text-[10px] uppercase tracking-wide text-slate-500">{label}</p>
      <p className={cn('mt-0.5 text-sm font-semibold', toneClass)}>{value}</p>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1">
      <span className={cn('h-2 w-2 rounded-full', color)} />
      {label}
    </span>
  );
}
