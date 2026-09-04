import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { mlmApi } from '@/api/mlm';
import { apiErrorMessage } from '@/api/axiosClient';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { FormField } from '@/components/ui/FormField';
import { toast } from '@/store/toastStore';
import { cn } from '@/utils/cn';

interface LevelRow {
  levelNumber: number;
  percentage: string;
}

export function MlmSettingsPage() {
  const qc = useQueryClient();
  const { data: settings } = useQuery({ queryKey: ['mlm-settings'], queryFn: mlmApi.getSettings });

  const [maxLevels, setMaxLevels] = useState(5);
  const [payoutMode, setPayoutMode] = useState<'INSTANT' | 'BATCH'>('INSTANT');
  const [shortfallPolicy, setShortfallPolicy] = useState<'FORFEIT' | 'ROLLUP_TO_ADMIN'>('ROLLUP_TO_ADMIN');
  const [minPayoutThreshold, setMinPayoutThreshold] = useState('0');
  const [levels, setLevels] = useState<LevelRow[]>([]);
  const [error, setError] = useState<string | null>(null);

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
        levelPercentages: levels.map((l) => ({ levelNumber: l.levelNumber, percentage: Number(l.percentage) || 0 })),
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
      <PageHeader title="MLM Settings" description="Configure how deep and how much commission pays out on every sale." />

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
            <CardTitle>Percentage per Level</CardTitle>
            <span className={cn('text-sm font-semibold', totalPercent > 100 ? 'text-red-400' : 'text-emerald-400')}>
              Total: {totalPercent.toFixed(2)}%
            </span>
          </CardHeader>
          <CardBody>
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
      </div>
    </div>
  );
}
