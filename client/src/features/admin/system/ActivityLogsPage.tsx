import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { systemApi, type AuditLogEntry } from '@/api/system';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { formatDateTime } from '@/utils/format';

export function ActivityLogsPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useQuery({ queryKey: ['activity-logs', page], queryFn: () => systemApi.activityLogs({ page, pageSize: 30 }) });

  const columns: Column<AuditLogEntry>[] = [
    { key: 'time', header: 'Time', render: (r) => formatDateTime(r.createdAt) },
    { key: 'actor', header: 'Actor', render: (r) => r.actor?.name ?? 'System' },
    { key: 'action', header: 'Action', render: (r) => <span className="font-mono text-xs text-amber-300">{r.action}</span> },
    { key: 'entity', header: 'Entity', render: (r) => `${r.entityType}${r.entityId ? ` #${r.entityId}` : ''}` },
  ];

  return (
    <div>
      <PageHeader title="Activity Logs" description="Audit trail of every ticket generation, sale, commission and withdrawal action." />
      <Card>
        <DataTable columns={columns} data={data?.items ?? []} rowKey={(r) => r.id} loading={isLoading} total={data?.total} page={page} pageSize={30} onPageChange={setPage} emptyTitle="No activity yet" />
      </Card>
    </div>
  );
}
