import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { drawSlotsApi } from '@/api/drawSlots';
import { apiErrorMessage } from '@/api/axiosClient';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { FormField } from '@/components/ui/FormField';
import { StatusBadge } from '@/components/ui/Badge';
import { Switch } from '@/components/ui/Switch';
import { toast } from '@/store/toastStore';
import { formatTime } from '@/utils/format';
import { IconPlus, IconTrash } from '@/components/ui/icons';
import type { DrawSlot } from '@/types/api';

const emptyForm = { name: '', salesOpenTime: '10:00', drawCloseTime: '13:00', isActive: true };

export function DrawSlotsPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['draw-slots'], queryFn: drawSlotsApi.list, refetchInterval: 60000 });

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<DrawSlot | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);

  const createMut = useMutation({
    mutationFn: drawSlotsApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['draw-slots'] });
      toast.success('Draw slot created');
      closeModal();
    },
    onError: (err) => setError(apiErrorMessage(err)),
  });

  const updateMut = useMutation({
    mutationFn: (vars: { id: number; input: typeof form }) => drawSlotsApi.update(vars.id, vars.input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['draw-slots'] });
      toast.success('Draw slot updated');
      closeModal();
    },
    onError: (err) => setError(apiErrorMessage(err)),
  });

  const deleteMut = useMutation({
    mutationFn: drawSlotsApi.remove,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['draw-slots'] });
      toast.success('Draw slot deleted');
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setError(null);
    setModalOpen(true);
  }

  function openEdit(slot: DrawSlot) {
    setEditing(slot);
    setForm({
      name: slot.name,
      salesOpenTime: formatTime(slot.salesOpenTime),
      drawCloseTime: formatTime(slot.drawCloseTime),
      isActive: slot.isActive,
    });
    setError(null);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (editing) updateMut.mutate({ id: editing.id, input: form });
    else createMut.mutate(form);
  }

  const columns: Column<DrawSlot>[] = [
    { key: 'name', header: 'Slot Name', render: (r) => <span className="font-medium text-slate-100">{r.name}</span> },
    { key: 'open', header: 'Sales Open', render: (r) => formatTime(r.salesOpenTime) },
    { key: 'close', header: 'Draw / Close', render: (r) => formatTime(r.drawCloseTime) },
    { key: 'window', header: 'Window', render: (r) => `${r.salesWindowMinutes} min` },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    {
      key: 'active',
      header: 'Active',
      render: (r) => (
        <Switch checked={r.isActive} onChange={(v) => updateMut.mutate({ id: r.id, input: { ...emptyForm, name: r.name, salesOpenTime: formatTime(r.salesOpenTime), drawCloseTime: formatTime(r.drawCloseTime), isActive: v } })} />
      ),
    },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (r) => (
        <div className="flex justify-end gap-1.5">
          <Button size="sm" variant="secondary" onClick={() => openEdit(r)}>
            Edit
          </Button>
          <Button
            size="sm"
            variant="danger"
            icon={<IconTrash className="h-3.5 w-3.5" />}
            onClick={() => confirm(`Delete "${r.name}"?`) && deleteMut.mutate(r.id)}
          />
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Draw Slots"
        description="Recurring daily draw windows. Status auto-updates through the day."
        actions={
          <Button icon={<IconPlus className="h-4 w-4" />} onClick={openCreate}>
            Add Slot
          </Button>
        }
      />

      <Card>
        <DataTable columns={columns} data={data ?? []} rowKey={(r) => r.id} loading={isLoading} emptyTitle="No draw slots yet" />
      </Card>

      <Modal open={modalOpen} onClose={closeModal} title={editing ? 'Edit Draw Slot' : 'Add Draw Slot'}>
        <form onSubmit={onSubmit} className="space-y-4">
          <FormField label="Slot Name" required>
            <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. 1 PM Draw" />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Sales Open Time" required>
              <Input type="time" required value={form.salesOpenTime} onChange={(e) => setForm({ ...form, salesOpenTime: e.target.value })} />
            </FormField>
            <FormField label="Draw / Close Time" required>
              <Input type="time" required value={form.drawCloseTime} onChange={(e) => setForm({ ...form, drawCloseTime: e.target.value })} />
            </FormField>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-white/8 px-3 py-2.5">
            <span className="text-sm text-slate-300">Active</span>
            <Switch checked={form.isActive} onChange={(v) => setForm({ ...form, isActive: v })} />
          </div>
          {error && <p className="rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-2 text-xs text-red-300">{error}</p>}
          <Button type="submit" className="w-full" loading={createMut.isPending || updateMut.isPending}>
            {editing ? 'Save Changes' : 'Create Slot'}
          </Button>
        </form>
      </Modal>
    </div>
  );
}
