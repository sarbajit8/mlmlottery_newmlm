import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { ApiError } from '../../lib/apiError.js';
import { logActivity } from '../../middleware/auditLog.js';
import { generateReceiptCode } from '../../lib/codes.js';
import { round2 } from '../../lib/money.js';
import { buildReceiptWaLink } from '../../lib/waLink.js';
import { currentDrawDate, drawDateToIso } from '../../lib/datetime.js';
import { computeLiveStatus } from '../drawSlots/drawSlots.service.js';
import { computeCommissionsForSale } from '../mlm/commission.engine.js';

export interface CreateSaleInput {
  ticketIds: number[];
  customer: { name: string; mobile: string; whatsapp?: string; email?: string };
}

export async function createSale(input: CreateSaleInput, agentId: number) {
  const result = await runCreateSale(input, agentId);

  const waLink = result.customer.whatsapp
    ? buildReceiptWaLink({
        whatsapp: result.customer.whatsapp,
        drawSlotName: result.drawSlotName,
        drawDate: result.receipt.drawDate.toISOString().slice(0, 10),
        ticketNumbers: result.ticketNumbers,
        seriesSummary: result.seriesSummary,
        totalAmount: result.receipt.totalAmount.toNumber(),
      })
    : null;

  return { ...result, waLink };
}

async function runCreateSale(input: CreateSaleInput, agentId: number) {
  return prisma.$transaction(
    async (tx) => {
      const tickets = await tx.ticket.findMany({
        where: { id: { in: input.ticketIds } },
        include: {
          batch: { select: { status: true } },
          drawSlot: { select: { id: true, name: true } },
          series: { select: { name: true, multiplier: true } },
        },
      });

      if (tickets.length !== input.ticketIds.length) {
        throw ApiError.badRequest('One or more selected tickets do not exist');
      }

      const notAvailable = tickets.filter((t) => t.status !== 'AVAILABLE');
      if (notAvailable.length > 0) {
        throw ApiError.conflict('Some selected tickets are no longer available', {
          ticketNumbers: notAvailable.map((t) => t.ticketNumber),
        });
      }

      if (tickets.some((t) => t.batch.status === 'LOCKED')) {
        throw ApiError.conflict('One or more selected tickets belong to a locked batch');
      }

      const drawSlotId = tickets[0].drawSlotId;
      const drawDate = tickets[0].drawDate;
      if (tickets.some((t) => t.drawSlotId !== drawSlotId || t.drawDate.getTime() !== drawDate.getTime())) {
        throw ApiError.badRequest('All tickets in a single sale must belong to the same draw date and slot');
      }

      // The tickets must be for the draw window that is open RIGHT NOW — not a slot that has since
      // closed, and not a stale draw date. Guards against selling the wrong day's tickets after the
      // Sell page has been left open across the slot cutover / midnight.
      if (drawDateToIso(drawDate) !== currentDrawDate()) {
        throw ApiError.badRequest('These tickets are for a different draw date. Refresh the page and try again.');
      }
      const slot = await tx.drawSlot.findUnique({ where: { id: drawSlotId } });
      if (!slot || computeLiveStatus(slot) !== 'OPEN_NOW') {
        throw ApiError.badRequest('Sales for this draw slot are not open right now. Refresh the page and try again.');
      }

      let customer = await tx.customer.findUnique({
        where: { createdByAgentId_mobile: { createdByAgentId: agentId, mobile: input.customer.mobile } },
      });
      if (!customer) {
        customer = await tx.customer.create({
          data: { name: input.customer.name, mobile: input.customer.mobile, whatsapp: input.customer.whatsapp, email: input.customer.email, createdByAgentId: agentId },
        });
      } else {
        customer = await tx.customer.update({
          where: { id: customer.id },
          data: {
            name: input.customer.name,
            whatsapp: input.customer.whatsapp ?? customer.whatsapp,
            email: input.customer.email ?? customer.email,
          },
        });
      }

      const totalSemValue = round2(tickets.reduce((sum, t) => sum.plus(t.semValue), new Prisma.Decimal(0)));
      const totalAmount = round2(tickets.reduce((sum, t) => sum.plus(t.price), new Prisma.Decimal(0)));

      const receipt = await tx.receipt.create({
        data: {
          receiptCode: generateReceiptCode(),
          agentId,
          customerId: customer.id,
          drawSlotId,
          drawDate,
          totalTickets: tickets.length,
          totalSemValue,
          totalAmount,
        },
        include: { paymentMethod: { select: { id: true, label: true, upiId: true } } },
      });

      // Tickets are paid straight out of the agent's wallet — guarded decrement so two concurrent
      // sales can't jointly overdraw the balance. Insufficient funds rolls back the whole sale.
      const debitResult = await tx.user.updateMany({
        where: { id: agentId, walletBalance: { gte: totalAmount } },
        data: { walletBalance: { decrement: totalAmount } },
      });
      if (debitResult.count !== 1) {
        throw ApiError.badRequest('Insufficient wallet balance. Please add funds to your wallet before selling tickets.');
      }
      const debitedAgent = await tx.user.findUniqueOrThrow({ where: { id: agentId }, select: { walletBalance: true } });
      await tx.walletTransaction.create({
        data: {
          userId: agentId,
          type: 'PURCHASE',
          amount: totalAmount.negated(),
          balanceAfter: debitedAgent.walletBalance,
          refId: receipt.receiptCode,
          status: 'COMPLETED',
        },
      });

      // The debited amount lands in the company wallet — the agent effectively buys the tickets
      // wholesale before reselling them to the end customer.
      const companyWallet = await tx.user.findFirst({ where: { isCompanyWallet: true }, select: { id: true } });
      if (companyWallet && companyWallet.id !== agentId) {
        const creditedCompany = await tx.user.update({
          where: { id: companyWallet.id },
          data: { walletBalance: { increment: totalAmount } },
        });
        await tx.walletTransaction.create({
          data: {
            userId: companyWallet.id,
            type: 'PURCHASE',
            amount: totalAmount,
            balanceAfter: creditedCompany.walletBalance,
            refId: receipt.receiptCode,
            status: 'COMPLETED',
          },
        });
      }

      // Guarded conditional update — the race-safe double-sell guard. See sales module notes.
      const updateResult = await tx.ticket.updateMany({
        where: { id: { in: input.ticketIds }, status: 'AVAILABLE' },
        data: { status: 'SOLD', soldByAgentId: agentId, soldToCustomerId: customer.id, soldAt: new Date(), receiptId: receipt.id },
      });

      if (updateResult.count !== input.ticketIds.length) {
        throw ApiError.conflict('One or more of these tickets were just sold by someone else. Please refresh and try again.');
      }

      const commissions = await computeCommissionsForSale(tx, {
        sellingAgentId: agentId,
        receiptId: receipt.id,
        tickets: tickets.map((t) => ({ id: t.id, semValue: t.semValue })),
      });

      if (commissions.ledgerRows.length > 0) {
        await tx.commissionLedger.createMany({ data: commissions.ledgerRows });
      }

      if (commissions.walletCredits.size > 0) {
        const walletTxns: Prisma.WalletTransactionCreateManyInput[] = [];
        for (const [uplineAgentId, amount] of commissions.walletCredits) {
          const updatedUpline = await tx.user.update({
            where: { id: uplineAgentId },
            data: { walletBalance: { increment: amount } },
          });
          walletTxns.push({
            userId: uplineAgentId,
            type: 'COMMISSION',
            amount,
            balanceAfter: updatedUpline.walletBalance,
            refId: receipt.receiptCode,
            status: 'COMPLETED',
          });
        }
        await tx.walletTransaction.createMany({ data: walletTxns });
      }

      await logActivity(tx, {
        actorId: agentId,
        action: 'SALE_CREATE',
        entityType: 'Receipt',
        entityId: receipt.id,
        metadata: { totalTickets: tickets.length, totalAmount: totalAmount.toString() },
      });

      // "3CM ×2, 5CM ×1" — which SEM series the bought tickets came from, and how many of each.
      const countBySeries = new Map<string, number>();
      for (const t of tickets) countBySeries.set(t.series.name, (countBySeries.get(t.series.name) ?? 0) + 1);
      const seriesSummary = [...countBySeries.entries()]
        .map(([name, count]) => (tickets.length > 1 ? `${name} ×${count}` : name))
        .join(', ');

      return {
        receipt,
        customer,
        drawSlotName: tickets[0].drawSlot.name,
        ticketNumbers: tickets.map((t) => t.ticketNumber).sort(),
        seriesSummary,
      };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted, timeout: 20000 },
  );
}

