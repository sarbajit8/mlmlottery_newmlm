import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { ApiError } from '../../lib/apiError.js';
import { logActivity } from '../../middleware/auditLog.js';
import { generateBatchCode } from '../../lib/codes.js';
import { round2 } from '../../lib/money.js';
import { streamCsv } from '../../lib/csv.js';
import { TICKET_GENERATION_CHUNK_SIZE } from '../../config/constants.js';
import { getTicketBasePrice } from '../system/system.service.js';
import { currentDrawDate, drawDateToUtc } from '../../lib/datetime.js';
import { computeLiveStatus } from '../drawSlots/drawSlots.service.js';
import type { Response } from 'express';

function numberWidth(startNumber: number, quantity: number): number {
  const lastNumber = startNumber + quantity - 1;
  // 5-digit default (00000-99999) matches standard lottery ticket numbering; widens automatically
  // if the requested range needs more digits than that.
  return Math.max(5, String(lastNumber).length);
}

function buildTicketNumbers(prefix: string, startNumber: number, quantity: number): string[] {
  const width = numberWidth(startNumber, quantity);
  const numbers: string[] = new Array(quantity);
  for (let i = 0; i < quantity; i++) {
    numbers[i] = `${prefix}-${String(startNumber + i).padStart(width, '0')}`;
  }
  return numbers;
}

export interface TicketGenInput {
  drawSlotId: number;
  drawDate: Date;
  seriesId: number;
  prefix: string;
  startNumber: number;
  quantity: number;
  pricePerTicket?: number;
}

async function resolveSeriesAndPrice(input: TicketGenInput) {
  const series = await prisma.series.findUnique({ where: { id: input.seriesId } });
  if (!series) throw ApiError.badRequest('Series not found');
  const drawSlot = await prisma.drawSlot.findUnique({ where: { id: input.drawSlotId } });
  if (!drawSlot) throw ApiError.badRequest('Draw slot not found');

  // The per-SEM (1×) unit value for this batch: pricePerTicket when the admin sets one on the form,
  // otherwise the global admin-configured ticket base price. Everything else scales from it by the
  // series multiplier — SEM value and charged price are the same number: value 8 on a 3× series
  // => 24, on a 1× series => 8.
  const ticketBasePrice = await getTicketBasePrice();
  const unitValue = input.pricePerTicket !== undefined ? new Prisma.Decimal(input.pricePerTicket) : new Prisma.Decimal(ticketBasePrice);
  const semValue = round2(series.multiplier.times(unitValue));
  const price = semValue;
  return { series, drawSlot, semValue, price };
}

/** A prefix can only be used once per draw date — across every slot and series that day, not just
 *  within one — but is free to be reused again on a different date. */
async function assertPrefixNotUsedThatDay(prefix: string, drawDate: Date, excludeBatchId?: number) {
  const existing = await prisma.ticketBatch.findFirst({
    where: { prefix, drawDate, id: excludeBatchId ? { not: excludeBatchId } : undefined },
    select: { id: true, batchCode: true },
  });
  if (existing) {
    throw ApiError.conflict(`Prefix "${prefix}" is already used by another batch (${existing.batchCode}) on this draw date. Prefixes must be unique per day.`);
  }
}

export async function previewTickets(input: TicketGenInput) {
  await assertPrefixNotUsedThatDay(input.prefix, input.drawDate);
  const { semValue, price } = await resolveSeriesAndPrice(input);
  const width = numberWidth(input.startNumber, input.quantity);
  const first = `${input.prefix}-${String(input.startNumber).padStart(width, '0')}`;
  const last = `${input.prefix}-${String(input.startNumber + input.quantity - 1).padStart(width, '0')}`;

  return {
    totalTickets: input.quantity,
    firstTicketNumber: first,
    lastTicketNumber: last,
    semValuePerTicket: semValue,
    pricePerTicket: price,
    totalSemValue: round2(semValue.times(input.quantity)),
    totalAmount: round2(price.times(input.quantity)),
  };
}

