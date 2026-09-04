import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';

export interface LedgerQuery {
  from?: Date;
  to?: Date;
  level?: number;
  agentId?: number;
  page: number;
  pageSize: number;
}

export async function listLedger(query: LedgerQuery, scopedAgentId?: number) {
  const where: Prisma.CommissionLedgerWhereInput = {
    earningAgentId: scopedAgentId ?? query.agentId,
    levelNumber: query.level,
    createdAt: query.from || query.to ? { gte: query.from, lte: query.to } : undefined,
  };

  const [items, total] = await Promise.all([
    prisma.commissionLedger.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      include: {
        sourceAgent: { select: { id: true, name: true } },
        ticket: { select: { ticketNumber: true } },
        receipt: { select: { receiptCode: true } },
      },
    }),
    prisma.commissionLedger.count({ where }),
  ]);

  return { items, total, page: query.page, pageSize: query.pageSize };
}

export interface ReportQuery {
  from?: Date;
  to?: Date;
}

export async function getPayoutReport(query: ReportQuery) {
  const where: Prisma.CommissionLedgerWhereInput = {
    createdAt: query.from || query.to ? { gte: query.from, lte: query.to } : undefined,
  };

  const [byLevel, byAgentRaw, totals] = await Promise.all([
    prisma.commissionLedger.groupBy({ by: ['levelNumber'], where, _sum: { commissionAmount: true }, _count: true, orderBy: { levelNumber: 'asc' } }),
    prisma.commissionLedger.groupBy({
      by: ['earningAgentId'],
      where,
      _sum: { commissionAmount: true },
      _count: true,
      orderBy: { _sum: { commissionAmount: 'desc' } },
      take: 50,
    }),
    prisma.commissionLedger.aggregate({ where, _sum: { commissionAmount: true }, _count: true }),
  ]);

  const agentIds = byAgentRaw.map((r) => r.earningAgentId);
  const agents = agentIds.length ? await prisma.user.findMany({ where: { id: { in: agentIds } }, select: { id: true, name: true, role: true } }) : [];
  const agentMap = new Map(agents.map((a) => [a.id, a]));

  return {
    totalCommission: totals._sum.commissionAmount ?? new Prisma.Decimal(0),
    totalEntries: totals._count,
    byLevel: byLevel.map((r) => ({ level: r.levelNumber, totalCommission: r._sum.commissionAmount ?? new Prisma.Decimal(0), entries: r._count })),
    byAgent: byAgentRaw.map((r) => ({
      agent: agentMap.get(r.earningAgentId),
      totalCommission: r._sum.commissionAmount ?? new Prisma.Decimal(0),
      entries: r._count,
    })),
  };
}

export interface LeaderboardQuery {
  type: 'personal' | 'team';
  from?: Date;
  to?: Date;
  limit: number;
}

export async function getLeaderboard(query: LeaderboardQuery) {
  if (query.type === 'personal') {
    const rows = await prisma.ticket.groupBy({
      by: ['soldByAgentId'],
      where: {
        status: { in: ['SOLD', 'WINNER'] },
        soldByAgentId: { not: null },
        soldAt: query.from || query.to ? { gte: query.from, lte: query.to } : undefined,
      },
      _sum: { semValue: true },
      _count: true,
      orderBy: { _sum: { semValue: 'desc' } },
      take: query.limit,
    });
    const agentIds = rows.map((r) => r.soldByAgentId!).filter(Boolean);
    const agents = await prisma.user.findMany({ where: { id: { in: agentIds } }, select: { id: true, name: true, role: true } });
    const agentMap = new Map(agents.map((a) => [a.id, a]));
    return rows.map((r) => ({ agent: agentMap.get(r.soldByAgentId!), totalSemValue: r._sum.semValue ?? new Prisma.Decimal(0), ticketCount: r._count }));
  }

  // "team" sales: sum of semValue across every ledger row an agent earns on — since the sponsor
  // chain visits each ancestor at most once per ticket, this equals total SEM sold anywhere in
  // their downline within the configured commission depth.
  const rows = await prisma.commissionLedger.groupBy({
    by: ['earningAgentId'],
    where: { createdAt: query.from || query.to ? { gte: query.from, lte: query.to } : undefined },
    _sum: { semValue: true },
    orderBy: { _sum: { semValue: 'desc' } },
    take: query.limit,
  });
  const agentIds = rows.map((r) => r.earningAgentId);
  const agents = await prisma.user.findMany({ where: { id: { in: agentIds } }, select: { id: true, name: true, role: true } });
  const agentMap = new Map(agents.map((a) => [a.id, a]));
  return rows.map((r) => ({ agent: agentMap.get(r.earningAgentId), teamSemValue: r._sum.semValue ?? new Prisma.Decimal(0) }));
}
