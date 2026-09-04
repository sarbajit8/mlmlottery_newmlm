import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { QRCodeSVG } from 'qrcode.react';
import { mlmApi } from '@/api/mlm';
import { apiErrorMessage } from '@/api/axiosClient';
import { useAuth } from '@/hooks/useAuth';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { FormField } from '@/components/ui/FormField';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { StatusBadge } from '@/components/ui/Badge';
import { OrgTree } from '@/components/OrgTree';
import { toast } from '@/store/toastStore';
import { formatCurrency } from '@/utils/format';
import { IconUserPlus } from '@/components/ui/icons';
import type { TreeNode } from '@/types/api';

function flatten(node: TreeNode, acc: TreeNode[] = []): TreeNode[] {
  if (node.depth > 0) acc.push(node);
  node.children.forEach((c) => flatten(c, acc));
  return acc;
}

export function MyTeamPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [view, setView] = useState<'tree' | 'table'>('tree');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', mobile: '', whatsapp: '', password: '' });
  const [error, setError] = useState<string | null>(null);

  const { data: tree, isLoading } = useQuery({ queryKey: ['my-tree'], queryFn: mlmApi.getMyTree });
  const flatRows = useMemo(() => (tree ? flatten(tree) : []), [tree]);

  const referralLink = `${window.location.origin}/join?ref=${user?.referralCode}`;

  const recruitMut = useMutation({
    mutationFn: () => mlmApi.recruit(form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-tree'] });
      toast.success('Agent added — they can log in right away');
      setModalOpen(false);
      setForm({ name: '', email: '', mobile: '', whatsapp: '', password: '' });
    },
    onError: (err) => setError(apiErrorMessage(err)),
  });

  const columns: Column<TreeNode>[] = [
    { key: 'name', header: 'Name', render: (r) => <span className="font-medium text-slate-100">{'—'.repeat(r.depth - 1)} {r.name}</span> },
    { key: 'level', header: 'Level', render: (r) => r.depth },
    { key: 'role', header: 'Role', render: (r) => r.role.replace('_', ' ') },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    { key: 'team', header: 'Team Sales', render: (r) => <span className="font-medium text-emerald-300">{formatCurrency(r.teamSales)}</span> },
  ];

  return (
    <div>
      <PageHeader
        title="My Team"
        description="Recruit agents and grow your downline."
        actions={
          <Button accent="emerald" icon={<IconUserPlus className="h-4 w-4" />} onClick={() => setModalOpen(true)}>
            Recruit Agent
          </Button>
        }
      />

      <Card className="mb-6">
        <CardBody className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Your Referral Link</p>
            <p className="mt-1 max-w-sm break-all font-mono text-sm text-emerald-300">{referralLink}</p>
            <Button
              size="sm"
              variant="secondary"
              accent="emerald"
              className="mt-2"
              onClick={() => {
                navigator.clipboard.writeText(referralLink);
                toast.success('Referral link copied');
              }}
            >
              Copy Link
            </Button>
          </div>
          <div className="rounded-xl bg-white p-2">
            <QRCodeSVG value={referralLink} size={96} />
          </div>
        </CardBody>
      </Card>

      <div className="mb-4 flex gap-2">
        <Button size="sm" variant={view === 'tree' ? 'primary' : 'secondary'} accent="emerald" onClick={() => setView('tree')}>
          Tree View
        </Button>
        <Button size="sm" variant={view === 'table' ? 'primary' : 'secondary'} accent="emerald" onClick={() => setView('table')}>
          Table View
        </Button>
      </div>

      {isLoading && <p className="text-sm text-slate-500">Loading your team…</p>}

      {!isLoading && tree && view === 'tree' && (
        <Card className="h-[60vh] overflow-hidden">
          <OrgTree root={tree} accent="emerald" />
        </Card>
      )}

      {!isLoading && tree && view === 'table' && (
        <Card>
          <DataTable columns={columns} data={flatRows} rowKey={(r) => r.id} emptyTitle="No downline yet" emptyDescription="Share your referral link to start recruiting." accent="emerald" />
        </Card>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Recruit New Agent">
        <form onSubmit={(e) => { e.preventDefault(); recruitMut.mutate(); }} className="space-y-3">
          <FormField label="Full Name" required>
            <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </FormField>
          <FormField label="Email" required>
            <Input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </FormField>
          <FormField label="Mobile" required>
            <Input required value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} />
          </FormField>
          <FormField label="WhatsApp">
            <Input value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} />
          </FormField>
          <FormField label="Temporary Password" required>
            <Input type="password" required minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </FormField>
          {error && <p className="rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-2 text-xs text-red-300">{error}</p>}
          <Button type="submit" accent="emerald" className="w-full" loading={recruitMut.isPending}>
            Add to My Team
          </Button>
        </form>
      </Modal>
    </div>
  );
}
