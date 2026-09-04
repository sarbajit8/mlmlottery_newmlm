import { Prisma, type PrizeTier } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { ApiError } from '../../lib/apiError.js';
import { logActivity } from '../../middleware/auditLog.js';
import { round2 } from '../../lib/money.js';
import { ticketNumberSuffix } from '../../lib/ticketNumber.js';

export interface DeclareResultInput {
  drawName: string;
  drawNumber: string;
  drawSlotId: number;
  drawDate: Date;
  firstPrizeTicketNumber: string;
  firstPrizeAmount: number;
  secondPrizeAmount: number;
  secondPrizeNumbers: string[];
  thirdPrizeAmount: number;
  thirdPrizeNumbers: string[];
  fourthPrizeAmount: number;
  fourthPrizeNumbers: string[];
  fifthPrizeAmount: number;
  fifthPrizePercentage: number;
  fifthPrizeNumbers: string[];
}

interface WinnerRow {
  ticketId: number;
  tier: PrizeTier;
  amount: Prisma.Decimal;
  agentId: number | null;
}

const resultDetailInclude = {
  drawSlot: true,
  firstPrizeTicket: true,
  declaredBy: { select: { id: true, name: true } },
  winners: {
    include: {
      ticket: {
        include: {
          series: { select: { id: true, name: true } },
          soldByAgent: { select: { id: true, name: true } },
          soldToCustomer: true,
        },
      },
    },
  },
} satisfies Prisma.DrawResultInclude;

async function resolveFirstPrizeTicket(tx: Prisma.TransactionClient, ticketNumber: string, drawSlotId: number, drawDate: Date) {
  // Ticket numbers are unique per draw date, not globally (the same prefix/number can recur on a
  // different day) — so the lookup itself must include drawDate, via the compound unique index.
  const ticket = await tx.ticket.findUnique({ where: { ticketNumber_drawDate: { ticketNumber, drawDate } } });
  if (!ticket) throw ApiError.badRequest('First prize ticket number does not exist for the selected draw date');
  if (ticket.drawSlotId !== drawSlotId) {
    throw ApiError.badRequest('First prize ticket does not belong to the selected draw slot');
  }
  if (ticket.status !== 'SOLD') {
    throw ApiError.badRequest('First prize ticket must be a currently sold ticket');
  }
  return ticket;
}

/** Walks every SOLD ticket in the slot/date once, matching it against the prize number patterns in
 *  priority order (1st > 2nd > 3rd > 4th > 5th) so a ticket can win at most one tier per draw. */
async function computeWinners(
  tx: Prisma.TransactionClient,
  params: {
    drawSlotId: number;
    drawDate: Date;
    firstPrizeTicketId: number;
    firstPrizeTicketAgentId: number | null;
    firstPrizeAmount: number;
    secondPrizeAmount: number;
    secondPrizeNumbers: string[];
    thirdPrizeAmount: number;
    thirdPrizeNumbers: string[];
    fourthPrizeAmount: number;
    fourthPrizeNumbers: string[];
    fifthPrizeAmount: number;
    fifthPrizeNumbers: string[];
  },
): Promise<WinnerRow[]> {
  const soldTickets = await tx.ticket.findMany({
    where: { drawSlotId: params.drawSlotId, drawDate: params.drawDate, status: 'SOLD' },
    select: { id: true, ticketNumber: true, soldByAgentId: true },
  });

  const secondSet = new Set(params.secondPrizeNumbers);
  const thirdSet = new Set(params.thirdPrizeNumbers);
  const fourthSet = new Set(params.fourthPrizeNumbers);
  const fifthSet = new Set(params.fifthPrizeNumbers);

  const winners: WinnerRow[] = [
    { ticketId: params.firstPrizeTicketId, tier: 'FIRST', amount: round2(params.firstPrizeAmount), agentId: params.firstPrizeTicketAgentId },
  ];
  const assigned = new Set<number>([params.firstPrizeTicketId]);

  for (const ticket of soldTickets) {
    if (assigned.has(ticket.id)) continue;

    const suffix5 = ticketNumberSuffix(ticket.ticketNumber, 5);
    if (secondSet.has(suffix5)) {
      winners.push({ ticketId: ticket.id, tier: 'SECOND', amount: round2(params.secondPrizeAmount), agentId: ticket.soldByAgentId });
      assigned.add(ticket.id);
      continue;
    }

    const suffix4 = ticketNumberSuffix(ticket.ticketNumber, 4);
    if (thirdSet.has(suffix4)) {
      winners.push({ ticketId: ticket.id, tier: 'THIRD', amount: round2(params.thirdPrizeAmount), agentId: ticket.soldByAgentId });
      assigned.add(ticket.id);
    } else if (fourthSet.has(suffix4)) {
      winners.push({ ticketId: ticket.id, tier: 'FOURTH', amount: round2(params.fourthPrizeAmount), agentId: ticket.soldByAgentId });
      assigned.add(ticket.id);
    } else if (fifthSet.has(suffix4)) {
      winners.push({ ticketId: ticket.id, tier: 'FIFTH', amount: round2(params.fifthPrizeAmount), agentId: ticket.soldByAgentId });
      assigned.add(ticket.id);
    }
  }

  return winners;
}

