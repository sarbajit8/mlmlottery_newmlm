import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { salesApi } from '@/api/sales';
import { apiErrorMessage } from '@/api/axiosClient';
import { useSiteName } from '@/hooks/useSiteName';
import { formatCurrency, formatDate } from '@/utils/format';
import { IconChevronRight, IconDownload, IconTicket, IconTrophy } from '@/components/ui/icons';

interface Theme {
  header: string;
  ring: string;
  number: string;
  tint: string;
  chip: string;
}

const PALETTE: Theme[] = [
  { header: 'from-amber-500 via-orange-500 to-red-500', ring: 'ring-amber-400', number: 'text-amber-600', tint: 'bg-amber-50', chip: 'bg-amber-500' },
  { header: 'from-violet-500 via-purple-500 to-fuchsia-500', ring: 'ring-violet-400', number: 'text-violet-600', tint: 'bg-violet-50', chip: 'bg-violet-500' },
  { header: 'from-sky-500 via-blue-500 to-indigo-500', ring: 'ring-sky-400', number: 'text-sky-600', tint: 'bg-sky-50', chip: 'bg-sky-500' },
  { header: 'from-rose-500 via-pink-500 to-fuchsia-500', ring: 'ring-rose-400', number: 'text-rose-600', tint: 'bg-rose-50', chip: 'bg-rose-500' },
  { header: 'from-emerald-500 via-teal-500 to-cyan-500', ring: 'ring-emerald-400', number: 'text-emerald-600', tint: 'bg-emerald-50', chip: 'bg-emerald-500' },
];

function themeFor(seriesName?: string): Theme {
  const key = seriesName ?? 'default';
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  return PALETTE[hash % PALETTE.length];
}

export function TicketPrintPage() {
  const { id } = useParams<{ id: string }>();
  const { companyName } = useSiteName();
  const { data: receipt, isLoading, error } = useQuery({
    queryKey: ['receipt-print', id],
    queryFn: () => salesApi.get(Number(id)),
    enabled: Boolean(id),
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-neutral-50 to-neutral-100 text-neutral-900">
      <div className="print:hidden sticky top-0 z-10 flex items-center justify-between border-b border-neutral-200 bg-white/90 px-4 py-3 backdrop-blur sm:px-8">
        <Link to="/agent/reports" className="flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-800">
          <IconChevronRight className="h-3.5 w-3.5 rotate-180" /> Back to Reports
        </Link>
        <button
          onClick={() => window.print()}
          disabled={!receipt}
          className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-amber-500 to-orange-600 px-4 py-2 text-sm font-medium text-white shadow-md shadow-orange-500/20 transition-transform hover:scale-[1.02] disabled:opacity-40"
        >
          <IconDownload className="h-4 w-4" /> Print / Save as PDF
        </button>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-8">
        {isLoading && <p className="py-16 text-center text-sm text-neutral-400">Loading tickets…</p>}
        {error && (
          <p className="mx-auto max-w-md rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-center text-sm text-red-700">
            {apiErrorMessage(error, 'Could not load this receipt')}
          </p>
        )}

        {receipt && (
          <>
            <div className="mb-6 print:hidden">
              <h1 className="text-lg font-semibold">Receipt {receipt.receiptCode}</h1>
              <p className="text-sm text-neutral-500">
                {receipt.tickets?.length ?? 0} ticket{(receipt.tickets?.length ?? 0) === 1 ? '' : 's'} &middot; {receipt.customer?.name} &middot; {formatDate(receipt.createdAt)}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              {receipt.tickets?.map((t) => {
                const theme = themeFor(t.series?.name);
                return (
                  <div key={t.id} className={`break-inside-avoid relative overflow-hidden rounded-2xl bg-white shadow-lg ring-2 ${theme.ring}`}>
                    <div className={`relative overflow-hidden bg-gradient-to-r ${theme.header} px-4 py-2.5 text-white`}>
                      <div
                        className="pointer-events-none absolute inset-0 opacity-20"
                        style={{ backgroundImage: 'repeating-linear-gradient(45deg, #fff 0, #fff 2px, transparent 2px, transparent 12px)' }}
                      />
                      <div className="relative flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider drop-shadow">
                          <IconTicket className="h-3.5 w-3.5" /> {companyName}
                        </span>
                        <span className="flex items-center gap-1 rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-semibold">
                          <IconTrophy className="h-3 w-3" /> {receipt.drawSlot?.name}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-3 px-4 py-4">
                      <div className={`rounded-lg ${theme.tint} px-3 py-2.5`}>
                        <p className={`text-[10px] font-semibold uppercase tracking-widest ${theme.number} opacity-80`}>Ticket Number</p>
                        <p className={`font-mono text-2xl font-extrabold tracking-wide ${theme.number}`}>{t.ticketNumber}</p>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <p className="text-neutral-400">Draw Date</p>
                          <p className="font-medium">{formatDate(receipt.drawDate)}</p>
                        </div>
                        <div>
                          <p className="text-neutral-400">Series</p>
                          <p className="font-medium">
                            <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold text-white ${theme.chip}`}>{t.series?.name ?? '—'}</span>
                          </p>
                        </div>
                        <div>
                          <p className="text-neutral-400">SEM Value</p>
                          <p className="font-medium">{formatCurrency(t.semValue)}</p>
                        </div>
                        <div>
                          <p className="text-neutral-400">Price Paid</p>
                          <p className="font-medium">{formatCurrency(t.price)}</p>
                        </div>
                      </div>
                    </div>

                    {/* Perforated tear-off stub */}
                    <div className="relative">
                      <div className={`absolute -left-2 top-0 h-4 w-4 -translate-y-1/2 rounded-full bg-gradient-to-b from-neutral-50 to-neutral-100 ring-2 ${theme.ring}`} />
                      <div className={`absolute -right-2 top-0 h-4 w-4 -translate-y-1/2 rounded-full bg-gradient-to-b from-neutral-50 to-neutral-100 ring-2 ${theme.ring}`} />
                      <div className="border-t-2 border-dashed border-neutral-300" />
                    </div>

                    <div className={`flex items-center justify-between ${theme.tint} px-4 py-2 text-[10px] text-neutral-500`}>
                      <span>Receipt {receipt.receiptCode}</span>
                      <span>Sold by {receipt.agent?.name}</span>
                    </div>
                    {receipt.customer?.name && <p className="px-4 pb-2 text-[10px] text-neutral-500">Customer: {receipt.customer.name}</p>}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
