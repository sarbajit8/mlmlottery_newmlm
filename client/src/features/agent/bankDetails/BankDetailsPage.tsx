import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { bankDetailsApi } from '@/api/bankDetails';
import { authApi } from '@/api/auth';
import { apiErrorMessage } from '@/api/axiosClient';
import { useAuthStore } from '@/store/authStore';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { FormField } from '@/components/ui/FormField';
import { toast } from '@/store/toastStore';
import { IconCheck, IconClock } from '@/components/ui/icons';

function maskAccountNumber(n: string) {
  if (n.length <= 4) return n;
  return `••••${n.slice(-4)}`;
}

const emptyForm = { bankAccountHolder: '', bankAccountNumber: '', bankIfsc: '', bankName: '', upiId: '' };

export function BankDetailsPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const updateUser = useAuthStore((s) => s.updateUser);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({ queryKey: ['my-bank-details'], queryFn: bankDetailsApi.me });

  useEffect(() => {
    if (data && data.isComplete && !data.pendingRequest) {
      setForm({
        bankAccountHolder: data.bankAccountHolder ?? '',
        bankAccountNumber: data.bankAccountNumber ?? '',
        bankIfsc: data.bankIfsc ?? '',
        bankName: data.bankName ?? '',
        upiId: data.upiId ?? '',
      });
    }
  }, [data]);

  const submitMut = useMutation({
    mutationFn: () =>
      bankDetailsApi.submit({
        ...form,
        bankIfsc: form.bankIfsc.toUpperCase(),
        bankName: form.bankName.trim() || undefined,
        upiId: form.upiId.trim() || undefined,
      }),
    onSuccess: async (result) => {
      qc.invalidateQueries({ queryKey: ['my-bank-details'] });
      if (result.applied) {
        toast.success('Bank details saved — you can now use the agent panel');
        // Refresh the cached profile so the onboarding gate (which reads user.bankAccountNumber) lets us through immediately.
        try {
          const me = await authApi.me();
          updateUser(me);
        } catch {
          /* the bank-details query invalidation above still reflects it either way */
        }
        navigate('/agent', { replace: true });
      } else {
        toast.success('Change submitted — an admin will review it shortly');
      }
      setError(null);
    },
    onError: (err) => setError(apiErrorMessage(err)),
  });

  const isComplete = data?.isComplete ?? false;
  const pending = data?.pendingRequest ?? null;

  return (
    <div>
      <PageHeader
        title="Bank & UPI Details"
        description={
          isComplete
            ? 'Used for your withdrawal payouts. Changing these requires admin approval.'
            : 'Add these before you can sell tickets or use the rest of the agent panel — this is where your withdrawal payouts go.'
        }
      />

      {isLoading ? (
        <p className="py-8 text-center text-sm text-slate-500">Loading…</p>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {isComplete && (
            <Card className="h-fit">
              <CardHeader>
                <CardTitle>
                  <IconCheck className="mr-1.5 inline h-4 w-4 text-emerald-400" /> Current Details
                </CardTitle>
              </CardHeader>
              <CardBody className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Account Holder</span>
                  <span className="font-medium text-slate-100">{data?.bankAccountHolder}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Account Number</span>
                  <span className="font-mono text-slate-100">{maskAccountNumber(data?.bankAccountNumber ?? '')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">IFSC Code</span>
                  <span className="font-mono text-slate-100">{data?.bankIfsc}</span>
                </div>
                {data?.bankName && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Bank Name</span>
                    <span className="text-slate-100">{data.bankName}</span>
                  </div>
                )}
                {data?.upiId && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">UPI ID</span>
                    <span className="font-mono text-slate-100">{data.upiId}</span>
                  </div>
                )}
              </CardBody>
            </Card>
          )}

          <Card className="h-fit">
            <CardHeader>
              <CardTitle>{isComplete ? 'Request a Change' : 'Add Your Details'}</CardTitle>
            </CardHeader>
            <CardBody>
              {pending ? (
                <div className="rounded-lg border border-amber-500/25 bg-amber-500/10 p-4 text-sm">
                  <p className="mb-3 flex items-center gap-1.5 font-medium text-amber-300">
                    <IconClock className="h-4 w-4" /> Pending admin approval
                  </p>
                  <div className="space-y-2 text-xs text-amber-200/80">
                    <div className="flex justify-between">
                      <span>Account Holder</span>
                      <span>{pending.bankAccountHolder}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Account Number</span>
                      <span className="font-mono">{maskAccountNumber(pending.bankAccountNumber)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>IFSC Code</span>
                      <span className="font-mono">{pending.bankIfsc}</span>
                    </div>
                    {pending.upiId && (
                      <div className="flex justify-between">
                        <span>UPI ID</span>
                        <span className="font-mono">{pending.upiId}</span>
                      </div>
                    )}
                  </div>
                  <p className="mt-3 text-xs text-amber-200/60">Your current details stay active until this is approved or rejected.</p>
                </div>
              ) : (
                <form onSubmit={(e) => { e.preventDefault(); submitMut.mutate(); }} className="space-y-4">
                  <FormField label="Account Holder Name" required>
                    <Input required value={form.bankAccountHolder} onChange={(e) => setForm({ ...form, bankAccountHolder: e.target.value })} />
                  </FormField>
                  <FormField label="Account Number" required>
                    <Input required value={form.bankAccountNumber} onChange={(e) => setForm({ ...form, bankAccountNumber: e.target.value })} className="font-mono" />
                  </FormField>
                  <FormField label="IFSC Code" required hint="e.g. SBIN0001234">
                    <Input required value={form.bankIfsc} onChange={(e) => setForm({ ...form, bankIfsc: e.target.value.toUpperCase() })} className="font-mono" />
                  </FormField>
                  <FormField label="Bank Name (optional)">
                    <Input value={form.bankName} onChange={(e) => setForm({ ...form, bankName: e.target.value })} />
                  </FormField>
                  <FormField label="UPI ID (optional)" hint="e.g. name@okhdfcbank">
                    <Input value={form.upiId} onChange={(e) => setForm({ ...form, upiId: e.target.value })} className="font-mono" />
                  </FormField>
                  {error && <p className="rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-2 text-xs text-red-300">{error}</p>}
                  <Button type="submit" accent="emerald" className="w-full" loading={submitMut.isPending}>
                    {isComplete ? 'Submit for Approval' : 'Save & Continue'}
                  </Button>
                </form>
              )}
            </CardBody>
          </Card>
        </div>
      )}
    </div>
  );
}
