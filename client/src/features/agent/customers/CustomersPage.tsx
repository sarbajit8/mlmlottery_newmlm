import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { customersApi } from '@/api/customers';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { formatCurrency, formatDate } from '@/utils/format';
import type { Customer } from '@/types/api';

export function CustomersPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [viewingId, setViewingId] = useState<number | null>(null);

  const { data, isLoading } = useQuery({ queryKey: ['customers', search, page], queryFn: () => customersApi.list({ search: search || undefined, page, pageSize: 20 }) });
  const { data: detail } = useQuery({ queryKey: ['customer', viewingId], queryFn: () => customersApi.get(viewingId!), enabled: viewingId !== null });

  const columns: Column<Customer>[] = [
    { key: 'name', header: 'Name', render: (r) => <span className="font-medium text-slate-100">{r.name}</span> },
    { key: 'mobile', header: 'Mobile', render: (r) => r.mobile },
    { key: 'tickets', header: 'Tickets Purchased', render: (r) => r._count?.tickets ?? 0 },
    { key: 'since', header: 'Customer Since', render: (r) => formatDate(r.createdAt) },
  ];

  return (
    <div>
      <PageHeader
        title="Customers"
        description="People you've sold tickets to."
        actions={<Input placeholder="Search name or mobile…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="w-56" />}
      />

      <Card>
        <DataTable
          columns={columns}
          data={data?.items ?? []}
          rowKey={(r) => r.id}
          loading={isLoading}
          total={data?.total}
          page={page}
          pageSize={20}
          onPageChange={setPage}
          onRowClick={(r) => setViewingId(r.id)}
          emptyTitle="No customers yet"
          accent="emerald"
        />
      </Card>

      {viewingId && (
        <Modal open onClose={() => setViewingId(null)} title={detail?.name ?? 'Customer'} size="lg">
          {detail && (
            <div>
              <p className="text-sm text-slate-400">
                {detail.mobile} {detail.whatsapp && `· WhatsApp ${detail.whatsapp}`}
              </p>
              <div className="mt-4 space-y-2">
                {(detail as any).receipts?.map((r: any) => (
                  <div key={r.id} className="rounded-lg border border-white/8 px-3 py-2.5 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs text-emerald-300">{r.receiptCode}</span>
                      <span className="font-medium text-slate-200">{formatCurrency(r.totalAmount)}</span>
                    </div>
                    <p className="mt-1 text-[11px] text-slate-500">
                      {r.drawSlot?.name} &middot; {r.tickets?.length ?? 0} tickets &middot; {formatDate(r.createdAt)}
                    </p>
                  </div>
                ))}
                {!(detail as any).receipts?.length && <p className="py-4 text-center text-sm text-slate-500">No purchase history yet.</p>}
              </div>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
