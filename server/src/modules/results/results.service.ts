import { Prisma, type PrizeTier } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { ApiError } from '../../lib/apiError.js';
import { logActivity } from '../../middleware/auditLog.js';
import { round2 } from '../../lib/money.js';
import { ticketNumberSuffix } from '../../lib/ticketNumber.js';
import { getDefaultPrizeAmounts } from '../system/system.service.js';
import { computePrizeWinCommissions } from '../mlm/commission.engine.js';

export interface DeclareResultInput {
  drawName: string;
  drawNumber: string;
  drawSlotId: number;
  drawDate: Date;
  firstPrizeTicketNumber: string;
  secondPrizeNumbers: string[];
  thirdPrizeNumbers: string[];
  fourthPrizeNumbers: string[];
  fifthPrizePercentage: number;
  fifthPrizeNumbers: string[];
}

/** The 1-SEM base amount for each prize tier — always sourced from the admin's Prize Settings page. */
interface PrizeBaseAmounts {
  firstPrizeAmount: number;
  secondPrizeAmount: number;
  thirdPrizeAmount: number;
  fourthPrizeAmount: number;
  fifthPrizeAmount: number;
}

interface WinnerRow {
  ticketId: number;
  tier: PrizeTier;
  /** The full prize the ticket won (tier base × series multiplier), before the MLM win-commission cut. */
  grossAmount: Prisma.Decimal;
  agentId: number | null;
  receiptId: number | null;
}

const resultDetailInclude = {
  drawSlot: true,
  firstPrizeTicket: true,
  declaredBy: { select: { id: true, name: true } },
  winners: {
    include: {
      ticket: {
        include: {
          series: { select: { id: true, name: true, multiplier: true } },
          soldByAgent: { select: { id: true, name: true } },
          soldToCustomer: true,
        },
      },
    },
  },
} satisfies Prisma.DrawResultInclude;

/** The 1st-prize number can be anything the admin types. It only pays out if it matches a
 *  currently-SOLD ticket for this slot/date; otherwise the number is recorded with no linked
 *  ticket (like a real lottery where the winning number simply went unsold). */
async function resolveFirstPrize(tx: Prisma.TransactionClient, rawNumber: string, drawSlotId: number, drawDate: Date) {
  const number = rawNumber.trim().toUpperCase();
  // Ticket numbers are unique per draw date, not globally (the same prefix/number can recur on a
  // different day) — so the lookup itself must include drawDate, via the compound unique index.
  const ticket = await tx.ticket.findUnique({ where: { ticketNumber_drawDate: { ticketNumber: number, drawDate } } });
  const payable = ticket && ticket.drawSlotId === drawSlotId && ticket.status === 'SOLD' ? ticket : null;
  return { number, ticket: payable };
}

/** Prize amounts on a DrawResult are stored as the 1-SEM base. Each winning ticket is actually
 *  paid base × its series multiplier — a 2-SEM ticket wins double, a 3-SEM ticket triple, etc.
 *  (mirrors ticket pricing, where price = multiplier × ticket base price). */
function scalePrize(baseAmount: number, seriesMultiplier: Prisma.Decimal) {
  return round2(new Prisma.Decimal(baseAmount).times(seriesMultiplier));
}

/** The 1-SEM base prize amounts every result uses, taken from the admin's Prize Settings page. */
async function resolvePrizeBase(): Promise<PrizeBaseAmounts> {
  const d = await getDefaultPrizeAmounts();
  return {
    firstPrizeAmount: d.firstPrizeAmount,
    secondPrizeAmount: d.secondPrizeAmount,
    thirdPrizeAmount: d.thirdPrizeAmount,
    fourthPrizeAmount: d.fourthPrizeAmount,
    fifthPrizeAmount: d.fifthPrizeAmount,
  };
}

/** Walks every SOLD ticket in the slot/date once, matching it against the prize number patterns in
 *  priority order (1st > 2nd > 3rd > 4th > 5th) so a ticket can win at most one tier per draw. */
