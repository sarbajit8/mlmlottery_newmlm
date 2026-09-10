import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { drawSlotsApi } from '@/api/drawSlots';
import { seriesApi } from '@/api/series';
import { systemApi } from '@/api/system';
import { ticketsApi, type PreviewResult } from '@/api/tickets';
import { apiErrorMessage } from '@/api/axiosClient';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { FormField } from '@/components/ui/FormField';
import { toast } from '@/store/toastStore';
import { formatCurrency, todayIso } from '@/utils/format';
import { IconTicket } from '@/components/ui/icons';

export function GenerateTicketsPage() {
  const navigate = useNavigate();
  const { data: slots } = useQuery({ queryKey: ['draw-slots'], queryFn: drawSlotsApi.list });
  const { data: seriesList } = useQuery({ queryKey: ['series'], queryFn: seriesApi.list });
  const { data: publicSettings } = useQuery({ queryKey: ['public-settings'], queryFn: systemApi.publicSettings });
  const ticketBasePrice = publicSettings?.ticketBasePrice ?? 0;

  const [form, setForm] = useState({
    drawDate: todayIso(),
    drawSlotId: '',
    seriesId: '',
    prefix: 'BC',
    startNumber: '1',
    quantity: '100',
    pricePerTicket: '',
  });
  const [dateTouched, setDateTouched] = useState(false);
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Default the draw date to the server's current draw date (business timezone), so generated
  // tickets land on the same date agents are actually selling for — not the browser's UTC date.
  useEffect(() => {
    const serverDate = slots?.[0]?.drawDate;
    if (serverDate && !dateTouched) setForm((f) => (f.drawDate === serverDate ? f : { ...f, drawDate: serverDate }));
  }, [slots, dateTouched]);

  useEffect(() => setPreview(null), [form.drawSlotId, form.seriesId, form.prefix, form.startNumber, form.quantity, form.pricePerTicket]);

  const selectedSeries = seriesList?.find((s) => s.id === Number(form.seriesId));
  const selectedMultiplier = selectedSeries ? Number(selectedSeries.multiplier) : 0;
  // The "Ticket Value" field is the per-SEM (1x) base for this batch; blank => the global base price.
  const effectiveUnitValue = form.pricePerTicket ? Number(form.pricePerTicket) || 0 : ticketBasePrice;
  const computedTicketPrice = effectiveUnitValue * selectedMultiplier;

  function buildInput() {
    return {
      drawSlotId: Number(form.drawSlotId),
      drawDate: form.drawDate,
      seriesId: Number(form.seriesId),
      prefix: form.prefix,
      startNumber: Number(form.startNumber),
      quantity: Number(form.quantity),
      pricePerTicket: form.pricePerTicket ? Number(form.pricePerTicket) : undefined,
    };
  }

  const previewMut = useMutation({
    mutationFn: () => ticketsApi.preview(buildInput()),
    onSuccess: (data) => {
      setPreview(data);
      setError(null);
    },
    onError: (err) => setError(apiErrorMessage(err)),
  });

  const generateMut = useMutation({
    mutationFn: () => ticketsApi.generate(buildInput()),
    onSuccess: (batch) => {
      toast.success(`Generated ${batch.quantity} tickets in batch ${batch.batchCode}`);
      navigate('/admin/tickets');
    },
    onError: (err) => setError(apiErrorMessage(err)),
  });

  const canSubmit = form.drawSlotId && form.seriesId && form.prefix && form.startNumber && form.quantity;

  return (
    <div>
      <PageHeader
        title="Generate Tickets"
        description="Bulk-generate a batch for a draw date, slot and series. SEM value and price = ticket value (per SEM) × the series multiplier."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Batch Details</CardTitle>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Draw Date" required>
                <Input type="date" required value={form.drawDate} onChange={(e) => { setDateTouched(true); setForm({ ...form, drawDate: e.target.value }); }} />
              </FormField>
              <FormField label="Draw Slot" required>
                <Select required value={form.drawSlotId} onChange={(e) => setForm({ ...form, drawSlotId: e.target.value })}>
                  <option value="">Select slot</option>
                  {slots?.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </Select>
              </FormField>
            </div>

            <FormField label="Series (SEM)" required>
              <Select
                required
                value={form.seriesId}
                onChange={(e) => setForm({ ...form, seriesId: e.target.value })}
              >
                <option value="">Select series</option>
                {seriesList
                  ?.filter((s) => s.status === 'ACTIVE')
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} — {Number(s.multiplier)}×
                    </option>
                  ))}
              </Select>
            </FormField>

            <div className="grid grid-cols-2 gap-3">
              <FormField label="Prefix" required hint="Alphanumeric, e.g. BC">
                <Input required value={form.prefix} onChange={(e) => setForm({ ...form, prefix: e.target.value.toUpperCase() })} />
              </FormField>
              <FormField label="Starting Number" required>
                <Input type="number" min="0" required value={form.startNumber} onChange={(e) => setForm({ ...form, startNumber: e.target.value })} />
              </FormField>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <FormField label="Bundle Quantity" required>
                <Input type="number" min="1" max="50000" required value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
              </FormField>
              <FormField
                label="Ticket Value (per SEM)"
                hint={
                  selectedSeries
                    ? `Blank uses base ${formatCurrency(ticketBasePrice)}. SEM value = price = value × ${selectedMultiplier}× = ${formatCurrency(computedTicketPrice)}`
                    : `Blank uses the global base price (${formatCurrency(ticketBasePrice)})`
                }
              >
                <Input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={form.pricePerTicket}
                  onChange={(e) => setForm({ ...form, pricePerTicket: e.target.value })}
                  placeholder={ticketBasePrice ? String(ticketBasePrice) : 'Auto'}
                />
              </FormField>
            </div>

            <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2.5 text-sm text-amber-200">
              Total Tickets to Generate: <span className="font-semibold">{Number(form.quantity) || 0}</span>
            </div>

            {error && <p className="rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-2 text-xs text-red-300">{error}</p>}

            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => previewMut.mutate()} loading={previewMut.isPending} disabled={!canSubmit}>
                Preview
              </Button>
              <Button onClick={() => generateMut.mutate()} loading={generateMut.isPending} disabled={!canSubmit || !preview}>
                Generate Tickets
              </Button>
            </div>
          </CardBody>
        </Card>

        <Card className="lg:col-span-2 h-fit">
          <CardHeader>
            <CardTitle>Preview</CardTitle>
          </CardHeader>
          <CardBody>
            {!preview ? (
              <div className="flex flex-col items-center justify-center gap-2 py-10 text-center text-slate-500">
                <IconTicket className="h-8 w-8" />
                <p className="text-xs">Click Preview to see the sample ticket range and totals before generating.</p>
              </div>
            ) : (
              <div className="space-y-3 text-sm">
                <Row label="First Ticket #" value={<span className="font-mono text-amber-300">{preview.firstTicketNumber}</span>} />
                <Row label="Last Ticket #" value={<span className="font-mono text-amber-300">{preview.lastTicketNumber}</span>} />
                <Row label="Total Tickets" value={preview.totalTickets} />
                <Row label="Price / Ticket" value={formatCurrency(preview.pricePerTicket)} />
                <div className="border-t border-white/8 pt-3">
                  <Row label="Total Amount" value={<span className="font-semibold text-emerald-300">{formatCurrency(preview.totalAmount)}</span>} />
                </div>
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-slate-500">{label}</span>
      <span className="text-slate-200">{value}</span>
    </div>
  );
}
