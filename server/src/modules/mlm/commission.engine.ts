import { Prisma } from '@prisma/client';
import { round2 } from '../../lib/money.js';

type Tx = Prisma.TransactionClient;

interface SoldTicket {
  id: number;
  semValue: Prisma.Decimal;
}

interface ComputeCommissionsParams {
  sellingAgentId: number;
  receiptId: number;
  tickets: SoldTicket[];
}

export interface CommissionComputation {
  ledgerRows: Prisma.CommissionLedgerCreateManyInput[];
  walletCredits: Map<number, Prisma.Decimal>;
  payoutMode: 'INSTANT' | 'BATCH';
}

/**
 * Resolves the commission chain for one selling agent: `{ level, agentId }` for every level
 * 1..maxLevels.
 *
 * Level 1 is the SELLING AGENT themselves (the person who sold the ticket / holds the prize),
 * level 2 is their sponsor, level 3 the sponsor's sponsor, and so on up the tree. A sponsor cycle
 * / self-sponsor stops the walk (so one user can't collect several levels), and any level with no
 * real person behind it is a shortfall — sent to the company wallet under ROLLUP_TO_ADMIN, dropped
 * under FORFEIT.
 */
async function resolveUplineChain(
  tx: Tx,
  sellingAgentId: number,
  maxLevels: number,
  shortfallPolicy: 'FORFEIT' | 'ROLLUP_TO_ADMIN',
  companyWalletId: number | null,
): Promise<{ level: number; agentId: number }[]> {
  const chain: { level: number; agentId: number }[] = maxLevels >= 1 ? [{ level: 1, agentId: sellingAgentId }] : [];
  const seen = new Set<number>([sellingAgentId]);
  let currentId = sellingAgentId;
  for (let level = 2; level <= maxLevels; level++) {
    const current = await tx.user.findUnique({ where: { id: currentId }, select: { sponsorId: true } });
    if (!current?.sponsorId || seen.has(current.sponsorId)) break;
    chain.push({ level, agentId: current.sponsorId });
    seen.add(current.sponsorId);
    currentId = current.sponsorId;
  }

  if (shortfallPolicy === 'ROLLUP_TO_ADMIN' && companyWalletId) {
    const filled = new Set(chain.map((c) => c.level));
    for (let level = 1; level <= maxLevels; level++) {
      if (!filled.has(level)) chain.push({ level, agentId: companyWalletId });
    }
  }

  return chain;
}

async function getActiveSettingsAndCompany(tx: Tx) {
  const settings = await tx.mlmSettings.findFirst({
    where: { effectiveTo: null },
    orderBy: { effectiveFrom: 'desc' },
    include: { levelPercentages: true },
  });
  const companyWallet = await tx.user.findFirst({
    where: { isCompanyWallet: true },
    orderBy: { id: 'asc' },
    select: { id: true },
  });
  return { settings, companyWalletId: companyWallet?.id ?? null };
}

/**
 * Sale commission: resolves the chain once for the selling agent (every ticket in one sale shares
 * the seller) and builds ledger rows per ticket x level, each level earning its configured
 * `percentage` of the ticket's SEM value. Level 1 is the selling agent themselves, so the person
 * who made the sale earns the level-1 rate; level 2 is their sponsor, and so on up the tree.
 */
export async function computeCommissionsForSale(tx: Tx, params: ComputeCommissionsParams): Promise<CommissionComputation> {
  const { settings, companyWalletId } = await getActiveSettingsAndCompany(tx);
  if (!settings) {
    return { ledgerRows: [], walletCredits: new Map(), payoutMode: 'INSTANT' };
  }

  const pctByLevel = new Map(settings.levelPercentages.map((lp) => [lp.levelNumber, lp.percentage]));
  const chain = await resolveUplineChain(tx, params.sellingAgentId, settings.maxLevels, settings.shortfallPolicy, companyWalletId);

  const ledgerRows: Prisma.CommissionLedgerCreateManyInput[] = [];
  const walletCredits = new Map<number, Prisma.Decimal>();
  const isInstant = settings.payoutMode === 'INSTANT';

  for (const ticket of params.tickets) {
    for (const { level, agentId } of chain) {
      const pct = pctByLevel.get(level);
      if (pct === undefined) continue;
      const commissionAmount = round2(ticket.semValue.times(pct).dividedBy(100));

      ledgerRows.push({
        kind: 'SALE',
        receiptId: params.receiptId,
        ticketId: ticket.id,
        earningAgentId: agentId,
        sourceAgentId: params.sellingAgentId,
        levelNumber: level,
        semValue: ticket.semValue,
        percentageApplied: pct,
        commissionAmount,
        status: isInstant ? 'PAID' : 'PENDING',
        paidAt: isInstant ? new Date() : null,
      });

      if (isInstant) {
        walletCredits.set(agentId, (walletCredits.get(agentId) ?? new Prisma.Decimal(0)).plus(commissionAmount));
      }
    }
  }

  return { ledgerRows, walletCredits, payoutMode: settings.payoutMode };
}