async function computeWinners(
  tx: Prisma.TransactionClient,
  params: {
    drawSlotId: number;
    drawDate: Date;
    firstPrizeTicketId: number | null;
    firstPrizeTicketAgentId: number | null;
    firstPrizeTicketReceiptId: number | null;
    prizeBase: PrizeBaseAmounts;
    secondPrizeNumbers: string[];
    thirdPrizeNumbers: string[];
    fourthPrizeNumbers: string[];
    fifthPrizeNumbers: string[];
  },
): Promise<WinnerRow[]> {
  const { prizeBase } = params;
  const soldTickets = await tx.ticket.findMany({
    where: { drawSlotId: params.drawSlotId, drawDate: params.drawDate, status: 'SOLD' },
    select: { id: true, ticketNumber: true, soldByAgentId: true, receiptId: true, series: { select: { multiplier: true } } },
  });

  const secondSet = new Set(params.secondPrizeNumbers);
  const thirdSet = new Set(params.thirdPrizeNumbers);
  const fourthSet = new Set(params.fourthPrizeNumbers);
  const fifthSet = new Set(params.fifthPrizeNumbers);

  const winners: WinnerRow[] = [];
  const assigned = new Set<number>();

  // 1st prize only produces a winner (and a payout) when the entered number matched a sold ticket.
  if (params.firstPrizeTicketId !== null) {
    const firstPrizeSem = soldTickets.find((t) => t.id === params.firstPrizeTicketId)?.series.multiplier ?? new Prisma.Decimal(1);
    winners.push({
      ticketId: params.firstPrizeTicketId,
      tier: 'FIRST',
      grossAmount: scalePrize(prizeBase.firstPrizeAmount, firstPrizeSem),
      agentId: params.firstPrizeTicketAgentId,
      receiptId: params.firstPrizeTicketReceiptId,
    });
    assigned.add(params.firstPrizeTicketId);
  }

  for (const ticket of soldTickets) {
    if (assigned.has(ticket.id)) continue;
    const sem = ticket.series.multiplier;

    const suffix5 = ticketNumberSuffix(ticket.ticketNumber, 5);
    if (secondSet.has(suffix5)) {
      winners.push({ ticketId: ticket.id, tier: 'SECOND', grossAmount: scalePrize(prizeBase.secondPrizeAmount, sem), agentId: ticket.soldByAgentId, receiptId: ticket.receiptId });
      assigned.add(ticket.id);
      continue;
    }

    const suffix4 = ticketNumberSuffix(ticket.ticketNumber, 4);
    if (thirdSet.has(suffix4)) {
      winners.push({ ticketId: ticket.id, tier: 'THIRD', grossAmount: scalePrize(prizeBase.thirdPrizeAmount, sem), agentId: ticket.soldByAgentId, receiptId: ticket.receiptId });
      assigned.add(ticket.id);
    } else if (fourthSet.has(suffix4)) {
      winners.push({ ticketId: ticket.id, tier: 'FOURTH', grossAmount: scalePrize(prizeBase.fourthPrizeAmount, sem), agentId: ticket.soldByAgentId, receiptId: ticket.receiptId });
      assigned.add(ticket.id);
    } else if (fifthSet.has(suffix4)) {
      winners.push({ ticketId: ticket.id, tier: 'FIFTH', grossAmount: scalePrize(prizeBase.fifthPrizeAmount, sem), agentId: ticket.soldByAgentId, receiptId: ticket.receiptId });
      assigned.add(ticket.id);
    }
  }

  return winners;
}

/** Credits each winning ticket's selling agent with its NET prize (gross minus the win-commission
 *  cut paid up their chain) — one wallet update and ledger row per agent, aggregated across all of
 *  that agent's winning tickets in this result. */
