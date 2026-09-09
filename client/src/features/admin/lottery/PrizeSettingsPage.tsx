import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { seriesApi } from '@/api/series';
import { systemApi } from '@/api/system';
import { mlmApi } from '@/api/mlm';
import { apiErrorMessage } from '@/api/axiosClient';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { FormField } from '@/components/ui/FormField';
import { toast } from '@/store/toastStore';
import { formatCurrency } from '@/utils/format';
import type { PrizeAmountDefaults, PrizeTierKey, PrizeWinCommission } from '@/types/api';

const PRIZE_TIER_KEYS: PrizeTierKey[] = ['FIRST', 'SECOND', 'THIRD', 'FOURTH', 'FIFTH'];
const WIN_TIERS: { key: PrizeTierKey; label: string; amountKey: keyof PrizeAmountDefaults }[] = [
  { key: 'FIRST', label: '1st', amountKey: 'firstPrizeAmount' },
  { key: 'SECOND', label: '2nd', amountKey: 'secondPrizeAmount' },
  { key: 'THIRD', label: '3rd', amountKey: 'thirdPrizeAmount' },
  { key: 'FOURTH', label: '4th', amountKey: 'fourthPrizeAmount' },
  { key: 'FIFTH', label: '5th', amountKey: 'fifthPrizeAmount' },
];
const emptyWinCommission = (): PrizeWinCommission => ({ FIRST: [], SECOND: [], THIRD: [], FOURTH: [], FIFTH: [] });
const emptyMatrix = (): Record<PrizeTierKey, Record<number, string>> => ({ FIRST: {}, SECOND: {}, THIRD: {}, FOURTH: {}, FIFTH: {} });

const DEFAULTS: PrizeAmountDefaults = {
  firstPrizeAmount: 0,
  secondPrizeAmount: 0,
  thirdPrizeAmount: 0,
  fourthPrizeAmount: 0,
  fifthPrizeAmount: 0,
  fifthPrizePercentage: 50,
};

type Tier = 'first' | 'second' | 'third' | 'fourth' | 'fifth';
const TIERS: { tier: Tier; label: string; key: keyof PrizeAmountDefaults }[] = [
  { tier: 'first', label: '1st Prize', key: 'firstPrizeAmount' },
  { tier: 'second', label: '2nd Prize', key: 'secondPrizeAmount' },
  { tier: 'third', label: '3rd Prize', key: 'thirdPrizeAmount' },
  { tier: 'fourth', label: '4th Prize', key: 'fourthPrizeAmount' },
  { tier: 'fifth', label: '5th Prize', key: 'fifthPrizeAmount' },
];

