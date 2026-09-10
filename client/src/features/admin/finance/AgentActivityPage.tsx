import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { salesApi } from '@/api/sales';
import { usersApi } from '@/api/users';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { StatCard } from '@/components/ui/StatCard';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { formatCurrency, formatDate, formatDateTime, formatNumber } from '@/utils/format';
import { IconTicket, IconWallet, IconTrophy } from '@/components/ui/icons';
import type { SalesReportRow } from '@/types/api';

export function AgentActivityPage() {
  const [agentId, setAgentId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 100;

  const { data: agents } = useQuery({ queryKey: ['users-agents-report'], queryFn: () => usersApi.list({ role: 'AGENT', pageSize: 200 }) });
  const { data, isLoading } = useQuery({
    queryKey: ['sales-report', agentId, from, to, page],
    queryFn: () =>
      salesApi.report({
        agentId: agentId ? Number(agentId) : undefined,
        from: from || undefined,
        to: to || undefined,
        page,
        pageSize,
      }),
  });

  // Group the page's rows by draw day, newest first, with a per-day subtotal.
  const groups = useMemo(() => {
    const map = new Map<string, SalesReportRow[]>();
    for (const r of data?.items ?? []) {
      const day = r.drawDate.slice(0, 10);
      const arr = map.get(day);
      if (arr) arr.push(r);
      else map.set(day, [r]);
    }
    return [...map.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [data]);

  const s = data?.summary;
  const totalPages = data ? Math.ceil(data.total / pageSize) : 1;

  function reset() {
    setAgentId('');
    setFrom('');
    setTo('');
    setPage(1);
  }

  return (
    <div>
      <PageHeader
        title="Agent Sales & Commission"
        description="Day-by-day, agent-by-agent: which tickets each agent sold, what the customer paid, and the commission that sale generated."
      />

      <Card className="mb-6">
        <div className="flex flex-wrap items-end gap-3 p-4">
          <label className="text-xs text-slate-400">
            Agent
            <Select value={agentId} onChange={(e) => { setAgentId(e.target.value); setPage(1); }} className="mt-1 block max-w-56">
              <option value="">All agents</option>
              {agents?.items.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} — {a.referralCode}
                </option>
              ))}
            </Select>
          </label>
          <label className="text-xs text-slate-400">
            From
            <Input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} className="mt-1 block max-w-40" />
          </label>
          <label className="text-xs text-slate-400">
            To
            <Input type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} className="mt-1 block max-w-40" />
          </label>
          {(agentId || from || to) && (
            <Button size="sm" variant="ghost" onClick={reset}>
              Clear
            </Button>
          )}
        </div>
      </Card>

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Sales" value={formatNumber(s?.sales ?? 0)} icon={<IconTicket className="h-5 w-5" />} accent="amber" />
        <StatCard label="Tickets Sold" value={formatNumber(s?.tickets ?? 0)} icon={<IconTicket className="h-5 w-5" />} accent="sky" />
        <StatCard label="Amount Collected" value={formatCurrency(s?.amount ?? 0)} icon={<IconWallet className="h-5 w-5" />} accent="emerald" />
        <StatCard label="Commission Generated" value={formatCurrency(s?.commission ?? 0)} icon={<IconTrophy className="h-5 w-5" />} accent="violet" />
      </div>

      {isLoading ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : groups.length === 0 ? (
        <Card className="p-8 text-center text-sm text-slate-500">No sales match these filters.</Card>
      ) : (
        <div className="space-y-6">
          {groups.map(([day, rows]) => {
            const dayAmount = rows.reduce((n, r) => n + Number(r.totalAmount), 0);
            const dayTickets = rows.reduce((n, r) => n + r.ticketCount, 0);
            const dayComm = rows.reduce((n, r) => n + Number(r.commissionTotal), 0);
            return (
              <Card key={day}>
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/8 px-5 py-3">
                  <h3 className="text-sm font-semibold text-slate-100">{formatDate(day)}</h3>
                  <p className="text-xs text-slate-400">
                    {rows.length} sale(s) · {formatNumber(dayTickets)} tickets ·{' '}
                    <span className="text-emerald-300">{formatCurrency(dayAmount)}</span> ·{' '}
                    commission <span className="text-violet-300">{formatCurrency(dayComm)}</span>
                  </p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[52rem] text-sm">
                    <thead>
                      <tr className="text-left text-xs text-slate-500">
                        <th className="px-5 py-2 font-medium">Time</th>
                        <th className="py-2 pr-4 font-medium">Agent</th>
                        <th className="py-2 pr-4 font-medium">Customer</th>
                        <th className="py-2 pr-4 font-medium">Slot</th>
                        <th className="py-2 pr-4 font-medium">Tickets</th>
                        <th className="py-2 pr-4 font-medium">Amount</th>
                        <th className="py-2 pr-5 font-medium">Commission</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r) => (
                        <tr key={r.id} className="border-t border-white/8 align-top">
                          <td className="px-5 py-2.5 text-xs text-slate-400">{formatDateTime(r.soldAt).split(', ')[1] ?? formatDateTime(r.soldAt)}</td>
                          <td className="py-2.5 pr-4">
                            <span className="font-medium text-slate-100">{r.agent.name}</span>
                            <span className="ml-1 font-mono text-[10px] text-slate-500">{r.agent.referralCode}</span>
                          </td>
                          <td className="py-2.5 pr-4 text-slate-300">
                            {r.customer.name}
                            <span className="block text-[10px] text-slate-500">{r.customer.mobile}</span>
                          </td>
                          <td className="py-2.5 pr-4 text-slate-400">{r.slot}</td>
                          <td className="py-2.5 pr-4">
                            <span className="font-mono text-[11px] text-slate-300">{r.ticketNumbers.join(', ')}</span>
                            <span className="block text-[10px] text-slate-500">{r.ticketCount} · {r.seriesSummary}</span>
                          </td>
                          <td className="py-2.5 pr-4 font-semibold text-emerald-300">{formatCurrency(r.totalAmount)}</td>
                          <td className="py-2.5 pr-5">
                            <span className="font-semibold text-violet-300">{formatCurrency(r.commissionTotal)}</span>
                            <span className="block text-[10px] text-slate-500">
                              agent {formatCurrency(r.sellerCommission)} · upline {formatCurrency(r.uplineCommission)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-3 text-sm">
          <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Previous
          </Button>
          <span className="text-slate-400">Page {page} of {totalPages}</span>
          <Button size="sm" variant="secondary" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
