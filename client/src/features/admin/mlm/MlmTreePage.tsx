import { useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { mlmApi } from '@/api/mlm';
import { usersApi } from '@/api/users';
import { useAuth } from '@/hooks/useAuth';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Input';
import { StatusBadge } from '@/components/ui/Badge';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { OrgTree } from '@/components/OrgTree';
import { formatCurrency } from '@/utils/format';
import type { TreeNode } from '@/types/api';

function flatten(node: TreeNode, acc: TreeNode[] = []): TreeNode[] {
  acc.push(node);
  node.children.forEach((c) => flatten(c, acc));
  return acc;
}

export function MlmTreePage() {
  const { user } = useAuth();
  const location = useLocation();
  const initialRootId = (location.state as { rootId?: number } | null)?.rootId;
  const [rootId, setRootId] = useState<number | null>(initialRootId ?? user?.id ?? null);
  const [view, setView] = useState<'tree' | 'flat'>('tree');

  const { data: users } = useQuery({ queryKey: ['users-all'], queryFn: () => usersApi.list({ pageSize: 100 }) });
  const { data: tree, isLoading } = useQuery({
    queryKey: ['mlm-tree', rootId],
    queryFn: () => mlmApi.getTree(rootId!),
    enabled: rootId !== null,
  });

  const flatRows = useMemo(() => (tree ? flatten(tree) : []), [tree]);

  const columns: Column<TreeNode>[] = [
    { key: 'name', header: 'Name', render: (r) => <span className="pl-[calc(var(--d)*14px)] font-medium text-slate-100" style={{ '--d': r.depth } as any}>{'—'.repeat(r.depth)} {r.name}</span> },
    { key: 'level', header: 'Level', render: (r) => r.depth },
    { key: 'role', header: 'Role', render: (r) => r.role.replace('_', ' ') },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    { key: 'direct', header: 'Direct Downline', render: (r) => r.directCount },
    { key: 'today', header: "Today's Sales", render: (r) => formatCurrency(r.personalSalesToday) },
    { key: 'team', header: 'Team Sales', render: (r) => <span className="font-medium text-amber-300">{formatCurrency(r.teamSales)}</span> },
  ];

  return (
    <div>
      <PageHeader
        title="MLM Tree"
        description="Explore any agent's unilevel downline structure."
        actions={
          <div className="flex items-center gap-2">
            <Select value={rootId ?? ''} onChange={(e) => setRootId(Number(e.target.value))} className="max-w-64">
              {users?.items.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.referralCode}) — {u.role.replace('_', ' ')}
                </option>
              ))}
            </Select>
            <Button size="sm" variant={view === 'tree' ? 'primary' : 'secondary'} onClick={() => setView('tree')}>
              Tree
            </Button>
            <Button size="sm" variant={view === 'flat' ? 'primary' : 'secondary'} onClick={() => setView('flat')}>
              Table
            </Button>
          </div>
        }
      />

      {isLoading && <p className="text-sm text-slate-500">Loading tree…</p>}

      {!isLoading && tree && view === 'tree' && (
        <Card className="h-[65vh] overflow-hidden">
          <OrgTree root={tree} accent="amber" />
        </Card>
      )}

      {!isLoading && tree && view === 'flat' && (
        <Card>
          <DataTable columns={columns} data={flatRows} rowKey={(r) => r.id} emptyTitle="No downline yet" />
        </Card>
      )}
    </div>
  );
}