export function PrizeSettingsPage() {
  const qc = useQueryClient();
  const { data: appSettings } = useQuery({ queryKey: ['app-settings'], queryFn: systemApi.settings });
  const { data: seriesList } = useQuery({ queryKey: ['series'], queryFn: seriesApi.list });

  const saved: PrizeAmountDefaults = useMemo(() => {
    const raw = appSettings?.find((s) => s.key === 'defaultPrizeAmounts')?.value;
    return raw && typeof raw === 'object' ? { ...DEFAULTS, ...(raw as Partial<PrizeAmountDefaults>) } : DEFAULTS;
  }, [appSettings]);

  const [form, setForm] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setForm({
      firstPrizeAmount: saved.firstPrizeAmount ? String(saved.firstPrizeAmount) : '',
      secondPrizeAmount: saved.secondPrizeAmount ? String(saved.secondPrizeAmount) : '',
      thirdPrizeAmount: saved.thirdPrizeAmount ? String(saved.thirdPrizeAmount) : '',
      fourthPrizeAmount: saved.fourthPrizeAmount ? String(saved.fourthPrizeAmount) : '',
      fifthPrizeAmount: saved.fifthPrizeAmount ? String(saved.fifthPrizeAmount) : '',
      fifthPrizePercentage: String(saved.fifthPrizePercentage ?? 50),
    });
  }, [saved]);

  const saveMut = useMutation({
    mutationFn: () =>
      systemApi.upsertSetting('defaultPrizeAmounts', {
        firstPrizeAmount: Number(form.firstPrizeAmount) || 0,
        secondPrizeAmount: Number(form.secondPrizeAmount) || 0,
        thirdPrizeAmount: Number(form.thirdPrizeAmount) || 0,
        fourthPrizeAmount: Number(form.fourthPrizeAmount) || 0,
        fifthPrizeAmount: Number(form.fifthPrizeAmount) || 0,
        fifthPrizePercentage: Number(form.fifthPrizePercentage) || 0,
      } satisfies PrizeAmountDefaults),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['app-settings'] });
      toast.success('Prize settings saved — applies to every result declared from now on');
      setError(null);
    },
    onError: (err) => setError(apiErrorMessage(err)),
  });

  // Series multipliers to preview the SEM-wise payout table.
  const activeSeries = (seriesList ?? []).filter((s) => s.status === 'ACTIVE').sort((a, b) => Number(a.multiplier) - Number(b.multiplier));

  // --- Prize win commission: a per-tier x per-level % matrix (AppSetting "prizeWinCommission") ---
  const { data: mlmSettings } = useQuery({ queryKey: ['mlm-settings'], queryFn: mlmApi.getSettings });
  const maxLevels = mlmSettings?.maxLevels ?? 0;
  const winLevels = Array.from({ length: maxLevels }, (_, i) => i + 1);
  const [winError, setWinError] = useState<string | null>(null);

  const savedWinCommission: PrizeWinCommission = useMemo(() => {
    const raw = appSettings?.find((s) => s.key === 'prizeWinCommission')?.value;
    const base = emptyWinCommission();
    if (raw && typeof raw === 'object') {
      for (const k of PRIZE_TIER_KEYS) {
        const arr = (raw as Record<string, unknown>)[k];
        if (Array.isArray(arr)) base[k] = arr.map((n) => Number(n) || 0);
      }
    }
    return base;
  }, [appSettings]);

  // winMatrix[tier][level] = string   (the % that actually gets saved)
  const [winMatrix, setWinMatrix] = useState<Record<PrizeTierKey, Record<number, string>>>(emptyMatrix);
  // calcMatrix[tier][level] = rupee amount the admin wants to pay at that level for that prize
  const [calcMatrix, setCalcMatrix] = useState<Record<PrizeTierKey, Record<number, string>>>(emptyMatrix);
  const [calcSeeded, setCalcSeeded] = useState(false);

  useEffect(() => {
    if (!maxLevels) return;
    const next = emptyMatrix();
    for (const k of PRIZE_TIER_KEYS) {
      for (let lvl = 1; lvl <= maxLevels; lvl++) {
        const v = savedWinCommission[k][lvl - 1] ?? 0;
        next[k][lvl] = v ? String(v) : '';
      }
    }
    setWinMatrix(next);
  }, [maxLevels, savedWinCommission]);

  const baseAmountFor = (k: PrizeTierKey) => {
    const t = WIN_TIERS.find((x) => x.key === k)!;
    return Number(form[t.amountKey]) || 0;
  };

  // Seed the calculator once — from the saved %s against the current base amounts (₹ = %/100 × base).
  useEffect(() => {
    if (!maxLevels || calcSeeded || Object.keys(form).length === 0) return;
    setCalcSeeded(true);
    const next = emptyMatrix();
    for (const k of PRIZE_TIER_KEYS) {
      const base = baseAmountFor(k);
      for (let lvl = 1; lvl <= maxLevels; lvl++) {
        const pct = savedWinCommission[k][lvl - 1] ?? 0;
        next[k][lvl] = pct && base ? ((pct / 100) * base).toFixed(2) : '';
      }
    }
    setCalcMatrix(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [maxLevels, savedWinCommission, form, calcSeeded]);

  const calcPct = (k: PrizeTierKey, lvl: number) => {
    const base = baseAmountFor(k);
    const rupees = Number(calcMatrix[k]?.[lvl]) || 0;
    return base > 0 ? (rupees / base) * 100 : 0;
  };

  function applyCalculator() {
    setWinMatrix((prev) => {
      const next = emptyMatrix();
      for (const k of PRIZE_TIER_KEYS) {
        const base = baseAmountFor(k);
        for (const lvl of winLevels) {
          if (base > 0 && (calcMatrix[k]?.[lvl] ?? '') !== '') {
            next[k][lvl] = String(Math.round(calcPct(k, lvl) * 100) / 100);
          } else {
            next[k][lvl] = prev[k]?.[lvl] ?? '';
          }
        }
      }
      return next;
    });
    toast.success('Commission % filled from the calculator — review, then Save');
  }

  const winTierTotal = (k: PrizeTierKey) => winLevels.reduce((sum, lvl) => sum + (Number(winMatrix[k]?.[lvl]) || 0), 0);
  const anyWinTierOver100 = PRIZE_TIER_KEYS.some((k) => winTierTotal(k) > 100);

  const saveWinMut = useMutation({
    mutationFn: () => {
      const payload = emptyWinCommission();
      for (const k of PRIZE_TIER_KEYS) {
        payload[k] = winLevels.map((lvl) => Number(winMatrix[k]?.[lvl]) || 0);
      }
      return systemApi.upsertSetting('prizeWinCommission', payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['app-settings'] });
      toast.success('Prize win commission saved');
      setWinError(null);
    },
    onError: (err) => setWinError(apiErrorMessage(err)),
  });

  return (
    <div>
      <PageHeader
        title="Prize Settings"
        description="Set every prize amount and the per-prize, per-level win commission here. Amounts are the 1-SEM base — each winning ticket is paid this × its series multiplier (3CM wins 3×, 5CM 5×…), minus the win commission paid down the chain (level 1 = the seller)."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-2 h-fit">
          <CardHeader>
            <CardTitle>Default Prize Amounts (per 1 SEM)</CardTitle>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {TIERS.map(({ label, key }) => (
                <FormField key={key} label={`${label} Amount`}>
                  <Input
                    type="number"
                    min="0"
                    value={form[key] ?? ''}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  />
                </FormField>
              ))}
              <FormField
                label="5th Prize — winner pool size %"
                hint="How MANY tickets win 5th prize, not a money rate: e.g. 50 = half of the sold tickets in that draw win 5th prize. Used to suggest how many 5th-prize numbers to generate."
              >
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={form.fifthPrizePercentage ?? ''}
                  onChange={(e) => setForm({ ...form, fifthPrizePercentage: e.target.value })}
                />
              </FormField>
            </div>

            {error && <p className="rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-2 text-xs text-red-300">{error}</p>}

            <Button className="w-full" loading={saveMut.isPending} onClick={() => saveMut.mutate()}>
              Save Prize Settings
            </Button>
          </CardBody>
        </Card>

        <Card className="lg:col-span-3 h-fit">
          <CardHeader>
            <CardTitle>Payout Preview (by series)</CardTitle>
            <span className="text-xs text-slate-500">Base × each active series' multiplier</span>
          </CardHeader>
          <CardBody>
            {activeSeries.length === 0 ? (
              <p className="text-sm text-slate-500">No active series yet — add one under Series (SEM).</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[28rem] text-sm">
                  <thead>
                    <tr className="text-left text-xs text-slate-500">
                      <th className="py-2 pr-4 font-medium">Tier</th>
                      <th className="py-2 pr-4 font-medium">1 SEM</th>
                      {activeSeries.map((s) => (
                        <th key={s.id} className="py-2 pr-4 font-medium">
                          {s.name} ({Number(s.multiplier)}×)
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {TIERS.map(({ tier, label, key }) => {
                      const base = Number(form[key]) || 0;
                      return (
                        <tr key={tier} className="border-t border-white/8">
                          <td className="py-2 pr-4 text-slate-400">{label}</td>
                          <td className="py-2 pr-4">{formatCurrency(base)}</td>
                          {activeSeries.map((s) => (
                            <td key={s.id} className="py-2 pr-4 font-medium text-amber-300">
                              {formatCurrency(base * Number(s.multiplier))}
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            <p className="mt-3 text-xs text-slate-500">
              These are the full prizes. Every level of the win-commission matrix below is taken out of the winning ticket's
              prize; the selling agent (level 1) both earns their level-1 commission AND receives whatever is left after all
              levels' cuts.
            </p>
          </CardBody>
        </Card>

        <Card className="lg:col-span-5">
          <CardHeader>
            <CardTitle>Prize Win Commission — per prize, per level</CardTitle>
          </CardHeader>
          <CardBody className="space-y-4">
            <p className="text-xs text-slate-500">
              When a ticket wins, each level earns its % of that ticket's SEM-scaled prize — <span className="text-slate-300">level 1 is
              the agent who sold the ticket</span> (they get this commission on top of the prize), level 2 their sponsor, and so
              on; empty upper levels roll up to the company wallet. Every prize position has its own column. The seller's net
              prize = full prize − the sum of that column.
            </p>

            {!mlmSettings ? (
              <p className="text-sm text-slate-500">Loading levels…</p>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[40rem] text-sm">
                    <thead>
                      <tr className="text-left text-xs text-slate-500">
                        <th className="py-2 pr-3 font-medium">Level</th>
                        {WIN_TIERS.map((t) => (
                          <th key={t.key} className="py-2 pr-3 font-medium">{t.label} Prize</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {winLevels.map((lvl) => (
                        <tr key={lvl} className="border-t border-white/8">
                          <td className="py-1.5 pr-3 text-xs text-slate-400">
                            Level {lvl}
                            {lvl === 1 && <span className="ml-1 text-slate-600">(seller)</span>}
                          </td>
                          {WIN_TIERS.map((t) => (
                            <td key={t.key} className="py-1.5 pr-3">
                              <Input
                                className="max-w-24"
                                type="number"
                                min="0"
                                max="100"
                                step="0.1"
                                value={winMatrix[t.key]?.[lvl] ?? ''}
                                onChange={(e) =>
                                  setWinMatrix((m) => ({ ...m, [t.key]: { ...m[t.key], [lvl]: e.target.value } }))
                                }
                              />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t border-white/8 text-xs text-slate-400">
                        <td className="py-2 pr-3">Total</td>
                        {WIN_TIERS.map((t) => {
                          const tot = winTierTotal(t.key);
                          return (
                            <td key={t.key} className={tot > 100 ? 'py-2 pr-3 font-semibold text-red-400' : 'py-2 pr-3 font-semibold text-emerald-400'}>
                              {tot.toFixed(2)}%
                            </td>
                          );
                        })}
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {anyWinTierOver100 && (
                  <p className="rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-2 text-xs text-red-300">
                    A prize column sums to over 100% — that winner would owe more than the prize. Double-check.
                  </p>
                )}
                {winError && <p className="rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-2 text-xs text-red-300">{winError}</p>}

                <div className="flex items-center gap-3">
                  <Button loading={saveWinMut.isPending} onClick={() => saveWinMut.mutate()}>
                    Save Win Commission
                  </Button>
                  <span className="text-xs text-slate-500">
                    Number of levels comes from MLM Settings.
                  </span>
                </div>
              </>
            )}
          </CardBody>
        </Card>

        {mlmSettings && (
          <Card className="lg:col-span-5">
            <CardHeader>
              <CardTitle>Rupee → Percentage Calculator (win commission)</CardTitle>
              <span className="text-xs text-slate-500">Helper only — apply, then Save Win Commission above</span>
            </CardHeader>
            <CardBody className="space-y-4">
              <p className="text-xs text-slate-500">
                Enter the <span className="text-slate-300">rupee amount</span> you want each level to earn for each prize. It's
                back-solved into a % against that prize's 1-SEM base amount (set at the top of this page). A winning 3× / 5×
                ticket then earns the same % of its bigger prize.
              </p>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[44rem] text-sm">
                  <thead>
                    <tr className="text-left text-xs text-slate-500">
                      <th className="py-2 pr-3 font-medium">Level</th>
                      {WIN_TIERS.map((t) => (
                        <th key={t.key} className="py-2 pr-3 font-medium">
                          {t.label} Prize
                          <span className="ml-1 font-normal text-slate-600">/ {formatCurrency(baseAmountFor(t.key))}</span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {winLevels.map((lvl) => (
                      <tr key={lvl} className="border-t border-white/8">
                        <td className="py-1.5 pr-3 text-xs text-slate-400">
                          Level {lvl}
                          {lvl === 1 && <span className="ml-1 text-slate-600">(seller)</span>}
                        </td>
                        {WIN_TIERS.map((t) => {
                          const base = baseAmountFor(t.key);
                          const pct = calcPct(t.key, lvl);
                          return (
                            <td key={t.key} className="py-1.5 pr-3">
                              <Input
                                className="max-w-24"
                                type="number"
                                min="0"
                                step="0.01"
                                disabled={base <= 0}
                                placeholder={base <= 0 ? 'set amount' : 'Rs.'}
                                value={calcMatrix[t.key]?.[lvl] ?? ''}
                                onChange={(e) =>
                                  setCalcMatrix((m) => ({ ...m, [t.key]: { ...m[t.key], [lvl]: e.target.value } }))
                                }
                              />
                              {base > 0 && (calcMatrix[t.key]?.[lvl] ?? '') !== '' && (
                                <span className="mt-0.5 block text-[10px] text-amber-300">= {pct.toFixed(2)}%</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-white/8 text-xs text-slate-400">
                      <td className="py-2 pr-3">Total</td>
                      {WIN_TIERS.map((t) => {
                        const totRs = winLevels.reduce((s, lvl) => s + (Number(calcMatrix[t.key]?.[lvl]) || 0), 0);
                        return (
                          <td key={t.key} className="py-2 pr-3">
                            {formatCurrency(totRs)}
                          </td>
                        );
                      })}
                    </tr>
                  </tfoot>
                </table>
              </div>

              <Button variant="secondary" onClick={applyCalculator}>
                Apply percentages to the matrix
              </Button>
            </CardBody>
          </Card>
        )}
      </div>
    </div>
  );
}
