import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { walletApi } from '@/api/wallet';
import { mlmApi } from '@/api/mlm';
import { useDebounce } from '@/hooks/useDebounce';
import { paymentMethodsApi } from '@/api/paymentMethods';
import { apiErrorMessage } from '@/api/axiosClient';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { StatCard } from '@/components/ui/StatCard';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { FormField } from '@/components/ui/FormField';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { StatusBadge } from '@/components/ui/Badge';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/store/toastStore';
import { formatCurrency, formatDateTime } from '@/utils/format';
import { IconPlus, IconSend, IconWallet, IconSearch, IconX } from '@/components/ui/icons';
import type { AgentDirectoryEntry, CommissionLedgerEntry, WalletTransaction } from '@/types/api';

export function MyCommissionsPage() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [tab, setTab] = useState<'statement' | 'transactions'>('statement');
  const [page, setPage] = useState(1);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [error, setError] = useState<string | null>(null);

  const [depositOpen, setDepositOpen] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [depositTxnId, setDepositTxnId] = useState('');
  const [depositError, setDepositError] = useState<string | null>(null);

  const [transferOpen, setTransferOpen] = useState(false);
  const [transferAmount, setTransferAmount] = useState('');
  const [transferError, setTransferError] = useState<string | null>(null);
  const [recipient, setRecipient] = useState<AgentDirectoryEntry | null>(null);
  const [agentSearch, setAgentSearch] = useState('');
  const agentQ = useDebounce(agentSearch, 250);

  const { data: wallet } = useQuery({ queryKey: ['wallet'], queryFn: walletApi.get });
  const { data: rules } = useQuery({ queryKey: ['wallet-rules'], queryFn: walletApi.rules });
  const { data: ledger, isLoading: ledgerLoading } = useQuery({
    queryKey: ['my-commissions', page],
    queryFn: () => mlmApi.listCommissions({ page, pageSize: 20 }),
    enabled: tab === 'statement',
  });
  const { data: txns, isLoading: txnsLoading } = useQuery({
    queryKey: ['my-wallet-txns', page],
    queryFn: () => walletApi.transactions({ page, pageSize: 20 }),
    enabled: tab === 'transactions',
  });
  const { data: withdrawals } = useQuery({ queryKey: ['my-withdrawals'], queryFn: () => walletApi.listWithdrawals({ pageSize: 5 }) });
  const { data: deposits } = useQuery({ queryKey: ['my-deposits'], queryFn: () => walletApi.listDeposits({ pageSize: 5 }) });
  const { data: transfers } = useQuery({ queryKey: ['my-transfers'], queryFn: () => walletApi.listTransfers({ pageSize: 5 }) });
  const { data: downline } = useQuery({ queryKey: ['my-downline'], queryFn: mlmApi.getMyDownline, enabled: transferOpen });
  const { data: agentMatches, isFetching: agentSearching } = useQuery({
    queryKey: ['agent-directory', agentQ],
    queryFn: () => walletApi.agents(agentQ || undefined),
    enabled: transferOpen && !recipient,
  });
  const { data: activePayment, isLoading: paymentLoading } = useQuery({
    queryKey: ['payment-method-active'],
    queryFn: paymentMethodsApi.active,
    retry: false,
  });

  const withdrawFee = rules ? (Number(amount) || 0) * (rules.withdrawalFeePercent / 100) : 0;

  const withdrawMut = useMutation({
    mutationFn: () => walletApi.requestWithdrawal(Number(amount)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['wallet'] });
      qc.invalidateQueries({ queryKey: ['my-withdrawals'] });
      toast.success('Withdrawal requested');
      setWithdrawOpen(false);
      setAmount('');
    },
    onError: (err) => setError(apiErrorMessage(err)),
  });

  const depositMut = useMutation({
    mutationFn: () => walletApi.requestDeposit({ amount: Number(depositAmount), transactionId: depositTxnId.trim(), paymentMethodId: activePayment?.id }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-deposits'] });
      toast.success('Deposit submitted — an admin will review it shortly');
      setDepositOpen(false);
      setDepositAmount('');
      setDepositTxnId('');
    },
    onError: (err) => setDepositError(apiErrorMessage(err)),
  });

  function closeTransfer() {
    setTransferOpen(false);
    setRecipient(null);
    setAgentSearch('');
    setTransferAmount('');
    setTransferError(null);
  }

  const transferMut = useMutation({
    mutationFn: () => walletApi.transfer({ toReferralCode: recipient!.referralCode, amount: Number(transferAmount) }),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ['wallet'] });
      qc.invalidateQueries({ queryKey: ['my-transfers'] });
      toast.success(`Sent ${formatCurrency(transferAmount)} to ${result.toUser?.name ?? recipient?.name}`);
      closeTransfer();
    },
    onError: (err) => setTransferError(apiErrorMessage(err)),
  });

  // Downline agents shown as quick-pick options at the top of the recipient list (when not searching).
  const downlinePicks: AgentDirectoryEntry[] = useMemo(
    () => (downline ?? []).filter((d) => d.role === 'AGENT' && d.status === 'ACTIVE').map((d) => ({ id: d.id, name: d.name, referralCode: d.referralCode })),
    [downline],
  );
  // "Everyone else" list — the full directory minus the team members already shown above.
  const otherAgents: AgentDirectoryEntry[] = useMemo(() => {
    const teamIds = new Set(agentSearch ? [] : downlinePicks.map((d) => d.id));
    return (agentMatches ?? []).filter((a) => !teamIds.has(a.id));
  }, [agentMatches, downlinePicks, agentSearch]);

  const ledgerColumns: Column<CommissionLedgerEntry>[] = [
    { key: 'date', header: 'Date', render: (r) => formatDateTime(r.createdAt) },
    { key: 'from', header: 'From', render: (r) => r.sourceAgent.name },
    { key: 'level', header: 'Level', render: (r) => r.levelNumber },
    { key: 'ticket', header: 'Ticket', render: (r) => <span className="font-mono text-xs">{r.ticket.ticketNumber}</span> },
    { key: 'pct', header: '%', render: (r) => `${Number(r.percentageApplied)}%` },
    { key: 'amount', header: 'Commission', render: (r) => <span className="font-semibold text-emerald-300">{formatCurrency(r.commissionAmount)}</span> },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
  ];

  const txnColumns: Column<WalletTransaction>[] = [
    { key: 'date', header: 'Date', render: (r) => formatDateTime(r.createdAt) },
    { key: 'type', header: 'Type', render: (r) => r.type },
    { key: 'amount', header: 'Amount', render: (r) => <span className={Number(r.amount) >= 0 ? 'text-emerald-300' : 'text-red-300'}>{formatCurrency(r.amount)}</span> },
    { key: 'balance', header: 'Balance After', render: (r) => formatCurrency(r.balanceAfter) },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
  ];

  return (
    <div>
      <PageHeader
        title="My Commissions & Wallet"
        description="Track your commission earnings, add money, transfer to another agent, and manage withdrawals. Ticket sales are paid straight from this balance."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button accent="emerald" icon={<IconPlus className="h-4 w-4" />} onClick={() => setDepositOpen(true)}>
              Add Money
            </Button>
            <Button variant="secondary" accent="emerald" icon={<IconSend className="h-4 w-4" />} onClick={() => setTransferOpen(true)}>
              Transfer to Agent
            </Button>
            <Button variant="secondary" accent="emerald" icon={<IconWallet className="h-4 w-4" />} onClick={() => setWithdrawOpen(true)}>
              Request Withdrawal
            </Button>
          </div>
        }
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Available Balance" value={formatCurrency(wallet?.balance ?? 0)} icon={<IconWallet className="h-5 w-5" />} accent="emerald" />
        <Card className="p-4">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Recent Deposits</p>
          <div className="space-y-1.5">
            {deposits?.items.slice(0, 3).map((d) => (
              <div key={d.id} className="flex items-center justify-between text-sm">
                <span className="text-slate-300">{formatCurrency(d.amount)}</span>
                <StatusBadge status={d.status} />
              </div>
            ))}
            {!deposits?.items.length && <p className="text-xs text-slate-500">No deposits yet.</p>}
          </div>
        </Card>
        <Card className="p-4">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Recent Transfers</p>
          <div className="space-y-1.5">
            {transfers?.items.slice(0, 3).map((t) => {
              const sent = t.fromUserId === user?.id;
              return (
                <div key={t.id} className="flex items-center justify-between text-sm">
                  <span className="truncate text-slate-300">{sent ? `To ${t.toUser?.name}` : `From ${t.fromUser?.name}`}</span>
                  <span className={sent ? 'text-red-300' : 'text-emerald-300'}>{sent ? '-' : '+'}{formatCurrency(t.amount)}</span>
                </div>
              );
            })}
            {!transfers?.items.length && <p className="text-xs text-slate-500">No transfers yet.</p>}
          </div>
        </Card>
        <Card className="p-4">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Recent Withdrawals</p>
          <div className="space-y-1.5">
            {withdrawals?.items.slice(0, 3).map((w) => (
              <div key={w.id} className="flex items-center justify-between text-sm">
                <span className="text-slate-300">{formatCurrency(w.amount)}</span>
                <StatusBadge status={w.status} />
              </div>
            ))}
            {!withdrawals?.items.length && <p className="text-xs text-slate-500">No withdrawal requests yet.</p>}
          </div>
        </Card>
      </div>

      <div className="mb-4 flex gap-2">
        <Button size="sm" variant={tab === 'statement' ? 'primary' : 'secondary'} accent="emerald" onClick={() => { setTab('statement'); setPage(1); }}>
          Commission Statement
        </Button>
        <Button size="sm" variant={tab === 'transactions' ? 'primary' : 'secondary'} accent="emerald" onClick={() => { setTab('transactions'); setPage(1); }}>
          Wallet Transactions
        </Button>
      </div>

      <Card>
        {tab === 'statement' ? (
          <DataTable columns={ledgerColumns} data={ledger?.items ?? []} rowKey={(r) => r.id} loading={ledgerLoading} total={ledger?.total} page={page} pageSize={20} onPageChange={setPage} emptyTitle="No commissions yet" accent="emerald" />
        ) : (
          <DataTable columns={txnColumns} data={txns?.items ?? []} rowKey={(r) => r.id} loading={txnsLoading} total={txns?.total} page={page} pageSize={20} onPageChange={setPage} emptyTitle="No transactions yet" accent="emerald" />
        )}
      </Card>

      <Modal open={withdrawOpen} onClose={() => setWithdrawOpen(false)} title="Request Withdrawal">
        <form onSubmit={(e) => { e.preventDefault(); withdrawMut.mutate(); }} className="space-y-4">
          <p className="text-sm text-slate-400">
            Available balance: <span className="font-semibold text-emerald-300">{formatCurrency(wallet?.balance ?? 0)}</span>
          </p>
          <FormField
            label="Amount"
            required
            hint={rules ? `Minimum ${formatCurrency(rules.withdrawalMinAmount)}, in multiples of ${rules.withdrawalMultipleOf}. A ${rules.withdrawalFeePercent}% platform fee applies.` : undefined}
          >
            <Input type="number" min={rules?.withdrawalMinAmount ?? 1} step={rules?.withdrawalMultipleOf ?? 1} required value={amount} onChange={(e) => setAmount(e.target.value)} />
          </FormField>
          {Number(amount) > 0 && rules && (
            <p className="rounded-lg border border-white/8 bg-white/[0.02] px-3 py-2 text-xs text-slate-400">
              Platform fee ({rules.withdrawalFeePercent}%): <span className="text-slate-300">{formatCurrency(withdrawFee)}</span>
              <br />
              You'll receive: <span className="font-semibold text-emerald-300">{formatCurrency(Number(amount) - withdrawFee)}</span>
            </p>
          )}
          {error && <p className="rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-2 text-xs text-red-300">{error}</p>}
          <Button type="submit" accent="emerald" className="w-full" loading={withdrawMut.isPending}>
            Submit Request
          </Button>
        </form>
      </Modal>

      <Modal open={depositOpen} onClose={() => setDepositOpen(false)} title="Add Money to Wallet">
        <form onSubmit={(e) => { e.preventDefault(); depositMut.mutate(); }} className="space-y-4">
          {paymentLoading ? (
            <p className="text-xs text-slate-500">Loading payment details…</p>
          ) : !activePayment ? (
            <p className="rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
              No payment method is configured yet. Contact your admin to add money to your wallet.
            </p>
          ) : (
            <div className="flex items-center gap-3 rounded-lg border border-white/8 bg-white/[0.02] p-3">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-white/8 bg-white p-1">
                <img src={activePayment.qrImage} alt={`${activePayment.label} QR code`} className="h-full w-full object-contain" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-slate-400">{activePayment.label}</p>
                <p className="truncate font-mono text-sm text-slate-100">{activePayment.upiId}</p>
              </div>
            </div>
          )}
          <FormField label="Amount" required>
            <Input type="number" min="1" step="0.01" required value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)} />
          </FormField>
          <FormField label="Transaction ID / UTR Number" required hint="Scan the QR or pay to the UPI ID above, then enter the transaction reference — an admin will verify and credit your wallet.">
            <Input required value={depositTxnId} onChange={(e) => setDepositTxnId(e.target.value)} placeholder="e.g. 123456789012" className="font-mono" />
          </FormField>
          {depositError && <p className="rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-2 text-xs text-red-300">{depositError}</p>}
          <Button type="submit" accent="emerald" className="w-full" loading={depositMut.isPending} disabled={!activePayment}>
            Submit for Approval
          </Button>
        </form>
      </Modal>

      <Modal open={transferOpen} onClose={closeTransfer} title="Transfer to Another Agent">
        <form onSubmit={(e) => { e.preventDefault(); transferMut.mutate(); }} className="space-y-4">
          <p className="text-sm text-slate-400">
            Available balance: <span className="font-semibold text-emerald-300">{formatCurrency(wallet?.balance ?? 0)}</span>
          </p>

          {recipient ? (
            <div className="flex items-center justify-between rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-3 py-2.5">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-100">{recipient.name}</p>
                <p className="font-mono text-[11px] text-slate-400">ID {recipient.id} · {recipient.referralCode}</p>
              </div>
              <button type="button" onClick={() => { setRecipient(null); setAgentSearch(''); }} className="text-xs text-slate-400 hover:text-slate-200">
                Change
              </button>
            </div>
          ) : (
            <FormField
              label="Recipient"
              required
              hint="Send to any agent — they don't have to be in your team. Search by name, agent ID or referral code."
            >
              <div className="relative">
                <IconSearch className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-500" />
                <Input value={agentSearch} onChange={(e) => setAgentSearch(e.target.value)} placeholder="Name / ID / code…" className="pl-8" />
                {agentSearch && (
                  <button type="button" onClick={() => setAgentSearch('')} className="absolute right-2.5 top-2.5 text-slate-500 hover:text-slate-300">
                    <IconX className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              <div className="mt-2 max-h-56 space-y-1 overflow-y-auto rounded-lg border border-white/8 bg-white/[0.02] p-1">
                {!agentSearch && downlinePicks.length > 0 && (
                  <>
                    <p className="px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-slate-500">Your team</p>
                    {downlinePicks.map((a) => (
                      <AgentRow key={`dl-${a.id}`} agent={a} onPick={() => setRecipient(a)} />
                    ))}
                    <p className="mt-1 px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-slate-500">Everyone else</p>
                  </>
                )}
                {agentSearching && <p className="px-2 py-2 text-xs text-slate-500">Searching…</p>}
                {!agentSearching && otherAgents.length === 0 && (
                  <p className="px-2 py-2 text-xs text-slate-500">{agentSearch ? 'No agents match.' : 'No other agents.'}</p>
                )}
                {otherAgents.map((a) => (
                  <AgentRow key={a.id} agent={a} onPick={() => setRecipient(a)} />
                ))}
              </div>
            </FormField>
          )}

          <FormField
            label="Amount"
            required
            hint={rules ? `Minimum ${formatCurrency(rules.transferMinAmount)}, in multiples of ${rules.transferMultipleOf}. Sent instantly, no fee.` : undefined}
          >
            <Input type="number" min={rules?.transferMinAmount ?? 1} step={rules?.transferMultipleOf ?? 1} required value={transferAmount} onChange={(e) => setTransferAmount(e.target.value)} />
          </FormField>
          {transferError && <p className="rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-2 text-xs text-red-300">{transferError}</p>}
          <Button type="submit" accent="emerald" className="w-full" loading={transferMut.isPending} disabled={!recipient || !transferAmount}>
            {recipient ? `Send to ${recipient.name}` : 'Select a recipient'}
          </Button>
        </form>
      </Modal>
    </div>
  );
}

function AgentRow({ agent, onPick }: { agent: AgentDirectoryEntry; onPick: () => void }) {
  return (
    <button
      type="button"
      onClick={onPick}
      className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm hover:bg-emerald-500/10"
    >
      <span className="truncate text-slate-200">{agent.name}</span>
      <span className="ml-2 shrink-0 font-mono text-[10px] text-slate-500">ID {agent.id} · {agent.referralCode}</span>
    </button>
  );
}
