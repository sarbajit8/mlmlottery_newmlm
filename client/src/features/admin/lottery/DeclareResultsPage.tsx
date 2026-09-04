import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { drawSlotsApi } from '@/api/drawSlots';
import { ticketsApi } from '@/api/tickets';
import { resultsApi } from '@/api/results';
import { systemApi } from '@/api/system';
import { apiErrorMessage } from '@/api/axiosClient';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { FormField } from '@/components/ui/FormField';
import { Modal } from '@/components/ui/Modal';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { toast } from '@/store/toastStore';
import { formatCurrency, formatDate, todayIso } from '@/utils/format';
import { generateUniqueNumbers, formatNumberList, parseNumberList } from '@/utils/lotteryNumbers';
import { IconPlus, IconSettings, IconTrash, IconTrophy } from '@/components/ui/icons';
import type { DrawResultInput, DrawResultListItem, PrizeAmountDefaults, PrizeTier } from '@/types/api';

const DEFAULT_PRIZE_AMOUNTS: PrizeAmountDefaults = {
  firstPrizeAmount: 0,
  secondPrizeAmount: 0,
  thirdPrizeAmount: 0,
  fourthPrizeAmount: 0,
  fifthPrizeAmount: 0,
  fifthPrizePercentage: 50,
};

interface FormState {
  drawName: string;
  drawNumber: string;
  drawSlotId: string;
  drawDate: string;
  firstPrizeTicketNumber: string;
  firstPrizeAmount: string;
  secondPrizeAmount: string;
  secondPrizeNumbersText: string;
  thirdPrizeAmount: string;
  thirdPrizeNumbersText: string;
  fourthPrizeAmount: string;
  fourthPrizeNumbersText: string;
  fifthPrizeAmount: string;
  fifthPrizePercentage: string;
  fifthPrizeNumbersText: string;
}

const emptyForm: FormState = {
  drawName: '',
  drawNumber: '',
  drawSlotId: '',
  drawDate: todayIso(),
  firstPrizeTicketNumber: '',
  firstPrizeAmount: '',
  secondPrizeAmount: '',
  secondPrizeNumbersText: '',
  thirdPrizeAmount: '',
  thirdPrizeNumbersText: '',
  fourthPrizeAmount: '',
  fourthPrizeNumbersText: '',
  fifthPrizeAmount: '',
  fifthPrizePercentage: '50',
  fifthPrizeNumbersText: '',
};

const tierLabel: Record<PrizeTier, string> = { FIRST: '1st', SECOND: '2nd', THIRD: '3rd', FOURTH: '4th', FIFTH: '5th' };