interface PrizeWinner {
  ticketId: number;
  receiptId: number;
  sellerAgentId: number | null;
  prizeAmount: Prisma.Decimal;
}

/**
 * Prize-win commission: when a result is declared, the levels ABOVE the selling agent each earn
 * their configured `winPercentage` of that ticket's (already SEM-scaled) prize amount, taken out of
 * the prize. Level 1 in the chain is the selling agent themselves — they aren't paid a win
 * commission, they receive the prize itself (whatever is left after the upline cut), so level 1 is
 * skipped here. Level 2 is the sponsor, level 3 the sponsor's sponsor, and so on; empty upper
 * levels roll up to the company wallet. The chain is resolved once per distinct seller.
 */
export async function computePrizeWinCommissions(
  tx: Tx,
  params: { drawResultId: number; winners: PrizeWinner[] },
): Promise<CommissionComputation> {
  const { settings, companyWalletId } = await getActiveSettingsAndCompany(tx);
  if (!settings) {
    return { ledgerRows: [], walletCredits: new Map(), payoutMode: 'INSTANT' };
  }

  const winPctByLevel = new Map(settings.levelPercentages.map((lp) => [lp.levelNumber, lp.winPercentage]));
  // Only levels 2+ pay a win commission (level 1 is the seller / prize owner).
  const hasUplineWinPct = settings.levelPercentages.some((lp) => lp.levelNumber >= 2 && lp.winPercentage.greaterThan(0));
  if (!hasUplineWinPct) {
    return { ledgerRows: [], walletCredits: new Map(), payoutMode: settings.payoutMode };
  }

  const ledgerRows: Prisma.CommissionLedgerCreateManyInput[] = [];
  const walletCredits = new Map<number, Prisma.Decimal>();
  const isInstant = settings.payoutMode === 'INSTANT';
  const chainCache = new Map<number, { level: number; agentId: number }[]>();

  for (const winner of params.winners) {
    if (!winner.sellerAgentId || winner.prizeAmount.lessThanOrEqualTo(0)) continue;

    let chain = chainCache.get(winner.sellerAgentId);
    if (!chain) {
      chain = await resolveUplineChain(tx, winner.sellerAgentId, settings.maxLevels, settings.shortfallPolicy, companyWalletId);
      chainCache.set(winner.sellerAgentId, chain);
    }

    for (const { level, agentId } of chain) {
      if (level === 1) continue; // level 1 is the seller — their reward is the prize, not a commission
      const pct = winPctByLevel.get(level);
      if (pct === undefined || pct.lessThanOrEqualTo(0)) continue;
      const commissionAmount = round2(winner.prizeAmount.times(pct).dividedBy(100));
      if (commissionAmount.lessThanOrEqualTo(0)) continue;

      ledgerRows.push({
        kind: 'WIN',
        receiptId: winner.receiptId,
        ticketId: winner.ticketId,
        drawResultId: params.drawResultId,
        earningAgentId: agentId,
        sourceAgentId: winner.sellerAgentId,
        levelNumber: level,
        semValue: winner.prizeAmount,
        percentageApplied: pct,
        commissionAmount,
        status: isInstant ? 'PAID' : 'PENDING',
        paidAt: isInstant ? new Date() : null,
      });

      if (isInstant) {
        walletCredits.set(agentId, (walletCredits.get(agentId) ?? new Prisma.Decimal(0)).plus(commissionAmount));
      }
    }
  }

  return { ledgerRows, walletCredits, payoutMode: settings.payoutMode };
}
