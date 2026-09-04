import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { usersApi } from '@/api/users';
import { apiErrorMessage } from '@/api/axiosClient';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { FormField } from '@/components/ui/FormField';
import { StatusBadge } from '@/components/ui/Badge';
import { toast } from '@/store/toastStore';
import { formatDate } from '@/utils/format';
import { IconPlus, IconNetwork, IconKey } from '@/components/ui/icons';
import type { User, UserStatus } from '@/types/api';

const emptyForm = { name: '', email: '', mobile: '', whatsapp: '', password: '', sponsorId: '', autoApprove: true };

export function UsersPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [passwordTarget, setPasswordTarget] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['users', search, page],
    queryFn: () => usersApi.list({ role: 'AGENT', search: search || undefined, page, pageSize: 15 }),
  });

  const createMut = useMutation({
    mutationFn: () => usersApi.create({ ...form, sponsorId: form.sponsorId ? Number(form.sponsorId) : null }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      toast.success('Agent created');
      setModalOpen(false);
      setForm(emptyForm);
    },
    onError: (err) => setError(apiErrorMessage(err)),
  });

  const statusMut = useMutation({
    mutationFn: (vars: { id: number; status: UserStatus }) => usersApi.setStatus(vars.id, vars.status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      toast.success('User status updated');
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });

  const passwordMut = useMutation({
    mutationFn: () => usersApi.setPassword(passwordTarget!.id, newPassword),
    onSuccess: () => {
      toast.success(`Password updated for ${passwordTarget?.name}`);
      setPasswordTarget(null);
      setNewPassword('');
      setPasswordError(null);
    },
    onError: (err) => setPasswordError(apiErrorMessage(err)),
  });

  const columns: Column<User>[] = [
    { key: 'name', header: 'Name', render: (r) => <span className="font-medium text-slate-100">{r.name}</span> },
    { key: 'code', header: 'Referral Code', render: (r) => <span className="font-mono text-xs">{r.referralCode}</span> },
    { key: 'sponsor', header: 'Sponsor', render: (r) => r.sponsor?.name ?? '—' },
    { key: 'downline', header: 'Downline', render: (r) => r._count?.downline ?? 0 },
    { key: 'joined', header: 'Joined', render: (r) => formatDate(r.createdAt) },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (r) => (
        <div className="flex justify-end gap-1.5">
          <Button size="sm" variant="secondary" icon={<IconNetwork className="h-3.5 w-3.5" />} onClick={() => navigate('/admin/mlm/tree', { state: { rootId: r.id } })}>
            Tree
          </Button>
          <Button size="sm" variant="secondary" icon={<IconKey className="h-3.5 w-3.5" />} onClick={() => { setPasswordTarget(r); setNewPassword(''); setPasswordError(null); }}>
            Password
          </Button>
          {r.status === 'PENDING_KYC' && (
            <Button size="sm" onClick={() => statusMut.mutate({ id: r.id, status: 'ACTIVE' })}>
              Approve
            </Button>
          )}
          {r.status === 'ACTIVE' && (
            <Button size="sm" variant="danger" onClick={() => statusMut.mutate({ id: r.id, status: 'INACTIVE' })}>
              Deactivate
            </Button>
          )}
          {r.status === 'INACTIVE' && (
            <Button size="sm" onClick={() => statusMut.mutate({ id: r.id, status: 'ACTIVE' })}>
              Activate
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Agents"
        description="Agents you've created, plus anyone who self-registered via a referral link or was recruited by another agent — those two paths land here as Pending KYC until you approve them."
        actions={
          <div className="flex items-center gap-2">
            <Input placeholder="Search name, email, mobile…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="w-56" />
            <Button icon={<IconPlus className="h-4 w-4" />} onClick={() => setModalOpen(true)}>
              Add Agent
            </Button>
          </div>
        }
      />

      <Card>
        <DataTable columns={columns} data={data?.items ?? []} rowKey={(r) => r.id} loading={isLoading} total={data?.total} page={page} pageSize={15} onPageChange={setPage} emptyTitle="No agents yet" emptyDescription="Add one directly, or share a referral link from an existing agent's My Team page." />
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add Agent">
        <form onSubmit={(e) => { e.preventDefault(); createMut.mutate(); }} className="space-y-3">
          <FormField label="Full Name" required>
            <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </FormField>
          <FormField label="Email" required>
            <Input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Mobile" required>
              <Input required value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} />
            </FormField>
            <FormField label="WhatsApp">
              <Input value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} />
            </FormField>
          </div>
          <FormField label="Password" required>
            <Input type="password" required minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </FormField>
          <FormField label="Sponsor User ID" hint="Leave blank to sponsor directly under Super Admin">
            <Input type="number" value={form.sponsorId} onChange={(e) => setForm({ ...form, sponsorId: e.target.value })} />
          </FormField>
          {error && <p className="rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-2 text-xs text-red-300">{error}</p>}
          <Button type="submit" className="w-full" loading={createMut.isPending}>
            Create Agent
          </Button>
        </form>
      </Modal>

      <Modal open={passwordTarget !== null} onClose={() => setPasswordTarget(null)} title={`Set Password — ${passwordTarget?.name}`}>
        <form onSubmit={(e) => { e.preventDefault(); passwordMut.mutate(); }} className="space-y-4">
          <p className="text-xs text-slate-500">
            The current password can't be recovered or viewed — this issues a brand new one and signs the agent out of any existing session.
          </p>
          <FormField label="New Password" required>
            <Input type="password" required minLength={6} autoFocus value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
          </FormField>
          {passwordError && <p className="rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-2 text-xs text-red-300">{passwordError}</p>}
          <Button type="submit" className="w-full" loading={passwordMut.isPending}>
            Update Password
          </Button>
        </form>
      </Modal>
    </div>
  );
}
