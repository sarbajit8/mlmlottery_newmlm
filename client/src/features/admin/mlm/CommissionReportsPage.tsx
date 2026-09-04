import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { mlmApi } from '@/api/mlm';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { StatCard } from '@/components/ui/StatCard';
import { Input } from '@/components/ui/Input';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { formatCurrency, formatDateTime } from '@/utils/format';
import { IconTrophy, IconWallet } from '@/components/ui/icons';
import type { CommissionLedgerEntry } from '@/types/api';

export function CommissionReportsPage() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);

  const { data: report } = useQuery({ queryKey: ['payout-report', from, to], queryFn: () => mlmApi.payoutReport({ from: from || undefined, to: to || undefined }) as any });
  const { data: ledger, isLoading } = useQuery({
    queryKey: ['ledger', from, to, page],
    queryFn: () => mlmApi.listCommissions({ from: from || undefined, to: to || undefined, page, pageSize: 20 }),
  });

  const columns: Column<CommissionLedgerEntry>[] = [
    { key: 'date', header: 'Date', render: (r) => formatDateTime(r.createdAt) },
    { key: 'earner', header: 'Earning Agent', render: (r) => `Level ${r.levelNumber}` },
    { key: 'source', header: 'From', render: (r) => r.sourceAgent.name },
    { key: 'ticket', header: 'Ticket', render: (r) => <span className="font-mono text-xs">{r.ticket.ticketNumber}</span> },
    { key: 'sem', header: 'SEM Value', render: (r) => formatCurrency(r.semValue) },
    { key: 'pct', header: '%', render: (r) => `${Number(r.percentageApplied)}%` },
    { key: 'amount', header: 'Commission', render: (r) => <span className="font-semibold text-amber-300">{formatCurrency(r.commissionAmount)}</span> },
    { key: 'status', header: 'Status', render: (r) => r.status },
  ];

  return (
    <div>
      <PageHeader
        title="Commission Reports"
        description="Company-wide commission payouts, level breakdown, and top earners."
        actions={
          <div className="flex gap-2">
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
        }
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard label="Total Commission Paid" value={formatCurrency(report?.totalCommission ?? 0)} icon={<IconWallet className="h-5 w-5" />} accent="amber" />
        <StatCard label="Total Ledger Entries" value={report?.totalEntries ?? 0} icon={<IconTrophy className="h-5 w-5" />} accent="violet" />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Level-wise Liability</CardTitle>
          </CardHeader>
          <CardBody className="space-y-2">
            {report?.byLevel?.map((l: any) => (
              <div key={l.level} className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Level {l.level}</span>
                <span className="text-slate-200">{formatCurrency(l.totalCommission)} <span className="text-xs text-slate-500">({l.entries})</span></span>
              </div>
            ))}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Earners</CardTitle>
          </CardHeader>
          <CardBody className="space-y-2">
            {report?.byAgent?.slice(0, 8).map((a: any) => (
              <div key={a.agent?.id} className="flex items-center justify-between text-sm">
                <span className="text-slate-300">{a.agent?.name ?? '—'}</span>
                <span className="font-medium text-amber-300">{formatCurrency(a.totalCommission)}</span>
              </div>
            ))}
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ledger</CardTitle>
        </CardHeader>
        <DataTable columns={columns} data={ledger?.items ?? []} rowKey={(r) => r.id} loading={isLoading} total={ledger?.total} page={page} pageSize={20} onPageChange={setPage} emptyTitle="No commission entries yet" />
      </Card>
    </div>
  );
}
