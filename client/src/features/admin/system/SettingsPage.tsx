import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { systemApi } from '@/api/system';
import { apiErrorMessage } from '@/api/axiosClient';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { FormField } from '@/components/ui/FormField';
import { Logo } from '@/components/ui/Logo';
import { toast } from '@/store/toastStore';
import { IconTrash } from '@/components/ui/icons';

const FIELDS: { key: string; label: string; placeholder: string; hint?: string; type?: string }[] = [
  { key: 'companyName', label: 'Website / Company Name', placeholder: 'Bhutan Cherapunji Lottery', hint: 'Shown across the website — landing page, login, sidebars — and on every printed ticket.' },
  {
    key: 'ticketBasePrice',
    label: 'Ticket Base Price',
    placeholder: '10',
    type: 'number',
    hint: 'Every SEM series (3CM, 5CM, 10CM…) prices its tickets as Multiplier × this one base price.',
  },
  { key: 'supportWhatsapp', label: 'Support WhatsApp Number', placeholder: '+975...' },
  { key: 'supportEmail', label: 'Support Email', placeholder: 'support@example.com' },
];

const MAX_LOGO_BYTES = 1.5 * 1024 * 1024;

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Could not read the selected file'));
    reader.readAsDataURL(file);
  });
}

export function SettingsPage() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ['app-settings'], queryFn: systemApi.settings });
  const [values, setValues] = useState<Record<string, string>>({});
  const [logoError, setLogoError] = useState<string | null>(null);

  useEffect(() => {
    if (!data) return;
    const map: Record<string, string> = {};
    data.forEach((s) => (map[s.key] = typeof s.value === 'string' ? s.value : JSON.stringify(s.value)));
    setValues(map);
  }, [data]);

  function invalidateForLogo() {
    qc.invalidateQueries({ queryKey: ['app-settings'] });
    qc.invalidateQueries({ queryKey: ['public-settings'] });
  }

  const logoUploadMut = useMutation({
    mutationFn: (dataUrl: string) => systemApi.upsertSetting('logoUrl', dataUrl),
    onSuccess: () => {
      invalidateForLogo();
      toast.success('Logo updated');
      setLogoError(null);
    },
    onError: (err) => setLogoError(apiErrorMessage(err)),
  });

  const logoRemoveMut = useMutation({
    mutationFn: () => systemApi.upsertSetting('logoUrl', ''),
    onSuccess: () => {
      invalidateForLogo();
      toast.success('Logo removed — showing the initials badge again');
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });

  async function onLogoFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > MAX_LOGO_BYTES) {
      setLogoError('Logo image is too large — please use an image under 1.5MB.');
      return;
    }
    try {
      const dataUrl = await fileToDataUrl(file);
      logoUploadMut.mutate(dataUrl);
    } catch {
      setLogoError('Could not read the selected file');
    }
  }

  const saveMut = useMutation({
    mutationFn: (key: string) => systemApi.upsertSetting(key, values[key] ?? ''),
    onSuccess: (_data, key) => {
      qc.invalidateQueries({ queryKey: ['app-settings'] });
      if (key === 'companyName' || key === 'ticketBasePrice') qc.invalidateQueries({ queryKey: ['public-settings'] });
      if (key === 'ticketBasePrice') qc.invalidateQueries({ queryKey: ['series'] });
      toast.success('Setting saved');
    },
  });

  const currentLogo = values.logoUrl?.trim();

  return (
    <div>
      <PageHeader title="Settings" description="Platform-wide configuration." />

      <Card className="mb-6 max-w-xl">
        <CardHeader>
          <CardTitle>Site Logo</CardTitle>
        </CardHeader>
        <CardBody>
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/8 bg-white/[0.03]">
              <Logo className="h-14 w-14 rounded-lg text-lg" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm text-slate-300">{currentLogo ? 'Custom logo uploaded' : 'No logo uploaded — showing initials badge'}</p>
              <p className="mt-0.5 text-xs text-slate-500">PNG, JPG, or SVG. Max 1.5MB. Shown on the landing page, login/join, sidebars, and as the browser tab icon (favicon) — everywhere the brand appears.</p>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2">
            <label className="inline-flex cursor-pointer items-center rounded-lg bg-white/8 px-3 py-2 text-xs font-medium text-slate-200 hover:bg-white/12">
              {currentLogo ? 'Replace Logo' : 'Upload Logo'}
              <input type="file" accept="image/*" onChange={onLogoFileChange} className="hidden" />
            </label>
            {currentLogo && (
              <Button size="sm" variant="danger" icon={<IconTrash className="h-3.5 w-3.5" />} loading={logoRemoveMut.isPending} onClick={() => logoRemoveMut.mutate()}>
                Remove
              </Button>
            )}
            {logoUploadMut.isPending && <span className="text-xs text-slate-500">Uploading…</span>}
          </div>
          {logoError && <p className="mt-3 rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-2 text-xs text-red-300">{logoError}</p>}
        </CardBody>
      </Card>

      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>General</CardTitle>
        </CardHeader>
        <CardBody className="space-y-4">
          {FIELDS.map((f) => (
            <FormField key={f.key} label={f.label} hint={f.hint}>
              <div className="flex gap-2">
                <Input
                  type={f.type}
                  {...(f.type === 'number' ? { min: '0.01', step: '0.01' } : {})}
                  placeholder={f.placeholder}
                  value={values[f.key] ?? ''}
                  onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
                />
                <Button size="sm" loading={saveMut.isPending} onClick={() => saveMut.mutate(f.key)}>
                  Save
                </Button>
              </div>
            </FormField>
          ))}
        </CardBody>
      </Card>
    </div>
  );
}
