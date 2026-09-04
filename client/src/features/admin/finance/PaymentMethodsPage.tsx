import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { paymentMethodsApi } from '@/api/paymentMethods';
import { apiErrorMessage } from '@/api/axiosClient';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { FormField } from '@/components/ui/FormField';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { toast } from '@/store/toastStore';
import { IconCheck, IconPlus, IconQrCode, IconTrash } from '@/components/ui/icons';
import type { PaymentMethod } from '@/types/api';

const MAX_QR_BYTES = 1.5 * 1024 * 1024;

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Could not read the selected file'));
    reader.readAsDataURL(file);
  });
}

const emptyForm = { label: '', upiId: '', qrImage: '' };

export function PaymentMethodsPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['payment-methods'], queryFn: paymentMethodsApi.list });

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<PaymentMethod | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);

  const invalidate = () => qc.invalidateQueries({ queryKey: ['payment-methods'] });

  const createMut = useMutation({
    mutationFn: () => paymentMethodsApi.create(form),
    onSuccess: () => {
      invalidate();
      toast.success('Payment method added');
      setModalOpen(false);
    },
    onError: (err) => setError(apiErrorMessage(err)),
  });

  const updateMut = useMutation({
    mutationFn: () => paymentMethodsApi.update(editing!.id, form),
    onSuccess: () => {
      invalidate();
      toast.success('Payment method updated');
      setModalOpen(false);
    },
    onError: (err) => setError(apiErrorMessage(err)),
  });

  const activateMut = useMutation({
    mutationFn: paymentMethodsApi.activate,
    onSuccess: () => {
      invalidate();
      toast.success('Active payment method updated');
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });

  const deleteMut = useMutation({
    mutationFn: paymentMethodsApi.remove,
    onSuccess: () => {
      invalidate();
      toast.success('Payment method deleted');
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setError(null);
    setModalOpen(true);
  }
  function openEdit(pm: PaymentMethod) {
    setEditing(pm);
    setForm({ label: pm.label, upiId: pm.upiId, qrImage: pm.qrImage });
    setError(null);
    setModalOpen(true);
  }

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_QR_BYTES) {
      setError('QR image is too large — please use an image under 1.5MB.');
      return;
    }
    try {
      const dataUrl = await fileToDataUrl(file);
      setForm((f) => ({ ...f, qrImage: dataUrl }));
      setError(null);
    } catch {
      setError('Could not read the selected file');
    }
  }

  return (
    <div>
      <PageHeader
        title="Payment Methods"
        description="Manage the UPI / QR payment targets agents pay before a sale is completed. Only one method can be active at a time."
        actions={
          <Button icon={<IconPlus className="h-4 w-4" />} onClick={openCreate}>
            Add Payment Method
          </Button>
        }
      />

      {!isLoading && data?.length === 0 && (
        <Card className="mb-6">
          <CardBody>
            <EmptyState
              title="No payment methods configured"
              description="Add a UPI ID and QR code so agents have something to pay before completing a sale."
              icon={<IconQrCode className="h-8 w-8" />}
            />
          </CardBody>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data?.map((pm) => (
          <Card key={pm.id} className={pm.isActive ? 'border-emerald-500/40' : undefined}>
            <CardBody>
              <div className="mb-3 flex items-start justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-100">{pm.label}</p>
                  <p className="mt-0.5 font-mono text-xs text-slate-400">{pm.upiId}</p>
                </div>
                {pm.isActive ? (
                  <Badge tone="green" dot>
                    Active
                  </Badge>
                ) : (
                  <Badge tone="neutral">Inactive</Badge>
                )}
              </div>

              <div className="mx-auto flex h-36 w-36 items-center justify-center overflow-hidden rounded-lg border border-white/8 bg-white p-1">
                <img src={pm.qrImage} alt={`${pm.label} QR code`} className="h-full w-full object-contain" />
              </div>

              <div className="mt-3 flex gap-1.5">
                {!pm.isActive && (
                  <Button size="sm" variant="secondary" accent="emerald" icon={<IconCheck className="h-3.5 w-3.5" />} loading={activateMut.isPending} onClick={() => activateMut.mutate(pm.id)}>
                    Set Active
                  </Button>
                )}
                <Button size="sm" variant="secondary" onClick={() => openEdit(pm)}>
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  icon={<IconTrash className="h-3.5 w-3.5" />}
                  onClick={() => confirm(`Delete "${pm.label}"?`) && deleteMut.mutate(pm.id)}
                />
              </div>
            </CardBody>
          </Card>
        ))}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Payment Method' : 'Add Payment Method'}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            editing ? updateMut.mutate() : createMut.mutate();
          }}
          className="space-y-4"
        >
          <FormField label="Label" required>
            <Input required value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="e.g. Company UPI" />
          </FormField>
          <FormField label="UPI ID" required>
            <Input required value={form.upiId} onChange={(e) => setForm({ ...form, upiId: e.target.value })} placeholder="e.g. company@upi" className="font-mono" />
          </FormField>
          <FormField label="QR Code Image" required hint="Upload the QR screenshot from your UPI app. Max 1.5MB.">
            <input
              type="file"
              accept="image/*"
              onChange={onFileChange}
              className="block w-full text-xs text-slate-400 file:mr-3 file:rounded-lg file:border-0 file:bg-white/8 file:px-3 file:py-2 file:text-xs file:text-slate-200 hover:file:bg-white/12"
            />
          </FormField>
          {form.qrImage && (
            <div className="mx-auto flex h-32 w-32 items-center justify-center overflow-hidden rounded-lg border border-white/8 bg-white p-1">
              <img src={form.qrImage} alt="QR preview" className="h-full w-full object-contain" />
            </div>
          )}
          {error && <p className="rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-2 text-xs text-red-300">{error}</p>}
          <Button type="submit" className="w-full" disabled={!form.qrImage} loading={createMut.isPending || updateMut.isPending}>
            {editing ? 'Save Changes' : 'Add Payment Method'}
          </Button>
        </form>
      </Modal>
    </div>
  );
}