export interface ListSalesQuery {
  from?: Date;
  to?: Date;
  agentId?: number;
  page: number;
  pageSize: number;
}

export async function listSales(query: ListSalesQuery, requester: { id: number; role: string }) {
  const isAdmin = requester.role === 'SUPER_ADMIN';
  const where: Prisma.ReceiptWhereInput = {
    agentId: isAdmin ? query.agentId : requester.id,
    createdAt: query.from || query.to ? { gte: query.from, lte: query.to } : undefined,
  };

  const [items, total] = await Promise.all([
    prisma.receipt.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      include: {
        agent: { select: { id: true, name: true } },
        customer: true,
        drawSlot: true,
        paymentMethod: { select: { id: true, label: true, upiId: true } },
      },
    }),
    prisma.receipt.count({ where }),
  ]);

  return { items, total, page: query.page, pageSize: query.pageSize };
}

export async function getReceipt(id: number, requester: { id: number; role: string }) {
  const receipt = await prisma.receipt.findUnique({
    where: { id },
    include: {
      agent: { select: { id: true, name: true } },
      customer: true,
      drawSlot: true,
      tickets: { include: { series: { select: { id: true, name: true, multiplier: true } } } },
      paymentMethod: { select: { id: true, label: true, upiId: true } },
    },
  });
  if (!receipt) throw ApiError.notFound('Receipt not found');
  if (requester.role !== 'SUPER_ADMIN' && receipt.agentId !== requester.id) {
    throw ApiError.forbidden('You do not have access to this receipt');
  }
  return receipt;
}