/** Credits each winning ticket's selling agent with its prize amount — one wallet update and
 *  ledger row per agent (aggregated across all of that agent's winning tickets in this result),
 *  not one per ticket. */
async function creditWinnerWallets(tx: Prisma.TransactionClient, drawResultId: number, winners: WinnerRow[]) {
  const totalsByAgent = new Map<number, Prisma.Decimal>();
  for (const w of winners) {
    if (!w.agentId) continue;
    totalsByAgent.set(w.agentId, (totalsByAgent.get(w.agentId) ?? new Prisma.Decimal(0)).plus(w.amount));
  }
  for (const [agentId, amount] of totalsByAgent) {
    const updated = await tx.user.update({ where: { id: agentId }, data: { walletBalance: { increment: amount } } });
    await tx.walletTransaction.create({
      data: { userId: agentId, type: 'PRIZE', amount, balanceAfter: updated.walletBalance, refId: `WIN-${drawResultId}`, status: 'COMPLETED' },
    });
  }
}

/** Undoes a previous creditWinnerWallets — used before recomputing an edited result, and when a
 *  result is deleted, so a corrected/removed declaration doesn't leave stale prize money credited. */
async function reverseWinnerWallets(
  tx: Prisma.TransactionClient,
  drawResultId: number,
  existingWinners: { prizeAmount: Prisma.Decimal; ticket: { soldByAgentId: number | null } }[],
) {
  const totalsByAgent = new Map<number, Prisma.Decimal>();
  for (const w of existingWinners) {
    if (!w.ticket.soldByAgentId) continue;
    totalsByAgent.set(w.ticket.soldByAgentId, (totalsByAgent.get(w.ticket.soldByAgentId) ?? new Prisma.Decimal(0)).plus(w.prizeAmount));
  }
  for (const [agentId, amount] of totalsByAgent) {
    const updated = await tx.user.update({ where: { id: agentId }, data: { walletBalance: { decrement: amount } } });
    await tx.walletTransaction.create({
      data: { userId: agentId, type: 'PRIZE', amount: amount.negated(), balanceAfter: updated.walletBalance, refId: `WIN-${drawResultId}-REVERSED`, status: 'REVERSED' },
    });
  }
}

async function saveWinners(tx: Prisma.TransactionClient, drawResultId: number, winners: WinnerRow[]) {
  await tx.drawResultWinner.createMany({
    data: winners.map((w) => ({ drawResultId, ticketId: w.ticketId, prizeTier: w.tier, prizeAmount: w.amount })),
  });
  await tx.ticket.updateMany({ where: { id: { in: winners.map((w) => w.ticketId) } }, data: { status: 'WINNER' } });
  await creditWinnerWallets(tx, drawResultId, winners);
}

