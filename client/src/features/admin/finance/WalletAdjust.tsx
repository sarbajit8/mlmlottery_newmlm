import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { walletApi } from '@/api/wallet';
import { usersApi } from '@/api/users';
import { useDebounce } from '@/hooks/useDebounce';
import { apiErrorMessage } from '@/api/axiosClient';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input, Select } from '@/components/ui/Input';
import { FormField } from '@/components/ui/FormField';
import { toast } from '@/store/toastStore';
import { formatCurrency } from '@/utils/format';
import { IconMinus, IconPlus } from '@/components/ui/icons';

type Mode = 'credit' | 'debit';

/** Admin's direct wallet credit / debit — no request, applies instantly. Shared by the Deposit
 *  Requests and Transaction History pages. `onDone` lets the host refresh its own lists. */
export function WalletAdjust({ onDone }: { onDone?: () => void }) {
  const qc = useQueryClient();
  const [mode, setMode] = useState<Mode | null>(null);
  const [userId, setUserId] = useState('');
  const [search, setSearch] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const q = useDebounce(search, 300);

  const { data: agents } = useQuery({
    queryKey: ['users-agents-adjust', q],
    queryFn: () => usersApi.list({ role: 'AGENT', search: q || undefined, pageSize: 50 }),
    enabled: mode !== null,
  });

  const selected = useMemo(() => agents?.items.find((a) => a.id === Number(userId)), [agents, userId]);

  function close() {
    setMode(null);
    setUserId('');
    setSearch('');
    setAmount('');
    setNote('');
    setError(null);
  }

  const mut = useMutation({
    mutationFn: async () => {
      const input = { userId: Number(userId), amount: Number(amount), note: note.trim() || undefined };
      if (mode === 'credit') await walletApi.adminCredit(input);
      else await walletApi.adminDebit(input);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['deposits'] });
      qc.invalidateQueries({ queryKey: ['wallet-adjustments'] });
      qc.invalidateQueries({ queryKey: ['admin-wallet-ledger'] });
      qc.invalidateQueries({ queryKey: ['users'] });
      toast.success(mode === 'credit' ? 'Wallet credited' : 'Wallet debited');
      close();
      onDone?.();
    },
    onError: (err) => setError(apiErrorMessage(err)),
  });

  const isCredit = mode === 'credit';

  return (
    <>
      <Button icon={<IconPlus className="h-4 w-4" />} onClick={() => setMode('credit')}>
        Credit Wallet
      </Button>
      <Button variant="secondary" accent="amber" icon={<IconMinus className="h-4 w-4" />} onClick={() => setMode('debit')}>
        Debit Wallet
      </Button>

      <Modal open={mode !== null} onClose={close} title={isCredit ? 'Credit an Agent Wallet' : 'Debit an Agent Wallet'}>
        <form onSubmit={(e) => { e.preventDefault(); mut.mutate(); }} className="space-y-4">
          <p className="text-sm text-slate-400">
            {isCredit
              ? "Adds money to the agent's wallet immediately — no approval. Use it for cash or any payment received outside UPI."
              : "Removes money from the agent's wallet immediately — e.g. correcting a mistake or a penalty. Can't go below zero."}
          </p>

          <FormField label="Agent" required hint="Type to search by name or referral code.">
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search agents…" className="mb-2" />
            <Select required value={userId} onChange={(e) => setUserId(e.target.value)}>
              <option value="">Select an agent</option>
              {agents?.items.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} — {a.referralCode} · bal {formatCurrency(a.walletBalance)}
                </option>
              ))}
            </Select>
          </FormField>

          {selected && (
            <p className="text-xs text-slate-500">
              Current balance: <span className="font-semibold text-slate-300">{formatCurrency(selected.walletBalance)}</span>
              {amount && Number(amount) > 0 && (
                <>
                  {'  →  '}
                  <span className={isCredit ? 'font-semibold text-emerald-300' : 'font-semibold text-amber-300'}>
                    {formatCurrency(Number(selected.walletBalance) + (isCredit ? 1 : -1) * Number(amount))}
                  </span>
                </>
              )}
            </p>
          )}

          <FormField label="Amount" required>
            <Input type="number" min="1" step="0.01" required value={amount} onChange={(e) => setAmount(e.target.value)} />
          </FormField>
          <FormField label={isCredit ? 'Note (optional)' : 'Reason (optional)'} hint="Shown in the transaction history.">
            <Input value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} />
          </FormField>

          {error && <p className="rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-2 text-xs text-red-300">{error}</p>}
          <Button type="submit" accent={isCredit ? 'emerald' : 'amber'} className="w-full" loading={mut.isPending}>
            {isCredit ? 'Credit Wallet' : 'Debit Wallet'}
          </Button>
        </form>
      </Modal>
    </>
  );
}
