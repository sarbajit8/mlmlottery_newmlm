import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { walletApi } from '@/api/wallet';
import { systemApi } from '@/api/system';
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
import { downloadFile } from '@/utils/download';
import { formatCurrency, formatDateTime } from '@/utils/format';
import { IconDownload, IconSettings } from '@/components/ui/icons';
import type { WalletRules, WithdrawalRequest, WithdrawalStatus } from '@/types/api';

export function WithdrawalRequestsPage() {
  const qc = useQueryClient();
  const [status, setStatus] = useState<WithdrawalStatus | ''>('PENDING');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['withdrawals', status, page],
    queryFn: () => walletApi.listWithdrawals({ status: status || undefined, page, pageSize: 20 }),
  });

  const processMut = useMutation({
    mutationFn: (vars: { id: number; status: 'APPROVED' | 'REJECTED' | 'PAID' }) => walletApi.processWithdrawal(vars.id, vars.status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['withdrawals'] });
      toast.success('Withdrawal updated');
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });

  const [exporting, setExporting] = useState(false);
  async function exportForBank() {
    setExporting(true);
    try {
      const suffix = status ? `-${status.toLowerCase()}` : '';
      await downloadFile(walletApi.withdrawalsBankExportUrl(status || undefined), `withdrawals-bank-transfer${suffix}.csv`);
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not export withdrawals'));
    } finally {
      setExporting(false);
    }
  }

  const [rulesOpen, setRulesOpen] = useState(false);
  const { data: rules } = useQuery({ queryKey: ['wallet-rules'], queryFn: walletApi.rules });
  const [rulesForm, setRulesForm] = useState({ withdrawalMinAmount: '100', withdrawalMultipleOf: '100', withdrawalFeePercent: '10', transferMinAmount: '100', transferMultipleOf: '100' });
  const [rulesError, setRulesError] = useState<string | null>(null);

  function openRules() {
    if (rules) {
      setRulesForm({
        withdrawalMinAmount: String(rules.withdrawalMinAmount),
        withdrawalMultipleOf: String(rules.withdrawalMultipleOf),
        withdrawalFeePercent: String(rules.withdrawalFeePercent),
        transferMinAmount: String(rules.transferMinAmount),
        transferMultipleOf: String(rules.transferMultipleOf),
      });
    }
    setRulesError(null);
    setRulesOpen(true);
  }

  const saveRulesMut = useMutation({
    mutationFn: () =>
      systemApi.upsertSetting('walletRules', {
        withdrawalMinAmount: Number(rulesForm.withdrawalMinAmount) || 0,
        withdrawalMultipleOf: Number(rulesForm.withdrawalMultipleOf) || 0,
        withdrawalFeePercent: Number(rulesForm.withdrawalFeePercent) || 0,
        transferMinAmount: Number(rulesForm.transferMinAmount) || 0,
        transferMultipleOf: Number(rulesForm.transferMultipleOf) || 0,
      } satisfies WalletRules),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['wallet-rules'] });
      toast.success('Wallet rules saved');
      setRulesOpen(false);
    },
    onError: (err) => setRulesError(apiErrorMessage(err)),
  });

  const columns: Column<WithdrawalRequest>[] = [
    { key: 'user', header: 'Agent', render: (r) => <span className="font-medium text-slate-100">{r.user?.name}</span> },
    { key: 'code', header: 'Referral Code', render: (r) => <span className="font-mono text-xs">{r.user?.referralCode}</span> },
    { key: 'amount', header: 'Requested', render: (r) => <span className="font-semibold text-emerald-300">{formatCurrency(r.amount)}</span> },
    { key: 'fee', header: 'Platform Fee', render: (r) => <span className="text-xs text-slate-400">{formatCurrency(r.feeAmount)}</span> },
    { key: 'net', header: 'Net Payout', render: (r) => <span className="font-semibold text-slate-100">{formatCurrency(Number(r.amount) - Number(r.feeAmount))}</span> },
    { key: 'requested', header: 'Requested At', render: (r) => formatDateTime(r.requestedAt) },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (r) => (
        <div className="flex justify-end gap-1.5">
          {r.status === 'PENDING' && (
            <>
              <Button size="sm" onClick={() => processMut.mutate({ id: r.id, status: 'APPROVED' })}>
                Approve
              </Button>
              <Button size="sm" variant="danger" onClick={() => processMut.mutate({ id: r.id, status: 'REJECTED' })}>
                Reject
              </Button>
            </>
          )}
          {r.status === 'APPROVED' && (
            <Button size="sm" onClick={() => processMut.mutate({ id: r.id, status: 'PAID' })}>
              Mark Paid
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Withdrawal Requests"
        description="Approve, reject, or mark agent withdrawal requests as paid."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" icon={<IconDownload className="h-4 w-4" />} onClick={exportForBank} loading={exporting}>
              Export for Bank
            </Button>
            <Button variant="secondary" icon={<IconSettings className="h-4 w-4" />} onClick={openRules}>
              Wallet Rules
            </Button>
            <Select value={status} onChange={(e) => { setStatus(e.target.value as WithdrawalStatus | ''); setPage(1); }} className="max-w-40">
              <option value="">All statuses</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
              <option value="PAID">Paid</option>
            </Select>
          </div>
        }
      />
      <Card>
        <DataTable columns={columns} data={data?.items ?? []} rowKey={(r) => r.id} loading={isLoading} total={data?.total} page={page} pageSize={20} onPageChange={setPage} emptyTitle="No withdrawal requests" />
      </Card>

      <Modal open={rulesOpen} onClose={() => setRulesOpen(false)} title="Wallet Rules">
        <form onSubmit={(e) => { e.preventDefault(); saveRulesMut.mutate(); }} className="space-y-4">
          <p className="text-sm text-slate-400">Applies platform-wide to every agent's withdrawal requests and agent-to-agent transfers.</p>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Withdrawals</p>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Minimum Amount">
              <Input type="number" min="0" value={rulesForm.withdrawalMinAmount} onChange={(e) => setRulesForm({ ...rulesForm, withdrawalMinAmount: e.target.value })} />
            </FormField>
            <FormField label="Must Be Multiple Of">
              <Input type="number" min="0" value={rulesForm.withdrawalMultipleOf} onChange={(e) => setRulesForm({ ...rulesForm, withdrawalMultipleOf: e.target.value })} />
            </FormField>
          </div>
          <FormField label="Platform Fee %" hint="Deducted from every withdrawal and credited to the company wallet.">
            <Input type="number" min="0" max="100" step="0.1" value={rulesForm.withdrawalFeePercent} onChange={(e) => setRulesForm({ ...rulesForm, withdrawalFeePercent: e.target.value })} />
          </FormField>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Agent-to-Agent Transfers</p>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Minimum Amount">
              <Input type="number" min="0" value={rulesForm.transferMinAmount} onChange={(e) => setRulesForm({ ...rulesForm, transferMinAmount: e.target.value })} />
            </FormField>
            <FormField label="Must Be Multiple Of">
              <Input type="number" min="0" value={rulesForm.transferMultipleOf} onChange={(e) => setRulesForm({ ...rulesForm, transferMultipleOf: e.target.value })} />
            </FormField>
          </div>
          {rulesError && <p className="rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-2 text-xs text-red-300">{rulesError}</p>}
          <Button type="submit" className="w-full" loading={saveRulesMut.isPending}>
            Save Rules
          </Button>
        </form>
      </Modal>
    </div>
  );
}
