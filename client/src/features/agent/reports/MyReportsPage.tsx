import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { salesApi } from '@/api/sales';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { formatCurrency, formatDateTime } from '@/utils/format';
import { exportRowsAsCsv } from '@/utils/csvClient';
import { IconDownload, IconTicket } from '@/components/ui/icons';
import type { Receipt } from '@/types/api';

export function MyReportsPage() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['my-sales', from, to, page],
    queryFn: () => salesApi.list({ from: from || undefined, to: to || undefined, page, pageSize: 20 }),
  });

  const totalAmount = data?.items.reduce((sum, r) => sum + Number(r.totalAmount), 0) ?? 0;
  const totalTickets = data?.items.reduce((sum, r) => sum + r.totalTickets, 0) ?? 0;

  const columns: Column<Receipt>[] = [
    { key: 'code', header: 'Receipt', render: (r) => <span className="font-mono text-xs text-emerald-300">{r.receiptCode}</span> },
    { key: 'date', header: 'Date', render: (r) => formatDateTime(r.createdAt) },
    { key: 'slot', header: 'Slot', render: (r) => r.drawSlot?.name },
    { key: 'customer', header: 'Customer', render: (r) => r.customer?.name },
    { key: 'tickets', header: 'Tickets', render: (r) => r.totalTickets },
    { key: 'sem', header: 'Total SEM', render: (r) => formatCurrency(r.totalSemValue) },
    { key: 'amount', header: 'Amount', render: (r) => <span className="font-semibold text-emerald-300">{formatCurrency(r.totalAmount)}</span> },
    { key: 'txn', header: 'Payment', render: (r) => <span className="font-mono text-xs text-slate-400">{r.transactionId ?? 'Wallet'}</span> },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (r) => (
        <a href={`/agent/receipts/${r.id}/print`} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>
          <Button size="sm" variant="secondary" accent="emerald" icon={<IconTicket className="h-3.5 w-3.5" />}>
            Print
          </Button>
        </a>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="My Reports"
        description="Your personal sales history."
        actions={
          <div className="flex flex-wrap gap-2">
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            <Button
              variant="secondary"
              accent="emerald"
              icon={<IconDownload className="h-4 w-4" />}
              onClick={() =>
                data &&
                exportRowsAsCsv(
                  'my-sales.csv',
                  ['Receipt', 'Date', 'Slot', 'Customer', 'Tickets', 'Total SEM', 'Amount', 'Payment'],
                  data.items.map((r) => [
                    r.receiptCode,
                    r.createdAt,
                    r.drawSlot?.name ?? '',
                    r.customer?.name ?? '',
                    r.totalTickets,
                    r.totalSemValue,
                    r.totalAmount,
                    r.transactionId ?? 'Wallet',
                  ]),
                )
              }
            >
              Export
            </Button>
          </div>
        }
      />

      <div className="mb-4 flex gap-4 text-sm text-slate-400">
        <span>
          Tickets: <span className="font-semibold text-slate-200">{totalTickets}</span>
        </span>
        <span>
          Amount: <span className="font-semibold text-emerald-300">{formatCurrency(totalAmount)}</span>
        </span>
      </div>

      <Card>
        <DataTable columns={columns} data={data?.items ?? []} rowKey={(r) => r.id} loading={isLoading} total={data?.total} page={page} pageSize={20} onPageChange={setPage} emptyTitle="No sales yet" accent="emerald" />
      </Card>
    </div>
  );
}
