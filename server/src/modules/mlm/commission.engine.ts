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
 * Walks the sponsor chain once for the selling agent (every ticket in a single sale shares the
 * same seller, so the chain is identical for the whole cart) and builds ledger rows per ticket x level.
 */
export async function computeCommissionsForSale(tx: Tx, params: ComputeCommissionsParams): Promise<CommissionComputation> {
  const settings = await tx.mlmSettings.findFirst({
    where: { effectiveTo: null },
    orderBy: { effectiveFrom: 'desc' },
    include: { levelPercentages: true },
  });
  if (!settings) {
    return { ledgerRows: [], walletCredits: new Map(), payoutMode: 'INSTANT' };
  }

  const pctByLevel = new Map(settings.levelPercentages.map((lp) => [lp.levelNumber, lp.percentage]));

  // 1. Walk the sponsor chain, collecting { level, agentId } for as many levels as the chain has.
  const chain: { level: number; agentId: number }[] = [];
  let currentId = params.sellingAgentId;
  for (let level = 1; level <= settings.maxLevels; level++) {
    const current = await tx.user.findUnique({ where: { id: currentId }, select: { sponsorId: true } });
    if (!current?.sponsorId) break;
    chain.push({ level, agentId: current.sponsorId });
    currentId = current.sponsorId;
  }

  // 2. If the chain ran out early, apply the shortfall policy for the remaining levels.
  if (chain.length < settings.maxLevels && settings.shortfallPolicy === 'ROLLUP_TO_ADMIN') {
    const companyWallet = await tx.user.findFirst({ where: { isCompanyWallet: true }, select: { id: true } });
    if (companyWallet) {
      for (let level = chain.length + 1; level <= settings.maxLevels; level++) {
        chain.push({ level, agentId: companyWallet.id });
      }
    }
  }

  // 3. Build one ledger row per (ticket x resolved level).
  const ledgerRows: Prisma.CommissionLedgerCreateManyInput[] = [];
  const walletCredits = new Map<number, Prisma.Decimal>();
  const isInstant = settings.payoutMode === 'INSTANT';

  for (const ticket of params.tickets) {
    for (const { level, agentId } of chain) {
      const pct = pctByLevel.get(level);
      if (pct === undefined) continue;
      const commissionAmount = round2(ticket.semValue.times(pct).dividedBy(100));

      ledgerRows.push({
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