export async function declareResult(input: DeclareResultInput, actorId: number) {
  const resultId = await prisma.$transaction(
    async (tx) => {
      // resolveFirstPrizeTicket already requires status SOLD, and a ticket flips to WINNER the
      // moment it's used as a first prize — so reuse is already impossible in the normal sequential
      // case. The `firstPrizeTicketId` unique index (+ the global P2002 handler) covers the narrow
      // concurrent-race case where two declares pick the same ticket before either commits.
      const firstTicket = await resolveFirstPrizeTicket(tx, input.firstPrizeTicketNumber, input.drawSlotId, input.drawDate);

      const drawResult = await tx.drawResult.create({
        data: {
          drawName: input.drawName,
          drawNumber: input.drawNumber,
          drawSlotId: input.drawSlotId,
          drawDate: input.drawDate,
          firstPrizeTicketId: firstTicket.id,
          firstPrizeAmount: round2(input.firstPrizeAmount),
          secondPrizeAmount: round2(input.secondPrizeAmount),
          secondPrizeNumbers: input.secondPrizeNumbers,
          thirdPrizeAmount: round2(input.thirdPrizeAmount),
          thirdPrizeNumbers: input.thirdPrizeNumbers,
          fourthPrizeAmount: round2(input.fourthPrizeAmount),
          fourthPrizeNumbers: input.fourthPrizeNumbers,
          fifthPrizeAmount: round2(input.fifthPrizeAmount),
          fifthPrizePercentage: input.fifthPrizePercentage,
          fifthPrizeNumbers: input.fifthPrizeNumbers,
          declaredById: actorId,
        },
      });

      const winners = await computeWinners(tx, { ...input, firstPrizeTicketId: firstTicket.id, firstPrizeTicketAgentId: firstTicket.soldByAgentId });
      await saveWinners(tx, drawResult.id, winners);

      await logActivity(tx, {
        actorId,
        action: 'RESULT_DECLARE',
        entityType: 'DrawResult',
        entityId: drawResult.id,
        metadata: { drawName: input.drawName, totalWinners: winners.length },
      });

      return drawResult.id;
    },
    { timeout: 20000 },
  );

  return getResult(resultId);
}

export async function updateResult(id: number, input: DeclareResultInput, actorId: number) {
  const resultId = await prisma.$transaction(
    async (tx) => {
      const existing = await tx.drawResult.findUnique({
        where: { id },
        include: { winners: { include: { ticket: { select: { soldByAgentId: true } } } } },
      });
      if (!existing) throw ApiError.notFound('Result not found');

      // Revert the previous declaration's winners — including the prize money already credited to
      // sellers' wallets — before recomputing from the new inputs.
      await tx.ticket.updateMany({ where: { id: { in: existing.winners.map((w) => w.ticketId) } }, data: { status: 'SOLD' } });
      await reverseWinnerWallets(tx, id, existing.winners);
      await tx.drawResultWinner.deleteMany({ where: { drawResultId: id } });

      // Same reasoning as declareResult: any ticket currently in use as another result's first
      // prize is already WINNER status, so resolveFirstPrizeTicket's SOLD requirement rejects it.
      const firstTicket = await resolveFirstPrizeTicket(tx, input.firstPrizeTicketNumber, input.drawSlotId, input.drawDate);

      const updated = await tx.drawResult.update({
        where: { id },
        data: {
          drawName: input.drawName,
          drawNumber: input.drawNumber,
          drawSlotId: input.drawSlotId,
          drawDate: input.drawDate,
          firstPrizeTicketId: firstTicket.id,
          firstPrizeAmount: round2(input.firstPrizeAmount),
          secondPrizeAmount: round2(input.secondPrizeAmount),
          secondPrizeNumbers: input.secondPrizeNumbers,
          thirdPrizeAmount: round2(input.thirdPrizeAmount),
          thirdPrizeNumbers: input.thirdPrizeNumbers,
          fourthPrizeAmount: round2(input.fourthPrizeAmount),
          fourthPrizeNumbers: input.fourthPrizeNumbers,
          fifthPrizeAmount: round2(input.fifthPrizeAmount),
          fifthPrizePercentage: input.fifthPrizePercentage,
          fifthPrizeNumbers: input.fifthPrizeNumbers,
        },
      });

      const winners = await computeWinners(tx, { ...input, firstPrizeTicketId: firstTicket.id, firstPrizeTicketAgentId: firstTicket.soldByAgentId });
      await saveWinners(tx, updated.id, winners);

      await logActivity(tx, {
        actorId,
        action: 'RESULT_UPDATE',
        entityType: 'DrawResult',
        entityId: updated.id,
        metadata: { totalWinners: winners.length },
      });

      return updated.id;
    },
    { timeout: 20000 },
  );

  return getResult(resultId);
}

