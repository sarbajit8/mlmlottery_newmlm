import { Prisma, type TicketStatus } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { businessNow, startOfBusinessDay, startOfBusinessMonth } from '../../lib/datetime.js';

const SOLD_STATUSES: TicketStatus[] = ['SOLD', 'WINNER'];

function dec(v: Prisma.Decimal | null | undefined): Prisma.Decimal {
  return v ?? new Prisma.Decimal(0);
}

/** Ids that are not real agent payouts — the company wallet / super admin (they receive the
 *  rolled-up shortfall commission, which shouldn't count as "commission paid out"). */
async function houseAgentIds(): Promise<number[]> {
  const rows = await prisma.user.findMany({
    where: { OR: [{ isCompanyWallet: true }, { role: 'SUPER_ADMIN' }] },
    select: { id: true },
  });
  return rows.map((r) => r.id);
}

export async function getAdminDashboard() {
  const today = startOfBusinessDay();
  const house = await houseAgentIds();
  const paidToAgents: Prisma.CommissionLedgerWhereInput = { status: 'PAID', earningAgentId: { notIn: house } };

  const [
    todayAgg,
    allTimeAgg,
    activeAgents,
    commissionToday,
    commissionTotal,
    pendingWithdrawals,
    last7Days,
  ] = await Promise.all([
    prisma.ticket.aggregate({ where: { status: { in: SOLD_STATUSES }, soldAt: { gte: today } }, _count: true, _sum: { price: true } }),
    prisma.ticket.aggregate({ where: { status: { in: SOLD_STATUSES } }, _count: true, _sum: { price: true } }),
    prisma.user.count({ where: { role: { not: 'SUPER_ADMIN' }, status: 'ACTIVE' } }),
    prisma.commissionLedger.aggregate({ where: { ...paidToAgents, paidAt: { gte: today } }, _sum: { commissionAmount: true } }),
    prisma.commissionLedger.aggregate({ where: paidToAgents, _sum: { commissionAmount: true } }),
    prisma.withdrawalRequest.count({ where: { status: 'PENDING' } }),
    getTrend(7),
  ]);

  return {
    ticketsSoldToday: todayAgg._count,
    revenueToday: dec(todayAgg._sum?.price),
    ticketsSoldTotal: allTimeAgg._count,
    revenueTotal: dec(allTimeAgg._sum?.price),
    activeAgents,
    commissionPaidToday: dec(commissionToday._sum.commissionAmount),
    commissionPaidTotal: dec(commissionTotal._sum.commissionAmount),
    pendingWithdrawals,
    trend: last7Days,
  };
}

async function getTrend(days: number) {
  const todayStart = startOfBusinessDay();
  const results: { date: string; tickets: number; revenue: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const dayStart = new Date(todayStart.getTime() - i * 86_400_000);
    const dayEnd = new Date(dayStart.getTime() + 86_400_000);

    const agg = await prisma.ticket.aggregate({
      where: { status: { in: SOLD_STATUSES }, soldAt: { gte: dayStart, lt: dayEnd } },
      _count: true,
      _sum: { price: true },
    });
    const label = businessNow(new Date(dayStart.getTime() + 3_600_000)).date; // 1am inside that business day
    results.push({ date: label, tickets: agg._count, revenue: dec(agg._sum?.price).toNumber() });
  }
  return results;
}

export async function getAgentDashboard(userId: number) {
  const today = startOfBusinessDay();
  const month = startOfBusinessMonth();

  const [todayAgg, monthAgg, todayCommission, teamSalesAgg, directCount] = await Promise.all([
    prisma.ticket.aggregate({
      where: { soldByAgentId: userId, status: { in: SOLD_STATUSES }, soldAt: { gte: today } },
      _count: true,
      _sum: { semValue: true },
    }),
    prisma.ticket.aggregate({
      where: { soldByAgentId: userId, status: { in: SOLD_STATUSES }, soldAt: { gte: month } },
      _count: true,
      _sum: { semValue: true },
    }),
    prisma.commissionLedger.aggregate({
      where: { earningAgentId: userId, createdAt: { gte: today } },
      _sum: { commissionAmount: true },
    }),
    prisma.commissionLedger.aggregate({ where: { earningAgentId: userId }, _sum: { semValue: true } }),
    prisma.user.count({ where: { sponsorId: userId } }),
  ]);

  return {
    todaySemValue: dec(todayAgg._sum?.semValue),
    todayTicketCount: todayAgg._count,
    monthlySemValue: dec(monthAgg._sum?.semValue),
    monthlyTicketCount: monthAgg._count,
    todayCommission: dec(todayCommission._sum.commissionAmount),
    teamSales: dec(teamSalesAgg._sum.semValue),
    directReferrals: directCount,
  };
}
