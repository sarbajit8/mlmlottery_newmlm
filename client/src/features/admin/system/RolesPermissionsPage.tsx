import { useQuery } from '@tanstack/react-query';
import { systemApi } from '@/api/system';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

export function RolesPermissionsPage() {
  const { data } = useQuery({ queryKey: ['roles-reference'], queryFn: systemApi.roles });

  return (
    <div>
      <PageHeader title="Roles & Permissions" description="Reference for how each role interacts with the platform." />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {(data as any[])?.map((r) => (
          <Card key={r.role}>
            <CardBody>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-100">{r.role.replace('_', ' ')}</h3>
                <Badge tone="amber">{r.panel}</Badge>
              </div>
              <p className="text-sm text-slate-400">{r.description}</p>
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  );
}