// Same ticket number STRING is fine on a different day — only scoped to the one draw date, since
// prefixes (and therefore full ticket numbers) are unique per day, not globally (see
// assertPrefixNotUsedThatDay). This is a defensive backstop; the prefix check above already rules
// out same-day collisions in practice.
async function assertNoCollisions(ticketNumbers: string[], drawDate: Date) {
  const CHUNK = 5000;
  for (let i = 0; i < ticketNumbers.length; i += CHUNK) {
    const chunk = ticketNumbers.slice(i, i + CHUNK);
    const collisions = await prisma.ticket.findMany({
      where: { ticketNumber: { in: chunk }, drawDate },
      select: { ticketNumber: true },
      take: 5,
    });
    if (collisions.length > 0) {
      throw ApiError.conflict('Some ticket numbers in this range already exist for this draw date', {
        sample: collisions.map((c) => c.ticketNumber),
      });
    }
  }
}

export async function generateTickets(input: TicketGenInput, actorId: number) {
  await assertPrefixNotUsedThatDay(input.prefix, input.drawDate);
  const { series, drawSlot, semValue, price } = await resolveSeriesAndPrice(input);
  const ticketNumbers = buildTicketNumbers(input.prefix, input.startNumber, input.quantity);
  await assertNoCollisions(ticketNumbers, input.drawDate);

  const totalSemValue = round2(semValue.times(input.quantity));

  const batch = await prisma.$transaction(
    async (tx) => {
      const createdBatch = await tx.ticketBatch.create({
        data: {
          batchCode: generateBatchCode(),
          drawSlotId: drawSlot.id,
          drawDate: input.drawDate,
          seriesId: series.id,
          prefix: input.prefix,
          startNumber: input.startNumber,
          quantity: input.quantity,
          pricePerTicket: price,
          totalSemValue,
          createdById: actorId,
        },
      });

      for (let i = 0; i < ticketNumbers.length; i += TICKET_GENERATION_CHUNK_SIZE) {
        const chunk = ticketNumbers.slice(i, i + TICKET_GENERATION_CHUNK_SIZE);
        await tx.ticket.createMany({
          data: chunk.map((ticketNumber) => ({
            batchId: createdBatch.id,
            ticketNumber,
            drawSlotId: drawSlot.id,
            drawDate: input.drawDate,
            seriesId: series.id,
            semValue,
            price,
          })),
        });
      }

      await logActivity(tx, {
        actorId,
        action: 'TICKET_BATCH_GENERATE',
        entityType: 'TicketBatch',
        entityId: createdBatch.id,
        metadata: { quantity: input.quantity, prefix: input.prefix },
      });

      return createdBatch;
    },
    { timeout: 60000 },
  );

  return batch;
}

export interface ListBatchesQuery {
  drawDate?: Date;
  drawSlotId?: number;
  status?: 'OPEN' | 'LOCKED';
  page: number;
  pageSize: number;
}

export async function listBatches(query: ListBatchesQuery) {
  const where: Prisma.TicketBatchWhereInput = {
    ...(query.drawDate ? { drawDate: query.drawDate } : {}),
    ...(query.drawSlotId ? { drawSlotId: query.drawSlotId } : {}),
    ...(query.status ? { status: query.status } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.ticketBatch.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      include: { drawSlot: true, series: true, createdBy: { select: { id: true, name: true } } },
    }),
    prisma.ticketBatch.count({ where }),
  ]);

  const batchIds = items.map((b) => b.id);
  const grouped = batchIds.length
    ? await prisma.ticket.groupBy({ by: ['batchId', 'status'], where: { batchId: { in: batchIds } }, _count: true })
    : [];

  const countsByBatch = new Map<number, Record<string, number>>();
  for (const row of grouped) {
    const map = countsByBatch.get(row.batchId) ?? {};
    map[row.status] = row._count;
    countsByBatch.set(row.batchId, map);
  }

  const enriched = items.map((batch) => {
    const counts = countsByBatch.get(batch.id) ?? {};
    const sold = (counts.SOLD ?? 0) + (counts.WINNER ?? 0);
    const available = counts.AVAILABLE ?? 0;
    const cancelled = counts.CANCELLED ?? 0;
    return { ...batch, counts: { available, sold, cancelled, total: batch.quantity }, soldPercent: batch.quantity ? Math.round((sold / batch.quantity) * 100) : 0 };
  });

  return { items: enriched, total, page: query.page, pageSize: query.pageSize };
}

