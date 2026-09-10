import { Prisma, type PrizeTier } from '@prisma/client';
import { round2 } from '../../lib/money.js';
import { getPrizeWinCommission } from '../system/system.service.js';

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
 * / self-sponsor stops the walk (so one user can't collect several levels).
 *
 * Any level with no real person behind it — the seller doesn't have that many uplines — ALWAYS
 * rolls up to the company wallet (admin). So if a seller has, say, only 1 sponsor, levels 3, 4, 5
 * of the commission all go to admin. Never forfeited.
 */
async function resolveUplineChain(
  tx: Tx,
  sellingAgentId: number,
  maxLevels: number,
  companyWalletId: number,
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

  // Every unfilled level's share goes to admin — no configurable "forfeit".
  const filled = new Set(chain.map((c) => c.level));
  for (let level = 1; level <= maxLevels; level++) {
    if (!filled.has(level)) chain.push({ level, agentId: companyWalletId });
  }

  return chain;
}

async function getActiveSettingsAndCompany(tx: Tx) {
  const settings = await tx.mlmSettings.findFirst({
    where: { effectiveTo: null },
    orderBy: { effectiveFrom: 'desc' },
    include: { levelPercentages: true },
  });
  // The rollup target: the explicit company-wallet account, or (fallback) the Super Admin.
  const companyWallet =
    (await tx.user.findFirst({ where: { isCompanyWallet: true }, orderBy: { id: 'asc' }, select: { id: true } })) ??
    (await tx.user.findFirst({ where: { role: 'SUPER_ADMIN' }, orderBy: { id: 'asc' }, select: { id: true } }));
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
  if (!settings || companyWalletId === null) {
    return { ledgerRows: [], walletCredits: new Map(), payoutMode: settings?.payoutMode ?? 'INSTANT' };
  }

  const pctByLevel = new Map(settings.levelPercentages.map((lp) => [lp.levelNumber, lp.percentage]));
  const chain = await resolveUplineChain(tx, params.sellingAgentId, settings.maxLevels, companyWalletId);

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
  tier: PrizeTier;
}

/**
 * Prize-win commission: when a result is declared, every level of the chain earns its configured
 * percentage of that ticket's (already SEM-scaled) prize amount, and the total is cut from the
 * prize. Level 1 is the SELLING AGENT — so the seller both receives the prize (net of every level's
 * cut) AND earns the level-1 commission on top; level 2 is their sponsor, and so on, with empty
 * levels rolling up to the company wallet.
 *
 * Each prize tier (1st..5th) has its OWN per-level percentages — AppSetting "prizeWinCommission",
 * set on the Prize Settings page.
 */
export async function computePrizeWinCommissions(
  tx: Tx,
  params: { drawResultId: number; winners: PrizeWinner[] },
): Promise<CommissionComputation> {
  const { settings, companyWalletId } = await getActiveSettingsAndCompany(tx);
  if (!settings || companyWalletId === null) {
    return { ledgerRows: [], walletCredits: new Map(), payoutMode: settings?.payoutMode ?? 'INSTANT' };
  }

  const ratesByTier = await getPrizeWinCommission();
  const anyRate = Object.values(ratesByTier).some((arr) => arr.some((p) => p > 0));
  if (!anyRate) {
    return { ledgerRows: [], walletCredits: new Map(), payoutMode: settings.payoutMode };
  }

  const ledgerRows: Prisma.CommissionLedgerCreateManyInput[] = [];
  const walletCredits = new Map<number, Prisma.Decimal>();
  const isInstant = settings.payoutMode === 'INSTANT';
  const chainCache = new Map<number, { level: number; agentId: number }[]>();

  for (const winner of params.winners) {
    if (!winner.sellerAgentId || winner.prizeAmount.lessThanOrEqualTo(0)) continue;

    const tierRates = ratesByTier[winner.tier] ?? [];
    if (!tierRates.some((p) => p > 0)) continue;

    let chain = chainCache.get(winner.sellerAgentId);
    if (!chain) {
      chain = await resolveUplineChain(tx, winner.sellerAgentId, settings.maxLevels, companyWalletId);
      chainCache.set(winner.sellerAgentId, chain);
    }

    for (const { level, agentId } of chain) {
      const pctNum = tierRates[level - 1] ?? 0;
      if (pctNum <= 0) continue;
      const pct = new Prisma.Decimal(pctNum);
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
