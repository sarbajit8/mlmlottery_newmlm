import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { bankDetailsApi } from '@/api/bankDetails';
import { apiErrorMessage } from '@/api/axiosClient';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Input';
import { StatusBadge } from '@/components/ui/Badge';
import { toast } from '@/store/toastStore';
import { formatDateTime } from '@/utils/format';
import type { BankDetailsRequest, BankDetailsStatus } from '@/types/api';

function maskAccountNumber(n: string) {
  if (n.length <= 4) return n;
  return `••••${n.slice(-4)}`;
}

export function BankDetailsRequestsPage() {
  const qc = useQueryClient();
  const [status, setStatus] = useState<BankDetailsStatus | ''>('PENDING');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['bank-details-requests', status, page],
    queryFn: () => bankDetailsApi.listRequests({ status: status || undefined, page, pageSize: 20 }),
  });

  const processMut = useMutation({
    mutationFn: (vars: { id: number; status: 'APPROVED' | 'REJECTED'; rejectionReason?: string }) =>
      bankDetailsApi.processRequest(vars.id, vars.status, vars.rejectionReason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bank-details-requests'] });
      toast.success('Request updated');
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });

  function reject(id: number) {
    const reason = window.prompt('Reason for rejecting (optional):') ?? undefined;
    processMut.mutate({ id, status: 'REJECTED', rejectionReason: reason || undefined });
  }

  const columns: Column<BankDetailsRequest>[] = [
    { key: 'agent', header: 'Agent', render: (r) => <span className="font-medium text-slate-100">{r.user?.name}</span> },
    { key: 'code', header: 'Referral Code', render: (r) => <span className="font-mono text-xs">{r.user?.referralCode}</span> },
    { key: 'holder', header: 'Requested Account Holder', render: (r) => r.bankAccountHolder },
    { key: 'account', header: 'Account Number', render: (r) => <span className="font-mono text-xs">{maskAccountNumber(r.bankAccountNumber)}</span> },
    { key: 'ifsc', header: 'IFSC', render: (r) => <span className="font-mono text-xs">{r.bankIfsc}</span> },
    { key: 'upi', header: 'UPI ID', render: (r) => <span className="font-mono text-xs">{r.upiId || '—'}</span> },
    { key: 'requested', header: 'Requested At', render: (r) => formatDateTime(r.requestedAt) },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (r) =>
        r.status === 'PENDING' ? (
          <div className="flex justify-end gap-1.5">
            <Button size="sm" onClick={() => processMut.mutate({ id: r.id, status: 'APPROVED' })}>
              Approve
            </Button>
            <Button size="sm" variant="danger" onClick={() => reject(r.id)}>
              Reject
            </Button>
          </div>
        ) : (
          r.rejectionReason && <span className="text-xs text-slate-500">{r.rejectionReason}</span>
        ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Bank Detail Requests"
        description="Agents' first-ever bank/UPI submission applies instantly — these are the changes to already-set details, which need your approval before they take effect."
        actions={
          <Select value={status} onChange={(e) => { setStatus(e.target.value as BankDetailsStatus | ''); setPage(1); }} className="max-w-40">
            <option value="">All statuses</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </Select>
        }
      />
      <Card>
        <div className="overflow-x-auto">
          <DataTable columns={columns} data={data?.items ?? []} rowKey={(r) => r.id} loading={isLoading} total={data?.total} page={page} pageSize={20} onPageChange={setPage} emptyTitle="No bank detail requests" />
        </div>
      </Card>
    </div>
  );
}