export async function getBatchDetail(id: number) {
  const batch = await prisma.ticketBatch.findUnique({
    where: { id },
    include: { drawSlot: true, series: true, createdBy: { select: { id: true, name: true } } },
  });
  if (!batch) throw ApiError.notFound('Ticket batch not found');

  const grouped = await prisma.ticket.groupBy({ by: ['status'], where: { batchId: id }, _count: true });
  const counts: Record<string, number> = {};
  for (const row of grouped) counts[row.status] = row._count;

  return { ...batch, counts };
}

export interface BatchTicketsQuery {
  status?: 'AVAILABLE' | 'SOLD' | 'WINNER' | 'CANCELLED';
  search?: string;
  page: number;
  pageSize: number;
}

export async function getBatchTickets(batchId: number, query: BatchTicketsQuery) {
  const where: Prisma.TicketWhereInput = {
    batchId,
    ...(query.status ? { status: query.status } : {}),
    ...(query.search ? { ticketNumber: { contains: query.search } } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.ticket.findMany({
      where,
      orderBy: { ticketNumber: 'asc' },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      select: { id: true, ticketNumber: true, status: true, price: true, semValue: true, soldAt: true },
    }),
    prisma.ticket.count({ where }),
  ]);

  return { items, total, page: query.page, pageSize: query.pageSize };
}

export async function exportBatchCsv(batchId: number, res: Response) {
  const batch = await prisma.ticketBatch.findUnique({ where: { id: batchId } });
  if (!batch) throw ApiError.notFound('Ticket batch not found');

  const tickets = await prisma.ticket.findMany({
    where: { batchId },
    orderBy: { ticketNumber: 'asc' },
    select: {
      ticketNumber: true,
      status: true,
      price: true,
      semValue: true,
      soldByAgent: { select: { name: true } },
      soldToCustomer: { select: { name: true, mobile: true } },
      soldAt: true,
    },
  });

  streamCsv(
    res,
    `${batch.batchCode}.csv`,
    ['Ticket Number', 'Status', 'Price', 'SEM Value', 'Sold By', 'Customer', 'Customer Mobile', 'Sold At'],
    tickets.map((t) => [
      t.ticketNumber,
      t.status,
      t.price.toString(),
      t.semValue.toString(),
      t.soldByAgent?.name ?? '',
      t.soldToCustomer?.name ?? '',
      t.soldToCustomer?.mobile ?? '',
      t.soldAt?.toISOString() ?? '',
    ]),
  );
}

export async function lockBatch(id: number, actorId: number) {
  const batch = await prisma.ticketBatch.findUnique({ where: { id } });
  if (!batch) throw ApiError.notFound('Ticket batch not found');
  const updated = await prisma.ticketBatch.update({ where: { id }, data: { status: 'LOCKED' } });
  await logActivity(prisma, { actorId, action: 'TICKET_BATCH_LOCK', entityType: 'TicketBatch', entityId: id });
  return updated;
}

/** Deletes an entire ticket lot (batch) and all of its tickets. Refused if any ticket in it has
 *  been sold or has won — those are tied to receipts, wallet debits and commission, so the batch
 *  can't just vanish. Unsold batches (all AVAILABLE) are safe to remove. */
export async function deleteBatch(id: number, actorId: number) {
  const batch = await prisma.ticketBatch.findUnique({ where: { id } });
  if (!batch) throw ApiError.notFound('Ticket batch not found');

  const soldCount = await prisma.ticket.count({ where: { batchId: id, status: { in: ['SOLD', 'WINNER'] } } });
  if (soldCount > 0) {
    throw ApiError.conflict(
      `Cannot delete this lot — ${soldCount} of its ticket(s) have already been sold. Only lots with no sales can be deleted.`,
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.ticket.deleteMany({ where: { batchId: id } });
    await tx.ticketBatch.delete({ where: { id } });
    await logActivity(tx, {
      actorId,
      action: 'TICKET_BATCH_DELETE',
      entityType: 'TicketBatch',
      entityId: id,
      metadata: { batchCode: batch.batchCode, quantity: batch.quantity, prefix: batch.prefix },
    });
  });
}