export async function deleteResult(id: number, actorId: number) {
  await prisma.$transaction(async (tx) => {
    const existing = await tx.drawResult.findUnique({
      where: { id },
      include: { winners: { include: { ticket: { select: { soldByAgentId: true } } } } },
    });
    if (!existing) throw ApiError.notFound('Result not found');

    await tx.ticket.updateMany({ where: { id: { in: existing.winners.map((w) => w.ticketId) } }, data: { status: 'SOLD' } });
    await reverseWinnerWallets(tx, id, existing.winners);
    await tx.drawResultWinner.deleteMany({ where: { drawResultId: id } });
    await tx.drawResult.delete({ where: { id } });

    await logActivity(tx, { actorId, action: 'RESULT_DELETE', entityType: 'DrawResult', entityId: id });
  });
}

export async function getResult(id: number) {
  const result = await prisma.drawResult.findUnique({ where: { id }, include: resultDetailInclude });
  if (!result) throw ApiError.notFound('Result not found');
  return result;
}

function countByTier(winners: { prizeTier: PrizeTier }[]) {
  const counts: Record<PrizeTier, number> = { FIRST: 0, SECOND: 0, THIRD: 0, FOURTH: 0, FIFTH: 0 };
  for (const w of winners) counts[w.prizeTier] += 1;
  return counts;
}

export interface ListResultsQuery {
  drawDate?: Date;
  drawSlotId?: number;
  page: number;
  pageSize: number;
}

export async function listResults(query: ListResultsQuery) {
  const where: Prisma.DrawResultWhereInput = { drawDate: query.drawDate, drawSlotId: query.drawSlotId };

  const [items, total] = await Promise.all([
    prisma.drawResult.findMany({
      where,
      orderBy: { declaredAt: 'desc' },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      include: { drawSlot: true, firstPrizeTicket: { select: { ticketNumber: true } }, winners: { select: { prizeTier: true } } },
    }),
    prisma.drawResult.count({ where }),
  ]);

  return {
    items: items.map(({ winners, ...r }) => ({ ...r, totalWinners: winners.length, winnerCounts: countByTier(winners) })),
    total,
    page: query.page,
    pageSize: query.pageSize,
  };
}

export async function getRandomTicket(drawSlotId: number, drawDate: Date) {
  const used = await prisma.drawResult.findMany({ where: { drawSlotId, drawDate }, select: { firstPrizeTicketId: true } });
  const excludeIds = used.map((r) => r.firstPrizeTicketId);

  const candidates = await prisma.ticket.findMany({
    where: { drawSlotId, drawDate, status: 'SOLD', id: excludeIds.length ? { notIn: excludeIds } : undefined },
    select: { id: true, ticketNumber: true },
  });
  if (candidates.length === 0) throw ApiError.badRequest('No eligible sold tickets to pick a first prize winner from');

  const pick = candidates[Math.floor(Math.random() * candidates.length)];
  return { ticketNumber: pick.ticketNumber };
}

export interface ListWinnersQuery {
  drawDate?: Date;
  drawSlotId?: number;
  page: number;
  pageSize: number;
}

export async function listWinners(query: ListWinnersQuery, scopedAgentId?: number) {
  const where: Prisma.DrawResultWinnerWhereInput = {
    ticket: { drawDate: query.drawDate, drawSlotId: query.drawSlotId, soldByAgentId: scopedAgentId },
  };

  const [items, total] = await Promise.all([
    prisma.drawResultWinner.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      include: {
        ticket: { include: { series: { select: { id: true, name: true } }, soldByAgent: { select: { id: true, name: true } }, soldToCustomer: true } },
        drawResult: { include: { drawSlot: true } },
      },
    }),
    prisma.drawResultWinner.count({ where }),
  ]);

  return { items, total, page: query.page, pageSize: query.pageSize };
}