async function creditWinnerWallets(
  tx: Prisma.TransactionClient,
  drawResultId: number,
  winners: WinnerRow[],
  netByTicket: Map<number, Prisma.Decimal>,
) {
  const totalsByAgent = new Map<number, Prisma.Decimal>();
  for (const w of winners) {
    if (!w.agentId) continue;
    const net = netByTicket.get(w.ticketId) ?? w.grossAmount;
    totalsByAgent.set(w.agentId, (totalsByAgent.get(w.agentId) ?? new Prisma.Decimal(0)).plus(net));
  }
  for (const [agentId, amount] of totalsByAgent) {
    if (amount.lessThanOrEqualTo(0)) continue;
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

/**
 * Records the winners of a declared result and distributes the prize pool for each winning ticket:
 *  - MLM "win" commission down the chain, level 1 = the selling agent, each level earning its
 *    tier-specific percentage of the gross prize (Prize Settings has a per-tier, per-level matrix);
 *  - the remainder (gross − the total of every level's cut) to the selling agent as their prize.
 * So the seller gets: the net prize PLUS their own level-1 win commission. The DrawResultWinner
 * row keeps both the gross and the net so the deduction is always visible.
 */
async function saveWinnersAndDistributePrizePool(tx: Prisma.TransactionClient, drawResultId: number, winners: WinnerRow[]) {
  const commissions = await computePrizeWinCommissions(tx, {
    drawResultId,
    winners: winners
      .filter((w) => w.receiptId !== null)
      .map((w) => ({ ticketId: w.ticketId, receiptId: w.receiptId as number, sellerAgentId: w.agentId, prizeAmount: w.grossAmount, tier: w.tier })),
  });

  // How much of each ticket's prize was allocated to its seller's upline as win commission.
  const cutByTicket = new Map<number, Prisma.Decimal>();
  for (const row of commissions.ledgerRows) {
    const amount = new Prisma.Decimal(row.commissionAmount as Prisma.Decimal.Value);
    cutByTicket.set(row.ticketId, (cutByTicket.get(row.ticketId) ?? new Prisma.Decimal(0)).plus(amount));
  }
  const netByTicket = new Map<number, Prisma.Decimal>();
  for (const w of winners) {
    const net = w.grossAmount.minus(cutByTicket.get(w.ticketId) ?? new Prisma.Decimal(0));
    netByTicket.set(w.ticketId, net.greaterThan(0) ? net : new Prisma.Decimal(0));
  }

  await tx.drawResultWinner.createMany({
    data: winners.map((w) => ({
      drawResultId,
      ticketId: w.ticketId,
      prizeTier: w.tier,
      grossPrizeAmount: w.grossAmount,
      prizeAmount: netByTicket.get(w.ticketId) ?? w.grossAmount,
    })),
  });
  await tx.ticket.updateMany({ where: { id: { in: winners.map((w) => w.ticketId) } }, data: { status: 'WINNER' } });

  await creditWinnerWallets(tx, drawResultId, winners, netByTicket);

  // Pay the win commission up the chains.
  if (commissions.ledgerRows.length > 0) {
    await tx.commissionLedger.createMany({ data: commissions.ledgerRows });
  }
  for (const [agentId, amount] of commissions.walletCredits) {
    const updated = await tx.user.update({ where: { id: agentId }, data: { walletBalance: { increment: amount } } });
    await tx.walletTransaction.create({
      data: { userId: agentId, type: 'COMMISSION', amount, balanceAfter: updated.walletBalance, refId: `WINCOMM-${drawResultId}`, status: 'COMPLETED' },
    });
  }
}

/** Undoes the win commission for a result before it's recomputed (edit) or removed (delete):
 *  decrements the wallets that were paid, writes a REVERSED wallet transaction, and drops the WIN
 *  ledger rows so the recompute starts clean. */
async function reversePrizeWinCommissions(tx: Prisma.TransactionClient, drawResultId: number) {
  const paidRows = await tx.commissionLedger.findMany({
    where: { drawResultId, kind: 'WIN', status: 'PAID' },
    select: { earningAgentId: true, commissionAmount: true },
  });

  const totalsByAgent = new Map<number, Prisma.Decimal>();
  for (const r of paidRows) {
    totalsByAgent.set(r.earningAgentId, (totalsByAgent.get(r.earningAgentId) ?? new Prisma.Decimal(0)).plus(r.commissionAmount));
  }
  for (const [agentId, amount] of totalsByAgent) {
    if (amount.lessThanOrEqualTo(0)) continue;
    const updated = await tx.user.update({ where: { id: agentId }, data: { walletBalance: { decrement: amount } } });
    await tx.walletTransaction.create({
      data: { userId: agentId, type: 'COMMISSION', amount: amount.negated(), balanceAfter: updated.walletBalance, refId: `WINCOMM-${drawResultId}-REVERSED`, status: 'REVERSED' },
    });
  }

  await tx.commissionLedger.deleteMany({ where: { drawResultId, kind: 'WIN' } });
}

export async function declareResult(input: DeclareResultInput, actorId: number) {
  const resultId = await prisma.$transaction(
    async (tx) => {
      // Any number is accepted for 1st prize; it only links to a ticket (and pays out) when it
      // matches a sold one. The `firstPrizeTicketId` unique index (+ the global P2002 handler)
      // still stops the same real ticket being used as 1st prize in two results.
      const first = await resolveFirstPrize(tx, input.firstPrizeTicketNumber, input.drawSlotId, input.drawDate);
      const prizeBase = await resolvePrizeBase();

      const drawResult = await tx.drawResult.create({
        data: {
          drawName: input.drawName,
          drawNumber: input.drawNumber,
          drawSlotId: input.drawSlotId,
          drawDate: input.drawDate,
          firstPrizeNumber: first.number,
          firstPrizeTicketId: first.ticket?.id ?? null,
          firstPrizeAmount: round2(prizeBase.firstPrizeAmount),
          secondPrizeAmount: round2(prizeBase.secondPrizeAmount),
          secondPrizeNumbers: input.secondPrizeNumbers,
          thirdPrizeAmount: round2(prizeBase.thirdPrizeAmount),
          thirdPrizeNumbers: input.thirdPrizeNumbers,
          fourthPrizeAmount: round2(prizeBase.fourthPrizeAmount),
          fourthPrizeNumbers: input.fourthPrizeNumbers,
          fifthPrizeAmount: round2(prizeBase.fifthPrizeAmount),
          fifthPrizePercentage: input.fifthPrizePercentage,
          fifthPrizeNumbers: input.fifthPrizeNumbers,
          declaredById: actorId,
        },
      });

      const winners = await computeWinners(tx, {
        drawSlotId: input.drawSlotId,
        drawDate: input.drawDate,
        firstPrizeTicketId: first.ticket?.id ?? null,
        firstPrizeTicketAgentId: first.ticket?.soldByAgentId ?? null,
        firstPrizeTicketReceiptId: first.ticket?.receiptId ?? null,
        prizeBase,
        secondPrizeNumbers: input.secondPrizeNumbers,
        thirdPrizeNumbers: input.thirdPrizeNumbers,
        fourthPrizeNumbers: input.fourthPrizeNumbers,
        fifthPrizeNumbers: input.fifthPrizeNumbers,
      });
      await saveWinnersAndDistributePrizePool(tx, drawResult.id, winners);

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

      // Revert the previous declaration's winners — the prize money credited to sellers' wallets
      // AND the MLM win commission paid up their uplines — before recomputing from the new inputs.
      await tx.ticket.updateMany({ where: { id: { in: existing.winners.map((w) => w.ticketId) } }, data: { status: 'SOLD' } });
      await reverseWinnerWallets(tx, id, existing.winners);
      await reversePrizeWinCommissions(tx, id);
      await tx.drawResultWinner.deleteMany({ where: { drawResultId: id } });

      const first = await resolveFirstPrize(tx, input.firstPrizeTicketNumber, input.drawSlotId, input.drawDate);
      const prizeBase = await resolvePrizeBase();

      const updated = await tx.drawResult.update({
        where: { id },
        data: {
          drawName: input.drawName,
          drawNumber: input.drawNumber,
          drawSlotId: input.drawSlotId,
          drawDate: input.drawDate,
          firstPrizeNumber: first.number,
          firstPrizeTicketId: first.ticket?.id ?? null,
          firstPrizeAmount: round2(prizeBase.firstPrizeAmount),
          secondPrizeAmount: round2(prizeBase.secondPrizeAmount),
          secondPrizeNumbers: input.secondPrizeNumbers,
          thirdPrizeAmount: round2(prizeBase.thirdPrizeAmount),
          thirdPrizeNumbers: input.thirdPrizeNumbers,
          fourthPrizeAmount: round2(prizeBase.fourthPrizeAmount),
          fourthPrizeNumbers: input.fourthPrizeNumbers,
          fifthPrizeAmount: round2(prizeBase.fifthPrizeAmount),
          fifthPrizePercentage: input.fifthPrizePercentage,
          fifthPrizeNumbers: input.fifthPrizeNumbers,
        },
      });

      const winners = await computeWinners(tx, {
        drawSlotId: input.drawSlotId,
        drawDate: input.drawDate,
        firstPrizeTicketId: first.ticket?.id ?? null,
        firstPrizeTicketAgentId: first.ticket?.soldByAgentId ?? null,
        firstPrizeTicketReceiptId: first.ticket?.receiptId ?? null,
        prizeBase,
        secondPrizeNumbers: input.secondPrizeNumbers,
        thirdPrizeNumbers: input.thirdPrizeNumbers,
        fourthPrizeNumbers: input.fourthPrizeNumbers,
        fifthPrizeNumbers: input.fifthPrizeNumbers,
      });
      await saveWinnersAndDistributePrizePool(tx, updated.id, winners);

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
    await reversePrizeWinCommissions(tx, id);
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
  const excludeIds = used.map((r) => r.firstPrizeTicketId).filter((x): x is number => x !== null);

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
        ticket: { include: { series: { select: { id: true, name: true, multiplier: true } }, soldByAgent: { select: { id: true, name: true } }, soldToCustomer: true } },
        drawResult: { include: { drawSlot: true } },
      },
    }),
    prisma.drawResultWinner.count({ where }),
  ]);

  return { items, total, page: query.page, pageSize: query.pageSize };
}
