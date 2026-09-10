import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { walletApi } from '@/api/wallet';
import { apiErrorMessage } from '@/api/axiosClient';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Input';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import { toast } from '@/store/toastStore';
import { cn } from '@/utils/cn';
import { formatCurrency, formatDateTime } from '@/utils/format';
import { WalletAdjust } from './WalletAdjust';
import type { DepositRequest, DepositStatus, WalletAdjustment } from '@/types/api';

export function DepositRequestsPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<'requests' | 'adjustments'>('requests');
  const [status, setStatus] = useState<DepositStatus | ''>('PENDING');
  const [page, setPage] = useState(1);
  const [adjPage, setAdjPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['deposits', status, page],
    queryFn: () => walletApi.listDeposits({ status: status || undefined, page, pageSize: 20 }),
    enabled: tab === 'requests',
  });

  const { data: adjustments, isLoading: adjLoading } = useQuery({
    queryKey: ['wallet-adjustments', adjPage],
    queryFn: () => walletApi.adjustments({ page: adjPage, pageSize: 20 }),
    enabled: tab === 'adjustments',
  });

  const processMut = useMutation({
    mutationFn: (vars: { id: number; status: 'APPROVED' | 'REJECTED' }) => walletApi.processDeposit(vars.id, vars.status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['deposits'] });
      toast.success('Deposit updated');
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });

  const columns: Column<DepositRequest>[] = [
    { key: 'user', header: 'Agent', render: (r) => <span className="font-medium text-slate-100">{r.user?.name}</span> },
    { key: 'code', header: 'Referral Code', render: (r) => <span className="font-mono text-xs">{r.user?.referralCode}</span> },
    { key: 'amount', header: 'Amount', render: (r) => <span className="font-semibold text-emerald-300">{formatCurrency(r.amount)}</span> },
    { key: 'txn', header: 'Payment Proof', render: (r) => <span className="font-mono text-xs text-slate-400">{r.transactionId ?? (r.note ? `Admin credit — ${r.note}` : 'Admin credit')}</span> },
    { key: 'requested', header: 'Requested At', render: (r) => formatDateTime(r.requestedAt) },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (r) =>
        r.status === 'PENDING' ? (
          <div className="flex justify-end gap-1.5">
            <Button size="sm" onClick={() => processMut.mutate({ id: r.id, status: 'APPROVED' })}>
              Approve
            </Button>
            <Button size="sm" variant="danger" onClick={() => processMut.mutate({ id: r.id, status: 'REJECTED' })}>
              Reject
            </Button>
          </div>
        ) : null,
    },
  ];

  const adjColumns: Column<WalletAdjustment>[] = [
    { key: 'when', header: 'Date', render: (r) => <span className="text-xs text-slate-400">{formatDateTime(r.at)}</span> },
    {
      key: 'agent',
      header: 'Agent',
      render: (r) =>
        r.user ? (
          <div>
            <span className="font-medium text-slate-100">{r.user.name}</span>
            <span className="ml-1.5 font-mono text-[10px] text-slate-500">{r.user.referralCode}</span>
          </div>
        ) : (
          '—'
        ),
    },
    { key: 'kind', header: 'Type', render: (r) => <Badge tone={r.kind === 'CREDIT' ? 'green' : 'red'}>{r.kind === 'CREDIT' ? 'Credit' : 'Debit'}</Badge> },
    {
      key: 'amount',
      header: 'Amount',
      render: (r) => (
        <span className={cn('font-semibold', r.kind === 'CREDIT' ? 'text-emerald-300' : 'text-red-300')}>
          {r.kind === 'CREDIT' ? '+' : '−'} {formatCurrency(r.amount)}
        </span>
      ),
    },
    { key: 'note', header: 'Note / Reason', render: (r) => <span className="text-xs text-slate-400">{r.note ?? '—'}</span> },
    { key: 'by', header: 'By', render: (r) => <span className="text-xs text-slate-500">{r.by ?? 'Admin'}</span> },
  ];

  return (
    <div>
      <PageHeader
        title="Deposits & Wallet Adjustments"
        description="Approve or reject agent wallet top-ups, or credit / debit an agent's wallet directly. The Adjustments tab lists every manual credit and debit."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {/* After a direct credit/debit, drop the "Pending" filter so the just-made entry is visible. */}
            <WalletAdjust onDone={() => { setStatus(''); setPage(1); setAdjPage(1); }} />
          </div>
        }
      />

      <div className="mb-4 flex gap-2">
        <Button size="sm" variant={tab === 'requests' ? 'primary' : 'secondary'} onClick={() => setTab('requests')}>
          Deposit Requests
        </Button>
        <Button size="sm" variant={tab === 'adjustments' ? 'primary' : 'secondary'} onClick={() => setTab('adjustments')}>
          Manual Adjustments
        </Button>
      </div>

      {tab === 'requests' ? (
        <Card>
          <div className="flex flex-wrap items-center gap-2 border-b border-white/8 p-4">
            <Select value={status} onChange={(e) => { setStatus(e.target.value as DepositStatus | ''); setPage(1); }} className="max-w-40">
              <option value="">All statuses</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
            </Select>
          </div>
          <div className="overflow-x-auto">
            <DataTable columns={columns} data={data?.items ?? []} rowKey={(r) => r.id} loading={isLoading} total={data?.total} page={page} pageSize={20} onPageChange={setPage} emptyTitle="No deposit requests" />
          </div>
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <DataTable
              columns={adjColumns}
              data={adjustments?.items ?? []}
              rowKey={(r) => r.id}
              loading={adjLoading}
              total={adjustments?.total}
              page={adjPage}
              pageSize={20}
              onPageChange={setAdjPage}
              emptyTitle="No manual adjustments yet"
              emptyDescription="Direct wallet credits and debits will appear here."
            />
          </div>
        </Card>
      )}
    </div>
  );
}
