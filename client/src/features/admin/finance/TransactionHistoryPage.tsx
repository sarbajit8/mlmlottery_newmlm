import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { walletApi } from '@/api/wallet';
import { useDebounce } from '@/hooks/useDebounce';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { Badge } from '@/components/ui/Badge';
import { formatCurrency, formatDateTime } from '@/utils/format';
import { cn } from '@/utils/cn';
import type { WalletTransaction, WalletTransfer, WalletTxnType } from '@/types/api';

const TXN_TYPES: WalletTxnType[] = ['COMMISSION', 'WITHDRAWAL', 'ADJUSTMENT', 'DEPOSIT', 'PURCHASE', 'PRIZE', 'TRANSFER', 'FEE'];

const typeTone: Record<WalletTxnType, 'amber' | 'blue' | 'green' | 'purple' | 'neutral' | 'red'> = {
  COMMISSION: 'green',
  PRIZE: 'amber',
  DEPOSIT: 'blue',
  WITHDRAWAL: 'red',
  PURCHASE: 'purple',
  TRANSFER: 'blue',
  ADJUSTMENT: 'neutral',
  FEE: 'neutral',
};

function Amount({ value }: { value: string }) {
  const n = Number(value);
  return <span className={cn('font-semibold', n < 0 ? 'text-red-300' : 'text-emerald-300')}>{n < 0 ? '−' : '+'} {formatCurrency(Math.abs(n))}</span>;
}

export function TransactionHistoryPage() {
  const [tab, setTab] = useState<'ledger' | 'transfers'>('ledger');
  const [search, setSearch] = useState('');
  const [type, setType] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const q = useDebounce(search, 300);

  const resetPage = () => setPage(1);

  const ledger = useQuery({
    queryKey: ['admin-wallet-ledger', q, type, from, to, page],
    queryFn: () =>
      walletApi.transactions({
        q: q || undefined,
        type: type || undefined,
        from: from || undefined,
        to: to || undefined,
        page,
        pageSize: 25,
      }),
    enabled: tab === 'ledger',
  });

  const transfers = useQuery({
    queryKey: ['admin-wallet-transfers', q, from, to, page],
    queryFn: () => walletApi.listTransfers({ q: q || undefined, from: from || undefined, to: to || undefined, page, pageSize: 25 }),
    enabled: tab === 'transfers',
  });

  const ledgerCols: Column<WalletTransaction>[] = [
    { key: 'when', header: 'Date', render: (r) => <span className="text-xs text-slate-400">{formatDateTime(r.createdAt)}</span> },
    {
      key: 'user',
      header: 'Account',
      render: (r) =>
        r.user ? (
          <div>
            <span className="font-medium text-slate-100">{r.user.name}</span>
            <span className="ml-1.5 font-mono text-[10px] text-slate-500">{r.user.referralCode}</span>
            {r.user.role === 'SUPER_ADMIN' && <span className="ml-1 text-[10px] text-amber-400">admin</span>}
          </div>
        ) : (
          '—'
        ),
    },
    { key: 'type', header: 'Type', render: (r) => <Badge tone={typeTone[r.type]}>{r.type}</Badge> },
    { key: 'amount', header: 'Amount', render: (r) => <Amount value={r.amount} /> },
    { key: 'balance', header: 'Balance After', render: (r) => <span className="text-xs text-slate-400">{formatCurrency(r.balanceAfter)}</span> },
    { key: 'status', header: 'Status', render: (r) => <span className="text-xs text-slate-400">{r.status}</span> },
    { key: 'ref', header: 'Reference', render: (r) => <span className="font-mono text-[10px] text-slate-500">{r.refId ?? '—'}</span> },
  ];

  const transferCols: Column<WalletTransfer>[] = [
    { key: 'when', header: 'Date', render: (r) => <span className="text-xs text-slate-400">{formatDateTime(r.createdAt)}</span> },
    {
      key: 'from',
      header: 'From',
      render: (r) => (
        <div>
          <span className="font-medium text-slate-100">{r.fromUser?.name ?? `#${r.fromUserId}`}</span>
          {r.fromUser && <span className="ml-1.5 font-mono text-[10px] text-slate-500">{r.fromUser.referralCode}</span>}
          {r.fromUser?.role === 'SUPER_ADMIN' && <span className="ml-1 text-[10px] text-amber-400">admin</span>}
        </div>
      ),
    },
    {
      key: 'to',
      header: 'To',
      render: (r) => (
        <div>
          <span className="font-medium text-slate-100">{r.toUser?.name ?? `#${r.toUserId}`}</span>
          {r.toUser && <span className="ml-1.5 font-mono text-[10px] text-slate-500">{r.toUser.referralCode}</span>}
          {r.toUser?.role === 'SUPER_ADMIN' && <span className="ml-1 text-[10px] text-amber-400">admin</span>}
        </div>
      ),
    },
    { key: 'amount', header: 'Amount', render: (r) => <span className="font-semibold text-emerald-300">{formatCurrency(r.amount)}</span> },
  ];

  const data = tab === 'ledger' ? ledger.data : transfers.data;

  return (
    <div>
      <PageHeader
        title="Transaction History"
        description="Every wallet movement across the platform — commissions, prizes, purchases, deposits, withdrawals, admin adjustments and agent-to-agent transfers."
      />

      <Card>
        <div className="flex flex-wrap items-center gap-2 border-b border-white/8 p-4">
          <div className="mr-2 flex rounded-lg border border-white/10 p-0.5 text-xs">
            <button
              onClick={() => { setTab('ledger'); resetPage(); }}
              className={cn('rounded-md px-3 py-1.5 font-medium', tab === 'ledger' ? 'bg-white/10 text-slate-100' : 'text-slate-400')}
            >
              Wallet Ledger
            </button>
            <button
              onClick={() => { setTab('transfers'); resetPage(); }}
              className={cn('rounded-md px-3 py-1.5 font-medium', tab === 'transfers' ? 'bg-white/10 text-slate-100' : 'text-slate-400')}
            >
              Transfers
            </button>
          </div>

          <Input
            placeholder="Search name / referral code…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); resetPage(); }}
            className="max-w-56"
          />
          {tab === 'ledger' && (
            <Select value={type} onChange={(e) => { setType(e.target.value); resetPage(); }} className="max-w-40">
              <option value="">All types</option>
              {TXN_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Select>
          )}
          <Input type="date" value={from} onChange={(e) => { setFrom(e.target.value); resetPage(); }} className="max-w-40" />
          <Input type="date" value={to} onChange={(e) => { setTo(e.target.value); resetPage(); }} className="max-w-40" />
          {(search || type || from || to) && (
            <Button size="sm" variant="ghost" onClick={() => { setSearch(''); setType(''); setFrom(''); setTo(''); resetPage(); }}>
              Clear
            </Button>
          )}
        </div>

        <div className="overflow-x-auto">
          {tab === 'ledger' ? (
            <DataTable
              columns={ledgerCols}
              data={ledger.data?.items ?? []}
              rowKey={(r) => r.id}
              loading={ledger.isLoading}
              total={data?.total}
              page={page}
              pageSize={25}
              onPageChange={setPage}
              emptyTitle="No transactions"
            />
          ) : (
            <DataTable
              columns={transferCols}
              data={transfers.data?.items ?? []}
              rowKey={(r) => r.id}
              loading={transfers.isLoading}
              total={data?.total}
              page={page}
              pageSize={25}
              onPageChange={setPage}
              emptyTitle="No transfers"
            />
          )}
        </div>
      </Card>
    </div>
  );
}
