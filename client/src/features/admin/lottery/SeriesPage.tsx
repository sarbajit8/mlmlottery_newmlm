import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { seriesApi } from '@/api/series';
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
import { formatCurrency } from '@/utils/format';
import { IconPlus, IconTrash } from '@/components/ui/icons';
import type { Series } from '@/types/api';

const emptyForm = { name: '', multiplier: '3', status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE' };

export function SeriesPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['series'], queryFn: seriesApi.list });
  const { data: publicSettings } = useQuery({ queryKey: ['public-settings'], queryFn: systemApi.publicSettings });
  const ticketBasePrice = publicSettings?.ticketBasePrice ?? 0;

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Series | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);

  const invalidate = () => qc.invalidateQueries({ queryKey: ['series'] });

  const createMut = useMutation({
    mutationFn: () => seriesApi.create({ name: form.name, multiplier: Number(form.multiplier), status: form.status }),
    onSuccess: () => {
      invalidate();
      toast.success('Series created');
      setModalOpen(false);
    },
    onError: (err) => setError(apiErrorMessage(err)),
  });

  const updateMut = useMutation({
    mutationFn: () => seriesApi.update(editing!.id, { name: form.name, multiplier: Number(form.multiplier), status: form.status }),
    onSuccess: () => {
      invalidate();
      toast.success('Series updated');
      setModalOpen(false);
    },
    onError: (err) => setError(apiErrorMessage(err)),
  });

  const deleteMut = useMutation({
    mutationFn: seriesApi.remove,
    onSuccess: () => {
      invalidate();
      toast.success('Series deleted');
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setError(null);
    setModalOpen(true);
  }
  function openEdit(s: Series) {
    setEditing(s);
    setForm({ name: s.name, multiplier: s.multiplier, status: s.status });
    setError(null);
    setModalOpen(true);
  }

  const columns: Column<Series>[] = [
    { key: 'name', header: 'Series', render: (r) => <span className="font-medium text-slate-100">{r.name}</span> },
    { key: 'multiplier', header: 'SEM', render: (r) => `${Number(r.multiplier)}×` },
    { key: 'sem', header: 'Ticket Price (SEM Value)', render: (r) => <span className="font-medium text-amber-300">{formatCurrency(r.semValue)}</span> },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (r) => (
        <div className="flex justify-end gap-1.5">
          <Button size="sm" variant="secondary" onClick={() => openEdit(r)}>
            Edit
          </Button>
          <Button size="sm" variant="danger" icon={<IconTrash className="h-3.5 w-3.5" />} onClick={() => confirm(`Delete "${r.name}"?`) && deleteMut.mutate(r.id)} />
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Series (SEM)"
        description={`SEM tiers used for ticket pricing, prize money and commission. Ticket price = SEM × the ticket base price (currently ${formatCurrency(ticketBasePrice)} — set it under Settings), and a winning ticket's prize is the declared amount × its SEM.`}
        actions={
          <Button icon={<IconPlus className="h-4 w-4" />} onClick={openCreate}>
            Add Series
          </Button>
        }
      />

      <Card>
        <DataTable columns={columns} data={data ?? []} rowKey={(r) => r.id} loading={isLoading} emptyTitle="No series configured yet" />
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Series' : 'Add Series'}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            editing ? updateMut.mutate() : createMut.mutate();
          }}
          className="space-y-4"
        >
          <FormField label="Series Name" required>
            <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. 5CM" />
          </FormField>
          <FormField label="SEM (multiplier)" required hint={`Ticket base price is ${formatCurrency(ticketBasePrice)} (1 SEM) — set under Settings, shared by every series. Price = SEM × base.`}>
            <Input type="number" min="0.01" step="0.01" required value={form.multiplier} onChange={(e) => setForm({ ...form, multiplier: e.target.value })} />
          </FormField>
          <div className="rounded-lg border border-white/8 px-3 py-2 text-xs text-slate-400">
            <p>
              Ticket price: <span className="font-medium text-amber-300">{formatCurrency((Number(form.multiplier) || 0) * ticketBasePrice)}</span>
              <span className="text-slate-500"> = {Number(form.multiplier) || 0} × {formatCurrency(ticketBasePrice)}</span>
            </p>
            <p className="mt-1 text-slate-500">
              1 SEM {formatCurrency(ticketBasePrice)} · 2 SEM {formatCurrency(2 * ticketBasePrice)} · 3 SEM {formatCurrency(3 * ticketBasePrice)} · 4 SEM {formatCurrency(4 * ticketBasePrice)}
            </p>
            <p className="mt-1 text-slate-500">Prize money also scales by SEM — a 2-SEM winning ticket is paid 2× the declared prize.</p>
          </div>
          <FormField label="Status">
            <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as 'ACTIVE' | 'INACTIVE' })}>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </Select>
          </FormField>
          {error && <p className="rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-2 text-xs text-red-300">{error}</p>}
          <Button type="submit" className="w-full" loading={createMut.isPending || updateMut.isPending}>
            {editing ? 'Save Changes' : 'Create Series'}
          </Button>
        </form>
      </Modal>
    </div>
  );
}