export async function getSummaryCards(drawDate?: Date) {
  const ticketWhere: Prisma.TicketWhereInput = drawDate ? { drawDate } : {};
  const batchWhere: Prisma.TicketBatchWhereInput = drawDate ? { drawDate } : {};

  const [slots, ticketAgg, batchAgg] = await Promise.all([
    prisma.drawSlot.findMany({ orderBy: { salesOpenTime: 'asc' } }),
    prisma.ticket.groupBy({ by: ['drawSlotId', 'status'], where: ticketWhere, _count: true, _sum: { price: true } }),
    prisma.ticketBatch.groupBy({ by: ['drawSlotId'], where: batchWhere, _count: true }),
  ]);

  const batchCountBySlot = new Map(batchAgg.map((b) => [b.drawSlotId, b._count]));

  return slots.map((slot) => {
    const rows = ticketAgg.filter((r) => r.drawSlotId === slot.id);
    const available = rows.find((r) => r.status === 'AVAILABLE')?._count ?? 0;
    const soldRow = rows.find((r) => r.status === 'SOLD');
    const winnerRow = rows.find((r) => r.status === 'WINNER');
    const sold = (soldRow?._count ?? 0) + (winnerRow?._count ?? 0);
    const revenue = round2(
      new Prisma.Decimal(soldRow?._sum.price ?? 0).plus(new Prisma.Decimal(winnerRow?._sum.price ?? 0)),
    );
    return {
      drawSlotId: slot.id,
      drawSlotName: slot.name,
      available,
      sold,
      revenue,
      batchCount: batchCountBySlot.get(slot.id) ?? 0,
    };
  });
}

export interface TicketSearchQuery {
  drawSlotId: number;
  drawDate: Date;
  seriesId?: number;
  q?: string;
  page: number;
  pageSize: number;
}

export async function searchAvailableTickets(query: TicketSearchQuery) {
  // Agents sell for the slot that is OPEN_NOW, or — when there's a gap between windows — for the
  // next upcoming slot (ACTIVE) so the page is never dead. A DRAW_DONE / CLOSED slot is not
  // sellable. Always for the current business-timezone draw date (client's drawDate is ignored).
  const slot = await prisma.drawSlot.findUnique({ where: { id: query.drawSlotId } });
  const live = slot && computeLiveStatus(slot);
  if (!slot || (live !== 'OPEN_NOW' && live !== 'ACTIVE')) {
    return { items: [], total: 0, page: query.page, pageSize: query.pageSize };
  }

  const term = query.q?.trim().toUpperCase();
  const baseWhere: Prisma.TicketWhereInput = {
    drawSlotId: query.drawSlotId,
    drawDate: drawDateToUtc(currentDrawDate()),
    status: 'AVAILABLE',
    batch: { status: { not: 'LOCKED' } },
    ...(query.seriesId ? { seriesId: query.seriesId } : {}),
  };

  // Searching "0001" should surface that ticket AND the ones that follow it (0002, 0003, …) so the
  // agent can grab a consecutive block. We find the first available ticket whose number ends with
  // the search, then return everything from there onward in order.
  const where: Prisma.TicketWhereInput = { ...baseWhere };
  if (term) {
    const anchor = await prisma.ticket.findFirst({
      where: { ...baseWhere, ticketNumber: { endsWith: term } },
      orderBy: { ticketNumber: 'asc' },
      select: { ticketNumber: true },
    });
    where.ticketNumber = anchor ? { gte: anchor.ticketNumber } : { endsWith: term };
  }

  const [items, total] = await Promise.all([
    prisma.ticket.findMany({
      where,
      orderBy: { ticketNumber: 'asc' },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      include: { series: { select: { id: true, name: true, multiplier: true } } },
    }),
    prisma.ticket.count({ where }),
  ]);

  return { items, total, page: query.page, pageSize: query.pageSize };
}
