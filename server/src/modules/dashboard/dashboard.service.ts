import { Prisma, type TicketStatus } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';

const SOLD_STATUSES: TicketStatus[] = ['SOLD', 'WINNER'];

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfMonth(): Date {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

function dec(v: Prisma.Decimal | null | undefined): Prisma.Decimal {
  return v ?? new Prisma.Decimal(0);
}

export async function getAdminDashboard() {
  const today = startOfToday();

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
    prisma.commissionLedger.aggregate({ where: { status: 'PAID', paidAt: { gte: today } }, _sum: { commissionAmount: true } }),
    prisma.commissionLedger.aggregate({ where: { status: 'PAID' }, _sum: { commissionAmount: true } }),
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
  const results: { date: string; tickets: number; revenue: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);
    dayStart.setDate(dayStart.getDate() - i);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);

    const agg = await prisma.ticket.aggregate({
      where: { status: { in: SOLD_STATUSES }, soldAt: { gte: dayStart, lt: dayEnd } },
      _count: true,
      _sum: { price: true },
    });
    results.push({ date: dayStart.toISOString().slice(0, 10), tickets: agg._count, revenue: dec(agg._sum?.price).toNumber() });
  }
  return results;
}

export async function getAgentDashboard(userId: number) {
  const today = startOfToday();
  const month = startOfMonth();

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
