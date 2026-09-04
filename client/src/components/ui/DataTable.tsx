import type { ReactNode } from 'react';
import { TableSkeleton } from './Skeleton';
import { EmptyState } from './EmptyState';
import { Button } from './Button';

export interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  rowKey: (row: T) => string | number;
  loading?: boolean;
  total?: number;
  page?: number;
  pageSize?: number;
  onPageChange?: (page: number) => void;
  emptyTitle?: string;
  emptyDescription?: string;
  onRowClick?: (row: T) => void;
  accent?: 'amber' | 'emerald';
}

export function DataTable<T>({
  columns,
  data,
  rowKey,
  loading,
  total,
  page = 1,
  pageSize = 20,
  onPageChange,
  emptyTitle = 'No records found',
  emptyDescription,
  onRowClick,
  accent = 'amber',
}: DataTableProps<T>) {
  const totalPages = total !== undefined ? Math.max(1, Math.ceil(total / pageSize)) : 1;

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-max border-collapse text-sm">
          <thead>
            <tr className="border-b border-white/8 text-left text-xs uppercase tracking-wider text-slate-500">
              {columns.map((col) => (
                <th key={col.key} className={`px-4 py-3 font-medium ${col.className ?? ''}`}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {!loading &&
              data.map((row) => (
                <tr
                  key={rowKey(row)}
                  onClick={() => onRowClick?.(row)}
                  className={`text-slate-200 ${onRowClick ? 'cursor-pointer hover:bg-white/[0.03]' : ''} transition-colors`}
                >
                  {columns.map((col) => (
                    <td key={col.key} className={`px-4 py-3 ${col.className ?? ''}`}>
                      {col.render(row)}
                    </td>
                  ))}
                </tr>
              ))}
          </tbody>
        </table>
        {loading && <TableSkeleton cols={columns.length} />}
      </div>

      {!loading && data.length === 0 && <EmptyState title={emptyTitle} description={emptyDescription} />}

      {onPageChange && total !== undefined && total > pageSize && (
        <div className="flex items-center justify-between border-t border-white/8 px-4 py-3">
          <p className="text-xs text-slate-500">
            Page {page} of {totalPages} &middot; {total} total
          </p>
          <div className="flex gap-2">
            <Button variant="secondary" accent={accent} size="sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
              Previous
            </Button>
            <Button variant="secondary" accent={accent} size="sm" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
