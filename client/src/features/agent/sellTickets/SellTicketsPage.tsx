import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { drawSlotsApi } from '@/api/drawSlots';
import { seriesApi } from '@/api/series';
import { ticketsApi } from '@/api/tickets';
import { customersApi } from '@/api/customers';
import { salesApi } from '@/api/sales';
import { walletApi } from '@/api/wallet';
import { apiErrorMessage } from '@/api/axiosClient';
import { useCartStore } from '@/store/cartStore';
import { useDebounce } from '@/hooks/useDebounce';
import { toast } from '@/store/toastStore';
import { cn } from '@/utils/cn';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { FormField } from '@/components/ui/FormField';
import { EmptyState } from '@/components/ui/EmptyState';
import { ReceiptModal } from './ReceiptModal';
import { formatCurrency, formatTime, todayIso } from '@/utils/format';
import { IconCart, IconSearch, IconTicket, IconWallet, IconX } from '@/components/ui/icons';
import type { SaleResult } from '@/types/api';

export function SellTicketsPage() {
  const qc = useQueryClient();
  const drawDate = todayIso();
  const [seriesId, setSeriesId] = useState('');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);

  const cart = useCartStore();
  const [customer, setCustomer] = useState({ name: '', mobile: '', whatsapp: '', email: '' });
  const [saleResult, setSaleResult] = useState<SaleResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Slots are recurring daily windows with a live-computed status — refetch often so the currently
  // sellable slot (and the cutover to the next one) tracks the clock without the agent picking anything.
  const { data: slots } = useQuery({ queryKey: ['draw-slots'], queryFn: drawSlotsApi.list, refetchInterval: 30000 });
  const { data: seriesList } = useQuery({ queryKey: ['series'], queryFn: seriesApi.list });
  const { data: wallet } = useQuery({ queryKey: ['wallet'], queryFn: walletApi.get });
  const walletBalance = Number(wallet?.balance ?? 0);

  const openSlots = slots ?? [];
  const activeSlot = openSlots.find((s) => s.status === 'OPEN_NOW');
  const drawSlotId = activeSlot?.id;
  const nextSlot = openSlots.filter((s) => s.status === 'ACTIVE').sort((a, b) => a.salesOpenTime.localeCompare(b.salesOpenTime))[0];

  useEffect(() => {
    if (drawSlotId) cart.setContext(drawSlotId, drawDate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drawSlotId, drawDate]);

  const { data: searchResults, isFetching: searching } = useQuery({
    queryKey: ['ticket-search', drawSlotId, drawDate, seriesId, debouncedSearch],
    queryFn: () =>
      ticketsApi.search({
        drawSlotId: drawSlotId!,
        drawDate,
        seriesId: seriesId ? Number(seriesId) : undefined,
        q: debouncedSearch || undefined,
        pageSize: 60,
      }),
    enabled: Boolean(drawSlotId),
  });

  const debouncedMobile = useDebounce(customer.mobile, 500);
  useEffect(() => {
    if (debouncedMobile.length < 6) return;
    customersApi.lookup(debouncedMobile).then((found) => {
      if (found) setCustomer((c) => ({ ...c, name: found.name, whatsapp: found.whatsapp ?? '' }));
    });
  }, [debouncedMobile]);

  const totalSem = cart.items.reduce((sum, t) => sum + Number(t.semValue), 0);
  const totalAmount = cart.items.reduce((sum, t) => sum + Number(t.price), 0);
  const insufficientBalance = cart.items.length > 0 && totalAmount > walletBalance;

  const saleMut = useMutation({
    mutationFn: () =>
      salesApi.create({
        ticketIds: cart.items.map((t) => t.id),
        // The agent only enters a mobile number — name/WhatsApp come from an existing customer
        // record when the lookup finds one, or default from the mobile number for a new one.
        customer: {
          ...customer,
          name: customer.name.trim() || `Customer ${customer.mobile.trim()}`,
          whatsapp: customer.whatsapp.trim() || customer.mobile.trim(),
        },
      }),
    onSuccess: (result) => {
      setSaleResult(result);
      cart.clear();
      setCustomer({ name: '', mobile: '', whatsapp: '', email: '' });
      setError(null);
      qc.invalidateQueries({ queryKey: ['wallet'] });
    },
    onError: (err) => {
      setError(apiErrorMessage(err));
      toast.error(apiErrorMessage(err));
    },
  });

  return (
    <div>
      <PageHeader title="Sell Tickets" description="Search available tickets, build a cart, and complete the sale." />

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        {activeSlot ? (
          <div className="flex items-center gap-2 rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            Now selling <span className="font-semibold">{activeSlot.name}</span> — closes {formatTime(activeSlot.drawCloseTime)}
          </div>
        ) : (
          <div className="rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
            No draw slot is open right now.
            {nextSlot && (
              <>
                {' '}
                <span className="font-semibold">{nextSlot.name}</span> opens at {formatTime(nextSlot.salesOpenTime)}.
              </>
            )}
          </div>
        )}
        <div className="sm:w-56">
          <FormField label="Series">
            <Select value={seriesId} onChange={(e) => setSeriesId(e.target.value)}>
              <option value="">All series</option>
              {seriesList?.filter((s) => s.status === 'ACTIVE').map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </FormField>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Available Tickets</CardTitle>
            <div className="relative w-48">
              <IconSearch className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-500" />
              <Input placeholder="Ticket # or last 4" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8" />
            </div>
          </CardHeader>
          <CardBody>
            {!drawSlotId ? (
              <EmptyState title="No slot open for sales" description="Available tickets will appear here automatically once a draw slot opens." icon={<IconTicket className="h-8 w-8" />} />
            ) : searching ? (
              <p className="py-8 text-center text-sm text-slate-500">Searching…</p>
            ) : !searchResults?.items.length ? (
              <EmptyState title="No available tickets match" icon={<IconTicket className="h-8 w-8" />} />
            ) : (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {searchResults.items.map((t) => {
                  const inCart = cart.items.some((c) => c.id === t.id);
                  return (
                    <button
                      key={t.id}
                      disabled={inCart}
                      onClick={() => cart.add(t)}
                      className="flex flex-col items-start gap-0.5 rounded-lg border border-white/8 bg-white/[0.02] px-3 py-2 text-left transition-colors hover:border-emerald-500/40 hover:bg-emerald-500/5 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <span className="font-mono text-xs text-slate-200">{t.ticketNumber}</span>
                      <span className="text-[10px] text-slate-500">
                        {t.series?.name} &middot; {formatCurrency(t.price)}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </CardBody>
        </Card>

        <Card className="lg:col-span-2 h-fit">
          <CardHeader>
            <CardTitle>
              Cart ({cart.items.length}) <IconCart className="ml-1 inline h-4 w-4 align-text-bottom text-emerald-400" />
            </CardTitle>
            {cart.items.length > 0 && (
              <Button size="sm" variant="ghost" onClick={cart.clear}>
                Clear
              </Button>
            )}
          </CardHeader>
          <CardBody>
            {cart.items.length === 0 ? (
              <p className="py-4 text-center text-sm text-slate-500">No tickets selected yet.</p>
            ) : (
              <div className="mb-4 max-h-48 space-y-1.5 overflow-y-auto">
                {cart.items.map((t) => (
                  <div key={t.id} className="flex items-center justify-between rounded-lg bg-white/[0.03] px-2.5 py-1.5">
                    <span className="font-mono text-xs text-slate-200">{t.ticketNumber}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400">{formatCurrency(t.price)}</span>
                      <button onClick={() => cart.remove(t.id)} className="text-slate-500 hover:text-red-400">
                        <IconX className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-1 border-t border-white/8 pt-3 text-sm">
              <div className="flex justify-between text-slate-400">
                <span>Total SEM</span>
                <span>{formatCurrency(totalSem)}</span>
              </div>
              <div className="flex justify-between text-base font-semibold text-emerald-300">
                <span>Total Payable</span>
                <span>{formatCurrency(totalAmount)}</span>
              </div>
            </div>

            <div className="mt-4 border-t border-white/8 pt-4">
              <FormField label="Customer Mobile" required hint="That's all we need — the receipt and WhatsApp confirmation use this number.">
                <Input required value={customer.mobile} onChange={(e) => setCustomer({ ...customer, mobile: e.target.value })} placeholder="10-digit mobile" />
              </FormField>
            </div>

            <div className="mt-4 flex items-center justify-between rounded-lg border border-white/8 bg-white/[0.02] px-3 py-2.5 text-sm">
              <span className="flex items-center gap-1.5 text-slate-400">
                <IconWallet className="h-3.5 w-3.5" /> Wallet Balance
              </span>
              <span className={cn('font-semibold', insufficientBalance ? 'text-red-300' : 'text-emerald-300')}>{formatCurrency(walletBalance)}</span>
            </div>

            {insufficientBalance && (
              <p className="mt-3 rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-2 text-xs text-red-300">
                Not enough wallet balance to cover this cart.{' '}
                <Link to="/agent/wallet" className="font-semibold underline underline-offset-2">
                  Add money to your wallet
                </Link>{' '}
                to continue.
              </p>
            )}

            {error && <p className="mt-3 rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-2 text-xs text-red-300">{error}</p>}

            <Button
              accent="emerald"
              className="mt-4 w-full"
              disabled={cart.items.length === 0 || !customer.mobile.trim() || insufficientBalance}
              loading={saleMut.isPending}
              onClick={() => saleMut.mutate()}
            >
              Buy Tickets — Pay from Wallet
            </Button>
          </CardBody>
        </Card>
      </div>

      {saleResult && <ReceiptModal sale={saleResult} onClose={() => setSaleResult(null)} />}
    </div>
  );
}
