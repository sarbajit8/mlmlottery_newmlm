import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { mlmApi } from '@/api/mlm';
import { systemApi } from '@/api/system';
import { apiErrorMessage } from '@/api/axiosClient';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { FormField } from '@/components/ui/FormField';
import { toast } from '@/store/toastStore';
import { formatCurrency } from '@/utils/format';
import { cn } from '@/utils/cn';

interface LevelRow {
  levelNumber: number;
  percentage: string; // paid up the chain when a ticket is sold
}

export function MlmSettingsPage() {
  const qc = useQueryClient();
  const { data: settings } = useQuery({ queryKey: ['mlm-settings'], queryFn: mlmApi.getSettings });
  const { data: publicSettings } = useQuery({ queryKey: ['public-settings'], queryFn: systemApi.publicSettings });
  const ticketBasePrice = publicSettings?.ticketBasePrice ?? 0;

  const [maxLevels, setMaxLevels] = useState(5);
  const [payoutMode, setPayoutMode] = useState<'INSTANT' | 'BATCH'>('INSTANT');
  const [shortfallPolicy, setShortfallPolicy] = useState<'FORFEIT' | 'ROLLUP_TO_ADMIN'>('ROLLUP_TO_ADMIN');
  const [minPayoutThreshold, setMinPayoutThreshold] = useState('0');
  const [levels, setLevels] = useState<LevelRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Rupee -> percentage helper: admin types the payout they want per level (in Rs.) against a
  // reference ticket SEM value, and the tool back-solves the percentage to enter for each level.
  const [calcPrice, setCalcPrice] = useState('');
  const [calcAmounts, setCalcAmounts] = useState<Record<number, string>>({});
  const [calcSeeded, setCalcSeeded] = useState(false);

  useEffect(() => {
    if (!settings) return;
    setMaxLevels(settings.maxLevels);
    setPayoutMode(settings.payoutMode);
    setShortfallPolicy(settings.shortfallPolicy);
    setMinPayoutThreshold(settings.minPayoutThreshold);
    setLevels(
      Array.from({ length: settings.maxLevels }, (_, i) => {
        const existing = settings.levelPercentages.find((l) => l.levelNumber === i + 1);
        return { levelNumber: i + 1, percentage: existing?.percentage ?? '0' };
      }),
    );
  }, [settings]);

  // Seed the calculator once: reference price from the ticket base price, per-level rupee amounts
  // from whatever percentages are currently configured.
  useEffect(() => {
    if (!settings || !ticketBasePrice || calcSeeded) return;
    setCalcSeeded(true);
    setCalcPrice(String(ticketBasePrice));
    setCalcAmounts(
      Object.fromEntries(
        settings.levelPercentages.map((l) => [l.levelNumber, ((Number(l.percentage) || 0) / 100 * ticketBasePrice).toFixed(2)]),
      ),
    );
  }, [settings, ticketBasePrice, calcSeeded]);

  const calcPriceNum = Number(calcPrice) || 0;
  const calcRows = levels.map((l) => {
    const amount = Number(calcAmounts[l.levelNumber] ?? '') || 0;
    const pct = calcPriceNum > 0 ? (amount / calcPriceNum) * 100 : 0;
    const roundedPct = Math.round(pct * 100) / 100; // stored as Decimal(5,2)
    const actualPayout = (roundedPct / 100) * calcPriceNum;
    return { levelNumber: l.levelNumber, amount, pct, roundedPct, actualPayout };
  });
  const calcTotalAmount = calcRows.reduce((s, r) => s + r.amount, 0);
  const calcTotalPct = calcRows.reduce((s, r) => s + r.roundedPct, 0);

  function applyCalculator() {
    if (calcPriceNum <= 0) return;
    setLevels((prev) =>
      prev.map((l) => {
        const amount = Number(calcAmounts[l.levelNumber] ?? '') || 0;
        return { ...l, percentage: String(Math.round((amount / calcPriceNum) * 100 * 100) / 100) };
      }),
    );
    toast.success('Percentages filled from the calculator — review and Save');
  }

  function onMaxLevelsChange(n: number) {
    setMaxLevels(n);
    setLevels((prev) => {
      const next: LevelRow[] = [];
      for (let i = 1; i <= n; i++) {
        next.push(prev.find((p) => p.levelNumber === i) ?? { levelNumber: i, percentage: '0' });
      }
      return next;
    });
  }

  const totalPercent = levels.reduce((sum, l) => sum + (Number(l.percentage) || 0), 0);

  const saveMut = useMutation({
    mutationFn: () =>
      mlmApi.updateSettings({
        maxLevels,
        commissionBase: 'SEM_VALUE',
        payoutMode,
        minPayoutThreshold: Number(minPayoutThreshold),
        shortfallPolicy,
        levelPercentages: levels.map((l) => ({
          levelNumber: l.levelNumber,
          percentage: Number(l.percentage) || 0,
          winPercentage: 0, // prize-win commission moved to the Prize Settings page (per-tier matrix)
        })),
      }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['mlm-settings'] });
      toast.success('MLM settings saved. Past sales keep their original commission %.');
      if (res.warning) toast.error(res.warning);
      setError(null);
    },
    onError: (err) => setError(apiErrorMessage(err)),
  });

  return (
    <div>
      <PageHeader title="MLM Settings" description="How deep the tree pays and the sale-commission % per level. Prize-win commission is set on the Prize Settings page." />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-2 h-fit">
          <CardHeader>
            <CardTitle>General</CardTitle>
          </CardHeader>
          <CardBody className="space-y-4">
            <FormField label="Number of Commission Levels" required hint="1–20 levels deep">
              <Input type="number" min={1} max={20} value={maxLevels} onChange={(e) => onMaxLevelsChange(Number(e.target.value) || 1)} />
            </FormField>
            <FormField label="Commission Base">
              <Select value="SEM_VALUE" disabled>
                <option value="SEM_VALUE">SEM Value (multiplier × base price)</option>
              </Select>
            </FormField>
            <FormField label="Payout Mode" hint="Instant credits wallets the moment a sale happens">
              <Select value={payoutMode} onChange={(e) => setPayoutMode(e.target.value as 'INSTANT' | 'BATCH')}>
                <option value="INSTANT">Instant</option>
                <option value="BATCH">Batch (settled later)</option>
              </Select>
            </FormField>
            <FormField label="Minimum Payout Threshold">
              <Input type="number" min="0" step="0.01" value={minPayoutThreshold} onChange={(e) => setMinPayoutThreshold(e.target.value)} />
            </FormField>
            <FormField label="Shortfall Policy" hint="What happens to levels beyond an agent's upline chain">
              <Select value={shortfallPolicy} onChange={(e) => setShortfallPolicy(e.target.value as 'FORFEIT' | 'ROLLUP_TO_ADMIN')}>
                <option value="ROLLUP_TO_ADMIN">Roll up to Company Wallet</option>
                <option value="FORFEIT">Forfeit</option>
              </Select>
            </FormField>
          </CardBody>
        </Card>

        <Card className="lg:col-span-3 h-fit">
          <CardHeader>
            <CardTitle>Sale Commission % per Level</CardTitle>
            <span className={cn('text-sm font-semibold', totalPercent > 100 ? 'text-red-400' : 'text-emerald-400')}>
              Total: {totalPercent.toFixed(2)}%
            </span>
          </CardHeader>
          <CardBody>
            <p className="mb-3 text-xs text-slate-500">
              Paid on every ticket sold, minted as a bonus (% of SEM value). Level 1 is the agent who sold the ticket, level 2
              their sponsor, level 3 the sponsor's sponsor, and so on. Prize-win commission is a separate matrix on the Prize
              Settings page.
            </p>
            {totalPercent > 100 && (
              <p className="mb-3 rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-2 text-xs text-red-300">
                Level percentages sum to over 100%. This is allowed but double-check it's intentional.
              </p>
            )}
            <div className="max-h-96 space-y-2 overflow-y-auto pr-1">
              {levels.map((l, i) => (
                <div key={l.levelNumber} className="flex items-center gap-3">
                  <span className="w-20 shrink-0 text-xs text-slate-400">Level {l.levelNumber}</span>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={l.percentage}
                    onChange={(e) => {
                      const next = [...levels];
                      next[i] = { ...l, percentage: e.target.value };
                      setLevels(next);
                    }}
                  />
                  <span className="text-xs text-slate-500">%</span>
                </div>
              ))}
            </div>

            {error && <p className="mt-3 rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-2 text-xs text-red-300">{error}</p>}

            <Button className="mt-4 w-full" loading={saveMut.isPending} onClick={() => saveMut.mutate()}>
              Save MLM Settings
            </Button>
          </CardBody>
        </Card>

        <Card className="lg:col-span-5">
          <CardHeader>
            <CardTitle>Rupee → Percentage Calculator</CardTitle>
            <span className="text-xs text-slate-500">Helper for the Sale % column — nothing is saved until you apply it and hit Save MLM Settings</span>
          </CardHeader>
          <CardBody className="space-y-4">
            <FormField
              label="Reference Ticket SEM Value"
              hint="Commission is calculated on a ticket's SEM value. Pre-filled with the ticket base price; change it to model a bigger SEM series."
            >
              <Input type="number" min="0.01" step="0.01" value={calcPrice} onChange={(e) => setCalcPrice(e.target.value)} className="max-w-40" />
            </FormField>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[32rem] text-sm">
                <thead>
                  <tr className="text-left text-xs text-slate-500">
                    <th className="py-2 pr-4 font-medium">Level</th>
                    <th className="py-2 pr-4 font-medium">Payout you want (Rs.)</th>
                    <th className="py-2 pr-4 font-medium">= Percentage</th>
                    <th className="py-2 font-medium">Actual payout at that %</th>
                  </tr>
                </thead>
                <tbody>
                  {calcRows.map((r) => (
                    <tr key={r.levelNumber} className="border-t border-white/8">
                      <td className="py-2 pr-4 text-slate-400">Level {r.levelNumber}</td>
                      <td className="py-2 pr-4">
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          className="max-w-32"
                          value={calcAmounts[r.levelNumber] ?? ''}
                          onChange={(e) => setCalcAmounts((p) => ({ ...p, [r.levelNumber]: e.target.value }))}
                        />
                      </td>
                      <td className="py-2 pr-4 font-semibold text-amber-300">{r.pct.toFixed(2)}%</td>
                      <td className="py-2 text-slate-400">{calcPriceNum > 0 ? formatCurrency(r.actualPayout) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-white/8 text-xs text-slate-400">
                    <td className="py-2 pr-4">Total</td>
                    <td className="py-2 pr-4">{formatCurrency(calcTotalAmount)}</td>
                    <td className="py-2 pr-4 font-semibold text-amber-300">{calcTotalPct.toFixed(2)}%</td>
                    <td className="py-2">{calcPriceNum > 0 ? `per ${formatCurrency(calcPriceNum)} ticket` : ''}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button type="button" variant="secondary" onClick={applyCalculator} disabled={calcPriceNum <= 0}>
                Apply percentages to levels
              </Button>
              <span className="text-xs text-slate-500">
                Fills the “Percentage per Level” fields above — percentages are stored to 2 decimals, so the actual payout can differ by a paisa.
              </span>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
