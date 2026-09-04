import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { walletApi } from '@/api/wallet';
import { usersApi } from '@/api/users';
import { apiErrorMessage } from '@/api/axiosClient';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input, Select } from '@/components/ui/Input';
import { FormField } from '@/components/ui/FormField';
import { StatusBadge } from '@/components/ui/Badge';
import { toast } from '@/store/toastStore';
import { formatCurrency, formatDateTime } from '@/utils/format';
import { IconMinus, IconPlus } from '@/components/ui/icons';
import type { DepositRequest, DepositStatus } from '@/types/api';

export function DepositRequestsPage() {
  const qc = useQueryClient();
  const [status, setStatus] = useState<DepositStatus | ''>('PENDING');
  const [page, setPage] = useState(1);

  const [creditOpen, setCreditOpen] = useState(false);
  const [creditUserId, setCreditUserId] = useState('');
  const [creditAmount, setCreditAmount] = useState('');
  const [creditNote, setCreditNote] = useState('');
  const [creditError, setCreditError] = useState<string | null>(null);

  const [debitOpen, setDebitOpen] = useState(false);
  const [debitUserId, setDebitUserId] = useState('');
  const [debitAmount, setDebitAmount] = useState('');
  const [debitNote, setDebitNote] = useState('');
  const [debitError, setDebitError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['deposits', status, page],
    queryFn: () => walletApi.listDeposits({ status: status || undefined, page, pageSize: 20 }),
  });
  const { data: agents } = useQuery({
    queryKey: ['users-agents-for-credit'],
    queryFn: () => usersApi.list({ role: 'AGENT', pageSize: 200 }),
    enabled: creditOpen || debitOpen,
  });

  const processMut = useMutation({
    mutationFn: (vars: { id: number; status: 'APPROVED' | 'REJECTED' }) => walletApi.processDeposit(vars.id, vars.status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['deposits'] });
      toast.success('Deposit updated');
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });

  const creditMut = useMutation({
    mutationFn: () => walletApi.adminCredit({ userId: Number(creditUserId), amount: Number(creditAmount), note: creditNote.trim() || undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['deposits'] });
      toast.success('Wallet credited');
      setCreditOpen(false);
      setCreditUserId('');
      setCreditAmount('');
      setCreditNote('');
      setCreditError(null);
    },
    onError: (err) => setCreditError(apiErrorMessage(err)),
  });

  const debitMut = useMutation({
    mutationFn: () => walletApi.adminDebit({ userId: Number(debitUserId), amount: Number(debitAmount), note: debitNote.trim() || undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['deposits'] });
      toast.success('Wallet debited');
      setDebitOpen(false);
      setDebitUserId('');
      setDebitAmount('');
      setDebitNote('');
      setDebitError(null);
    },
    onError: (err) => setDebitError(apiErrorMessage(err)),
  });

  const selectedCreditAgent = agents?.items.find((a) => a.id === Number(creditUserId));
  const selectedDebitAgent = agents?.items.find((a) => a.id === Number(debitUserId));

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

  return (
    <div>
      <PageHeader
        title="Deposit Requests"
        description="Approve or reject agent wallet top-ups, or credit/debit an individual agent's wallet directly."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button icon={<IconPlus className="h-4 w-4" />} onClick={() => setCreditOpen(true)}>
              Credit Wallet
            </Button>
            <Button variant="secondary" accent="amber" icon={<IconMinus className="h-4 w-4" />} onClick={() => setDebitOpen(true)}>
              Debit Wallet
            </Button>
            <Select value={status} onChange={(e) => { setStatus(e.target.value as DepositStatus | ''); setPage(1); }} className="max-w-40">
              <option value="">All statuses</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
            </Select>
          </div>
        }
      />
      <Card>
        <DataTable columns={columns} data={data?.items ?? []} rowKey={(r) => r.id} loading={isLoading} total={data?.total} page={page} pageSize={20} onPageChange={setPage} emptyTitle="No deposit requests" />
      </Card>

      <Modal open={creditOpen} onClose={() => setCreditOpen(false)} title="Credit Wallet Directly">
        <form onSubmit={(e) => { e.preventDefault(); creditMut.mutate(); }} className="space-y-4">
          <p className="text-sm text-slate-400">Adds money to an agent's wallet immediately — no approval step. Use this for cash or any payment received outside of UPI.</p>
          <FormField label="Agent" required>
            <Select required value={creditUserId} onChange={(e) => setCreditUserId(e.target.value)}>
              <option value="">Select an agent</option>
              {agents?.items.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} — {a.referralCode}
                </option>
              ))}
            </Select>
          </FormField>
          {selectedCreditAgent && (
            <p className="text-xs text-slate-500">
              Current balance: <span className="font-semibold text-slate-300">{formatCurrency(selectedCreditAgent.walletBalance)}</span>
            </p>
          )}
          <FormField label="Amount" required>
            <Input type="number" min="1" step="0.01" required value={creditAmount} onChange={(e) => setCreditAmount(e.target.value)} />
          </FormField>
          <FormField label="Note (optional)" hint="e.g. 'Cash received in office' — shown in the deposit history.">
            <Input value={creditNote} onChange={(e) => setCreditNote(e.target.value)} maxLength={500} />
          </FormField>
          {creditError && <p className="rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-2 text-xs text-red-300">{creditError}</p>}
          <Button type="submit" className="w-full" loading={creditMut.isPending}>
            Credit Wallet
          </Button>
        </form>
      </Modal>

      <Modal open={debitOpen} onClose={() => setDebitOpen(false)} title="Debit Wallet Directly">
        <form onSubmit={(e) => { e.preventDefault(); debitMut.mutate(); }} className="space-y-4">
          <p className="text-sm text-slate-400">Removes money from an agent's wallet immediately — e.g. correcting a mistake or a penalty. Can't take the balance below zero.</p>
          <FormField label="Agent" required>
            <Select required value={debitUserId} onChange={(e) => setDebitUserId(e.target.value)}>
              <option value="">Select an agent</option>
              {agents?.items.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} — {a.referralCode}
                </option>
              ))}
            </Select>
          </FormField>
          {selectedDebitAgent && (
            <p className="text-xs text-slate-500">
              Current balance: <span className="font-semibold text-slate-300">{formatCurrency(selectedDebitAgent.walletBalance)}</span>
            </p>
          )}
          <FormField label="Amount" required>
            <Input type="number" min="1" step="0.01" required value={debitAmount} onChange={(e) => setDebitAmount(e.target.value)} />
          </FormField>
          <FormField label="Reason (optional)" hint="e.g. 'Correcting duplicate credit' — shown in the wallet transaction history.">
            <Input value={debitNote} onChange={(e) => setDebitNote(e.target.value)} maxLength={500} />
          </FormField>
          {debitError && <p className="rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-2 text-xs text-red-300">{debitError}</p>}
          <Button type="submit" accent="amber" className="w-full" loading={debitMut.isPending}>
            Debit Wallet
          </Button>
        </form>
      </Modal>
    </div>
  );
}