export function DeclareResultsPage() {
  const qc = useQueryClient();
  const [view, setView] = useState<'list' | 'form'>('list');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [listPage, setListPage] = useState(1);

  const { data: slots } = useQuery({ queryKey: ['draw-slots'], queryFn: drawSlotsApi.list });
  const { data: summary } = useQuery({ queryKey: ['ticket-summary', form.drawDate], queryFn: () => ticketsApi.summary(form.drawDate), enabled: view === 'form' });
  const { data: results, isLoading: listLoading } = useQuery({
    queryKey: ['declared-results', listPage],
    queryFn: () => resultsApi.list({ page: listPage, pageSize: 15 }),
    enabled: view === 'list',
  });
  const { data: appSettings } = useQuery({ queryKey: ['app-settings'], queryFn: systemApi.settings });

  // Admin-configured position-wise defaults — pre-fill a new result's amounts so they don't have
  // to be retyped every draw; still freely editable per result before saving.
  const prizeDefaults: PrizeAmountDefaults = useMemo(() => {
    const raw = appSettings?.find((s) => s.key === 'defaultPrizeAmounts')?.value;
    return raw && typeof raw === 'object' ? { ...DEFAULT_PRIZE_AMOUNTS, ...(raw as Partial<PrizeAmountDefaults>) } : DEFAULT_PRIZE_AMOUNTS;
  }, [appSettings]);

  const [prizeSettingsOpen, setPrizeSettingsOpen] = useState(false);
  const [defaultsForm, setDefaultsForm] = useState({
    firstPrizeAmount: '',
    secondPrizeAmount: '',
    thirdPrizeAmount: '',
    fourthPrizeAmount: '',
    fifthPrizeAmount: '',
    fifthPrizePercentage: '50',
  });
  const [defaultsError, setDefaultsError] = useState<string | null>(null);

  function openPrizeSettings() {
    setDefaultsForm({
      firstPrizeAmount: prizeDefaults.firstPrizeAmount ? String(prizeDefaults.firstPrizeAmount) : '',
      secondPrizeAmount: prizeDefaults.secondPrizeAmount ? String(prizeDefaults.secondPrizeAmount) : '',
      thirdPrizeAmount: prizeDefaults.thirdPrizeAmount ? String(prizeDefaults.thirdPrizeAmount) : '',
      fourthPrizeAmount: prizeDefaults.fourthPrizeAmount ? String(prizeDefaults.fourthPrizeAmount) : '',
      fifthPrizeAmount: prizeDefaults.fifthPrizeAmount ? String(prizeDefaults.fifthPrizeAmount) : '',
      fifthPrizePercentage: String(prizeDefaults.fifthPrizePercentage ?? 50),
    });
    setDefaultsError(null);
    setPrizeSettingsOpen(true);
  }

  const saveDefaultsMut = useMutation({
    mutationFn: () =>
      systemApi.upsertSetting('defaultPrizeAmounts', {
        firstPrizeAmount: Number(defaultsForm.firstPrizeAmount) || 0,
        secondPrizeAmount: Number(defaultsForm.secondPrizeAmount) || 0,
        thirdPrizeAmount: Number(defaultsForm.thirdPrizeAmount) || 0,
        fourthPrizeAmount: Number(defaultsForm.fourthPrizeAmount) || 0,
        fifthPrizeAmount: Number(defaultsForm.fifthPrizeAmount) || 0,
        fifthPrizePercentage: Number(defaultsForm.fifthPrizePercentage) || 0,
      } satisfies PrizeAmountDefaults),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['app-settings'] });
      toast.success('Default prize amounts saved');
      setPrizeSettingsOpen(false);
    },
    onError: (err) => setDefaultsError(apiErrorMessage(err)),
  });

  const soldCountForSlot = useMemo(() => {
    if (!form.drawSlotId) return 0;
    return summary?.find((s) => s.drawSlotId === Number(form.drawSlotId))?.sold ?? 0;
  }, [summary, form.drawSlotId]);

  function openCreate() {
    setEditingId(null);
    setForm({
      ...emptyForm,
      firstPrizeAmount: prizeDefaults.firstPrizeAmount ? String(prizeDefaults.firstPrizeAmount) : '',
      secondPrizeAmount: prizeDefaults.secondPrizeAmount ? String(prizeDefaults.secondPrizeAmount) : '',
      thirdPrizeAmount: prizeDefaults.thirdPrizeAmount ? String(prizeDefaults.thirdPrizeAmount) : '',
      fourthPrizeAmount: prizeDefaults.fourthPrizeAmount ? String(prizeDefaults.fourthPrizeAmount) : '',
      fifthPrizeAmount: prizeDefaults.fifthPrizeAmount ? String(prizeDefaults.fifthPrizeAmount) : '',
      fifthPrizePercentage: String(prizeDefaults.fifthPrizePercentage ?? 50),
    });
    setError(null);
    setView('form');
  }

  async function openEdit(id: number) {
    const r = await resultsApi.get(id);
    setEditingId(id);
    setForm({
      drawName: r.drawName,
      drawNumber: r.drawNumber,
      drawSlotId: String(r.drawSlotId),
      drawDate: r.drawDate.slice(0, 10),
      firstPrizeTicketNumber: r.firstPrizeTicket.ticketNumber,
      firstPrizeAmount: r.firstPrizeAmount,
      secondPrizeAmount: r.secondPrizeAmount,
      secondPrizeNumbersText: r.secondPrizeNumbers.join(', '),
      thirdPrizeAmount: r.thirdPrizeAmount,
      thirdPrizeNumbersText: r.thirdPrizeNumbers.join(', '),
      fourthPrizeAmount: r.fourthPrizeAmount,
      fourthPrizeNumbersText: r.fourthPrizeNumbers.join(', '),
      fifthPrizeAmount: r.fifthPrizeAmount,
      fifthPrizePercentage: r.fifthPrizePercentage,
      fifthPrizeNumbersText: r.fifthPrizeNumbers.join(', '),
    });
    setError(null);
    setView('form');
  }

  const randomTicketMut = useMutation({
    mutationFn: () => resultsApi.randomTicket(Number(form.drawSlotId), form.drawDate),
    onSuccess: (data) => setForm((f) => ({ ...f, firstPrizeTicketNumber: data.ticketNumber })),
    onError: (err) => setError(apiErrorMessage(err)),
  });

  const autoGenerateAllMut = useMutation({
    mutationFn: async () => {
      const ticket = await resultsApi.randomTicket(Number(form.drawSlotId), form.drawDate);
      const second = generateUniqueNumbers(10, 5);
      const third = generateUniqueNumbers(10, 4);
      const fourth = generateUniqueNumbers(10, 4, new Set(third));
      const fifthCount = Math.max(1, Math.round((soldCountForSlot * Number(form.fifthPrizePercentage || 0)) / 100));
      const fifth = generateUniqueNumbers(fifthCount, 4, new Set([...third, ...fourth]));
      return { ticket, second, third, fourth, fifth };
    },
    onSuccess: ({ ticket, second, third, fourth, fifth }) => {
      setForm((f) => ({
        ...f,
        firstPrizeTicketNumber: ticket.ticketNumber,
        secondPrizeNumbersText: second.join(', '),
        thirdPrizeNumbersText: third.join(', '),
        fourthPrizeNumbersText: fourth.join(', '),
        fifthPrizeNumbersText: fifth.join(', '),
      }));
      toast.success('Generated all prize numbers — review before saving');
    },
    onError: (err) => setError(apiErrorMessage(err)),
  });

  function buildInput(): DrawResultInput {
    return {
      drawName: form.drawName,
      drawNumber: form.drawNumber,
      drawSlotId: Number(form.drawSlotId),
      drawDate: form.drawDate,
      firstPrizeTicketNumber: form.firstPrizeTicketNumber,
      firstPrizeAmount: Number(form.firstPrizeAmount) || 0,
      secondPrizeAmount: Number(form.secondPrizeAmount) || 0,
      secondPrizeNumbers: parseNumberList(form.secondPrizeNumbersText),
      thirdPrizeAmount: Number(form.thirdPrizeAmount) || 0,
      thirdPrizeNumbers: parseNumberList(form.thirdPrizeNumbersText),
      fourthPrizeAmount: Number(form.fourthPrizeAmount) || 0,
      fourthPrizeNumbers: parseNumberList(form.fourthPrizeNumbersText),
      fifthPrizeAmount: Number(form.fifthPrizeAmount) || 0,
      fifthPrizePercentage: Number(form.fifthPrizePercentage) || 0,
      fifthPrizeNumbers: parseNumberList(form.fifthPrizeNumbersText),
    };
  }

  const saveMut = useMutation({
    mutationFn: () => (editingId ? resultsApi.update(editingId, buildInput()) : resultsApi.declare(buildInput())),
    onSuccess: (saved) => {
      qc.invalidateQueries({ queryKey: ['declared-results'] });
      toast.success(editingId ? `Result updated — ${saved.winners.length} winning tickets` : `Result saved — ${saved.winners.length} winning tickets found`);
      setView('list');
    },
    onError: (err) => setError(apiErrorMessage(err)),
  });

  const deleteMut = useMutation({
    mutationFn: resultsApi.remove,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['declared-results'] });
      toast.success('Result deleted');
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });

  if (view === 'list') {
    const columns: Column<DrawResultListItem>[] = [
      { key: 'name', header: 'Draw Name', render: (r) => <span className="font-semibold text-slate-100">{r.drawName}</span> },
      { key: 'number', header: 'Draw No.', render: (r) => <span className="rounded bg-white/8 px-1.5 py-0.5 text-xs">{r.drawNumber}</span> },
      { key: 'date', header: 'Date', render: (r) => formatDate(r.drawDate) },
      { key: 'slot', header: 'Slot', render: (r) => r.drawSlot.name },
      { key: '1st', header: '1st Prize', render: (r) => <span className="font-mono text-amber-300">{r.firstPrizeTicket.ticketNumber}</span> },
      { key: '2nd', header: '2nd Prize', render: (r) => <span className="font-mono text-xs text-slate-400">{formatNumberList(r.secondPrizeNumbers)}</span> },
      { key: '3rd', header: '3rd Prize', render: (r) => <span className="font-mono text-xs text-slate-400">{formatNumberList(r.thirdPrizeNumbers)}</span> },
      { key: '4th', header: '4th Prize', render: (r) => <span className="font-mono text-xs text-slate-400">{formatNumberList(r.fourthPrizeNumbers)}</span> },
      { key: '5th', header: '5th Prize', render: (r) => <span className="font-mono text-xs text-slate-400">{formatNumberList(r.fifthPrizeNumbers)}</span> },
      {
        key: 'winners',
        header: 'Winners',
        render: (r) => (
          <div>
            <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-300">{r.totalWinners} winners</span>
            <p className="mt-1 text-[10px] text-slate-500">
              {(Object.entries(r.winnerCounts) as [PrizeTier, number][])
                .filter(([, c]) => c > 0)
                .map(([tier, c]) => `${tierLabel[tier]}:${c}`)
                .join('  ')}
            </p>
          </div>
        ),
      },
      {
        key: 'actions',
        header: '',
        className: 'text-right',
        render: (r) => (
          <div className="flex justify-end gap-1.5">
            <Button size="sm" variant="secondary" onClick={() => openEdit(r.id)}>
              Edit
            </Button>
            <Button size="sm" variant="danger" icon={<IconTrash className="h-3.5 w-3.5" />} onClick={() => confirm(`Delete result "${r.drawName}"? Winning tickets will revert to Sold.`) && deleteMut.mutate(r.id)} />
          </div>
        ),
      },
    ];

    return (
      <div>
        <PageHeader
          title="All Result Entry"
          description="Declared lottery results across every draw slot."
          actions={
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" icon={<IconSettings className="h-4 w-4" />} onClick={openPrizeSettings}>
                Prize Amount Defaults
              </Button>
              <Button icon={<IconPlus className="h-4 w-4" />} onClick={openCreate}>
                Add New Result
              </Button>
            </div>
          }
        />
        <Card>
          <div className="overflow-x-auto">
            <DataTable columns={columns} data={results?.items ?? []} rowKey={(r) => r.id} loading={listLoading} total={results?.total} page={listPage} pageSize={15} onPageChange={setListPage} emptyTitle="No results declared yet" />
          </div>
        </Card>

        <Modal open={prizeSettingsOpen} onClose={() => setPrizeSettingsOpen(false)} title="Prize Amount Defaults">
          <form onSubmit={(e) => { e.preventDefault(); saveDefaultsMut.mutate(); }} className="space-y-4">
            <p className="text-sm text-slate-400">
              Set once here, per prize position — every new result pre-fills these amounts. Still editable per draw before saving.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="1st Prize Amount">
                <Input type="number" min="0" value={defaultsForm.firstPrizeAmount} onChange={(e) => setDefaultsForm({ ...defaultsForm, firstPrizeAmount: e.target.value })} />
              </FormField>
              <FormField label="2nd Prize Amount">
                <Input type="number" min="0" value={defaultsForm.secondPrizeAmount} onChange={(e) => setDefaultsForm({ ...defaultsForm, secondPrizeAmount: e.target.value })} />
              </FormField>
              <FormField label="3rd Prize Amount">
                <Input type="number" min="0" value={defaultsForm.thirdPrizeAmount} onChange={(e) => setDefaultsForm({ ...defaultsForm, thirdPrizeAmount: e.target.value })} />
              </FormField>
              <FormField label="4th Prize Amount">
                <Input type="number" min="0" value={defaultsForm.fourthPrizeAmount} onChange={(e) => setDefaultsForm({ ...defaultsForm, fourthPrizeAmount: e.target.value })} />
              </FormField>
              <FormField label="5th Prize Amount">
                <Input type="number" min="0" value={defaultsForm.fifthPrizeAmount} onChange={(e) => setDefaultsForm({ ...defaultsForm, fifthPrizeAmount: e.target.value })} />
              </FormField>
              <FormField label="5th Prize %" hint="Share of active tickets">
                <Input type="number" min="0" max="100" step="0.1" value={defaultsForm.fifthPrizePercentage} onChange={(e) => setDefaultsForm({ ...defaultsForm, fifthPrizePercentage: e.target.value })} />
              </FormField>
            </div>
            {defaultsError && <p className="rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-2 text-xs text-red-300">{defaultsError}</p>}
            <Button type="submit" className="w-full" loading={saveDefaultsMut.isPending}>
              Save Defaults
            </Button>
          </form>
        </Modal>
      </div>
    );
  }

  const secondCount = parseNumberList(form.secondPrizeNumbersText).length;
  const thirdCount = parseNumberList(form.thirdPrizeNumbersText).length;
  const fourthCount = parseNumberList(form.fourthPrizeNumbersText).length;
  const fifthCount = parseNumberList(form.fifthPrizeNumbersText).length;
  const suggestedFifthCount = Math.max(1, Math.round((soldCountForSlot * Number(form.fifthPrizePercentage || 0)) / 100));

  return (
    <div>
      <PageHeader
        title={editingId ? 'Edit Result' : 'Add New Result'}
        description="Every winning ticket's prize amount is credited straight to the selling agent's wallet as soon as you save."
        actions={
          <Button variant="secondary" onClick={() => setView('list')}>
            ← Back to Results
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>
            <IconTrophy className="mr-1.5 inline h-4 w-4 text-amber-400" /> Result Entry Form
          </CardTitle>
        </CardHeader>
        <CardBody className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Draw Name" required>
              <Input required value={form.drawName} onChange={(e) => setForm({ ...form, drawName: e.target.value })} placeholder="Enter Draw Name" />
            </FormField>
            <FormField label="Draw No." required>
              <Input required value={form.drawNumber} onChange={(e) => setForm({ ...form, drawNumber: e.target.value })} placeholder="Enter Draw Number" />
            </FormField>
            <FormField label="Draw Date" required>
              <Input type="date" required value={form.drawDate} onChange={(e) => setForm({ ...form, drawDate: e.target.value })} />
            </FormField>
            <FormField label="Slot" required>
              <Select required value={form.drawSlotId} onChange={(e) => setForm({ ...form, drawSlotId: e.target.value })}>
                <option value="">Select Slot</option>
                {slots?.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </FormField>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="First Prize" required hint="Format: PREFIX-00000 (Auto picks from sold tickets)">
              <div className="flex gap-2">
                <Input required value={form.firstPrizeTicketNumber} onChange={(e) => setForm({ ...form, firstPrizeTicketNumber: e.target.value.toUpperCase() })} placeholder="AAA-00000" className="font-mono" />
                <Button type="button" variant="secondary" disabled={!form.drawSlotId || !form.drawDate} loading={randomTicketMut.isPending} onClick={() => randomTicketMut.mutate()}>
                  Auto
                </Button>
              </div>
            </FormField>
            <FormField label="Percentage" required hint="Percentage of active tickets for 5th prize">
              <Input type="number" min="0" max="100" step="0.1" required value={form.fifthPrizePercentage} onChange={(e) => setForm({ ...form, fifthPrizePercentage: e.target.value })} />
            </FormField>
          </div>

          <div className="text-center">
            <Button type="button" accent="emerald" disabled={!form.drawSlotId || !form.drawDate} loading={autoGenerateAllMut.isPending} onClick={() => autoGenerateAllMut.mutate()}>
              ✦ Auto Generate All Prizes
            </Button>
            <p className="mt-2 text-xs text-slate-500">1st prize picked from sold tickets. 2nd from 5-digit range. 3rd, 4th &amp; 5th from 4-digit range. All numbers will be unique across prizes.</p>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="space-y-2">
              <FormField label={`Second Prize (${secondCount} Numbers – 5 digits)`} hint="Exactly 10 unique 5-digit numbers">
                <Textarea rows={4} value={form.secondPrizeNumbersText} onChange={(e) => setForm({ ...form, secondPrizeNumbersText: e.target.value })} placeholder="Enter 10 unique 5-digit numbers separated by commas" />
              </FormField>
              <FormField label="Second Prize Amount" required>
                <Input type="number" min="0" required value={form.secondPrizeAmount} onChange={(e) => setForm({ ...form, secondPrizeAmount: e.target.value })} />
              </FormField>
            </div>

            <div className="space-y-2">
              <FormField label={`Fifth Prize (${fifthCount} Numbers – 4 digits)`} hint={`Suggested: ~${suggestedFifthCount} unique 4-digit numbers (different from 3rd and 4th prizes)`}>
                <Textarea rows={4} value={form.fifthPrizeNumbersText} onChange={(e) => setForm({ ...form, fifthPrizeNumbersText: e.target.value })} placeholder="Enter numbers separated by commas" />
              </FormField>
              <FormField label="Fifth Prize Amount" required>
                <Input type="number" min="0" required value={form.fifthPrizeAmount} onChange={(e) => setForm({ ...form, fifthPrizeAmount: e.target.value })} />
              </FormField>
            </div>

            <div className="space-y-2">
              <FormField label={`Third Prize (${thirdCount} Numbers – 4 digits)`} hint="Exactly 10 unique 4-digit numbers">
                <Textarea rows={4} value={form.thirdPrizeNumbersText} onChange={(e) => setForm({ ...form, thirdPrizeNumbersText: e.target.value })} placeholder="Enter 10 unique 4-digit numbers separated by commas" />
              </FormField>
              <FormField label="Third Prize Amount" required>
                <Input type="number" min="0" required value={form.thirdPrizeAmount} onChange={(e) => setForm({ ...form, thirdPrizeAmount: e.target.value })} />
              </FormField>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <FormField label={`Fourth Prize (${fourthCount} Numbers – 4 digits)`} hint="Exactly 10 unique 4-digit numbers (different from 3rd prize)">
                  <Textarea rows={4} value={form.fourthPrizeNumbersText} onChange={(e) => setForm({ ...form, fourthPrizeNumbersText: e.target.value })} placeholder="Enter 10 unique 4-digit numbers separated by commas" />
                </FormField>
                <FormField label="Fourth Prize Amount" required>
                  <Input type="number" min="0" required value={form.fourthPrizeAmount} onChange={(e) => setForm({ ...form, fourthPrizeAmount: e.target.value })} />
                </FormField>
              </div>

              <FormField label="First Prize Amount" required>
                <Input type="number" min="0" required value={form.firstPrizeAmount} onChange={(e) => setForm({ ...form, firstPrizeAmount: e.target.value })} />
              </FormField>

              <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-4">
                <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-amber-300">⚠ Important Rules:</p>
                <ul className="list-disc space-y-1 pl-5 text-xs text-amber-200/80">
                  <li>No duplicate 4-digit numbers between 3rd, 4th, and 5th prizes</li>
                  <li>All numbers must be unique within each prize category</li>
                  <li>System will validate before saving</li>
                </ul>
              </div>
            </div>
          </div>

          {error && <p className="rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-2 text-xs text-red-300">{error}</p>}

          <div className="flex flex-wrap justify-end gap-2 border-t border-white/8 pt-5">
            <Button type="button" variant="secondary" onClick={() => setForm(emptyForm)}>
              Reset
            </Button>
            <Button type="button" variant="ghost" onClick={() => setView('list')}>
              Cancel
            </Button>
            <Button
              accent="emerald"
              loading={saveMut.isPending}
              disabled={!form.drawName || !form.drawNumber || !form.drawSlotId || !form.firstPrizeTicketNumber}
              onClick={() => saveMut.mutate()}
            >
              Save Result
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
