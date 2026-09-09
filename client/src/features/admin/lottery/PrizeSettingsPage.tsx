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
import type { PrizeAmountDefaults } from '@/types/api';

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

  // --- Prize win commission per level (same store as MLM Settings' Win % column) ---
  const { data: mlmSettings } = useQuery({ queryKey: ['mlm-settings'], queryFn: mlmApi.getSettings });
  const [winForm, setWinForm] = useState<Record<number, string>>({});
  const [winError, setWinError] = useState<string | null>(null);

  useEffect(() => {
    if (!mlmSettings) return;
    const map: Record<number, string> = {};
    for (let lvl = 1; lvl <= mlmSettings.maxLevels; lvl++) {
      const row = mlmSettings.levelPercentages.find((l) => l.levelNumber === lvl);
      map[lvl] = row ? String(Number(row.winPercentage)) : '0';
    }
    setWinForm(map);
  }, [mlmSettings]);

  const winLevels = mlmSettings ? Array.from({ length: mlmSettings.maxLevels }, (_, i) => i + 1) : [];
  // Level 1 is the seller (keeps the prize) — only levels 2+ are an actual cut.
  const winTotal = winLevels.filter((lvl) => lvl >= 2).reduce((sum, lvl) => sum + (Number(winForm[lvl]) || 0), 0);

  const saveWinMut = useMutation({
    mutationFn: () => {
      if (!mlmSettings) throw new Error('MLM settings not loaded yet');
      return mlmApi.updateSettings({
        maxLevels: mlmSettings.maxLevels,
        commissionBase: mlmSettings.commissionBase,
        flatAmount: mlmSettings.flatAmount ? Number(mlmSettings.flatAmount) : undefined,
        payoutMode: mlmSettings.payoutMode,
        minPayoutThreshold: Number(mlmSettings.minPayoutThreshold),
        shortfallPolicy: mlmSettings.shortfallPolicy,
        levelPercentages: winLevels.map((lvl) => {
          const row = mlmSettings.levelPercentages.find((l) => l.levelNumber === lvl);
          return {
            levelNumber: lvl,
            percentage: row ? Number(row.percentage) : 0, // preserve the sale % — only win % changes here
            winPercentage: lvl === 1 ? 0 : Number(winForm[lvl]) || 0, // level 1 (seller) never has a win cut
          };
        }),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mlm-settings'] });
      toast.success('Prize win commission saved');
      setWinError(null);
    },
    onError: (err) => setWinError(apiErrorMessage(err)),
  });

  return (
    <div>
      <PageHeader
        title="Prize Settings"
        description="Set every prize amount and the level-wise win commission here. Amounts are the 1-SEM base — each winning ticket is paid this × its series multiplier (3CM wins 3×, 5CM 5×…), minus the win commission paid up the seller's chain."
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
              These are the full prizes. The prize win commission set below is taken out of each winning ticket's prize and
              paid up the seller's sponsor chain — the selling agent receives the remainder.
            </p>
          </CardBody>
        </Card>

        <Card className="lg:col-span-5">
          <CardHeader>
            <CardTitle>Prize Win Commission (per level)</CardTitle>
            <span className="text-xs text-slate-500">
              Total{' '}
              <span className={winTotal > 100 ? 'font-semibold text-red-400' : 'font-semibold text-emerald-400'}>{winTotal.toFixed(2)}%</span>
            </span>
          </CardHeader>
          <CardBody className="space-y-4">
            <p className="text-xs text-slate-500">
              Level 1 is the agent who sold the winning ticket — they keep the prize, so level 1 has no cut. Levels 2+ (the
              sponsor, then the sponsor's sponsor, …) each take their % out of that ticket's SEM-scaled prize; empty upper levels
              roll up to the company wallet. Same setting as the “Win %” column on MLM Settings.
            </p>

            {!mlmSettings ? (
              <p className="text-sm text-slate-500">Loading levels…</p>
            ) : (
              <>
                <div className="max-w-md space-y-2">
                  <div className="flex items-center gap-3 text-[11px] font-medium uppercase tracking-wide text-slate-500">
                    <span className="w-20 shrink-0">Level</span>
                    <span className="flex-1">Win commission %</span>
                  </div>
                  {winLevels.map((lvl) => (
                    <div key={lvl} className="flex items-center gap-3">
                      <span className="w-20 shrink-0 text-xs text-slate-400">Level {lvl}</span>
                      <Input
                        className="flex-1"
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        disabled={lvl === 1}
                        value={lvl === 1 ? '' : (winForm[lvl] ?? '')}
                        placeholder={lvl === 1 ? 'seller keeps the prize' : undefined}
                        onChange={(e) => setWinForm({ ...winForm, [lvl]: e.target.value })}
                      />
                      <span className="text-xs text-slate-500">%</span>
                    </div>
                  ))}
                </div>

                {winTotal > 100 && (
                  <p className="rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-2 text-xs text-red-300">
                    Win commission sums to over 100% — a winner would owe more than the prize. Double-check.
                  </p>
                )}
                {winError && <p className="rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-2 text-xs text-red-300">{winError}</p>}

                <div className="flex items-center gap-3">
                  <Button loading={saveWinMut.isPending} onClick={() => saveWinMut.mutate()}>
                    Save Win Commission
                  </Button>
                  <span className="text-xs text-slate-500">
                    To change the number of levels, use MLM Settings — it drives both sale and win commission.
                  </span>
                </div>
              </>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
