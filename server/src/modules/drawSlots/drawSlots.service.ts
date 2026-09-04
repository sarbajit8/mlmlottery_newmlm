import type { DrawSlot, SlotStatus } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { ApiError } from '../../lib/apiError.js';
import { logActivity } from '../../middleware/auditLog.js';

function timeStringToDate(time: string): Date {
  const [h, m, s = '0'] = time.split(':');
  return new Date(Date.UTC(1970, 0, 1, Number(h), Number(m), Number(s)));
}

function minutesOfDayUTC(d: Date): number {
  return d.getUTCHours() * 60 + d.getUTCMinutes();
}

function minutesOfDayLocalNow(): number {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

/** Pure function: derive today's live status for a slot from its template times + current wall-clock time. */
export function computeLiveStatus(slot: Pick<DrawSlot, 'isActive' | 'salesOpenTime' | 'drawCloseTime'>): SlotStatus {
  if (!slot.isActive) return 'CLOSED';
  const nowMin = minutesOfDayLocalNow();
  const openMin = minutesOfDayUTC(slot.salesOpenTime);
  const closeMin = minutesOfDayUTC(slot.drawCloseTime);
  if (nowMin < openMin) return 'ACTIVE';
  if (nowMin >= openMin && nowMin < closeMin) return 'OPEN_NOW';
  return 'DRAW_DONE';
}

function present(slot: DrawSlot) {
  const openMin = minutesOfDayUTC(slot.salesOpenTime);
  const closeMin = minutesOfDayUTC(slot.drawCloseTime);
  return {
    ...slot,
    status: computeLiveStatus(slot), // lazy recompute so the UI is never stale even if the cron tick lags
    salesWindowMinutes: closeMin - openMin,
  };
}

export async function listDrawSlots() {
  const slots = await prisma.drawSlot.findMany({ orderBy: { salesOpenTime: 'asc' } });
  return slots.map(present);
}

export async function getDrawSlot(id: number) {
  const slot = await prisma.drawSlot.findUnique({ where: { id } });
  if (!slot) throw ApiError.notFound('Draw slot not found');
  return present(slot);
}

export interface CreateDrawSlotInput {
  name: string;
  salesOpenTime: string;
  drawCloseTime: string;
  isActive: boolean;
}

export async function createDrawSlot(input: CreateDrawSlotInput, actorId: number) {
  const slot = await prisma.drawSlot.create({
    data: {
      name: input.name,
      salesOpenTime: timeStringToDate(input.salesOpenTime),
      drawCloseTime: timeStringToDate(input.drawCloseTime),
      isActive: input.isActive,
    },
  });
  await logActivity(prisma, { actorId, action: 'DRAW_SLOT_CREATE', entityType: 'DrawSlot', entityId: slot.id });
  return present(await prisma.drawSlot.update({ where: { id: slot.id }, data: { status: computeLiveStatus(slot) } }));
}

export interface UpdateDrawSlotInput {
  name?: string;
  salesOpenTime?: string;
  drawCloseTime?: string;
  isActive?: boolean;
}

export async function updateDrawSlot(id: number, input: UpdateDrawSlotInput, actorId: number) {
  const existing = await prisma.drawSlot.findUnique({ where: { id } });
  if (!existing) throw ApiError.notFound('Draw slot not found');

  const slot = await prisma.drawSlot.update({
    where: { id },
    data: {
      name: input.name,
      salesOpenTime: input.salesOpenTime ? timeStringToDate(input.salesOpenTime) : undefined,
      drawCloseTime: input.drawCloseTime ? timeStringToDate(input.drawCloseTime) : undefined,
      isActive: input.isActive,
    },
  });
  const status = computeLiveStatus(slot);
  const updated = await prisma.drawSlot.update({ where: { id }, data: { status } });
  await logActivity(prisma, { actorId, action: 'DRAW_SLOT_UPDATE', entityType: 'DrawSlot', entityId: id });
  return present(updated);
}

export async function deleteDrawSlot(id: number, actorId: number) {
  const usageCount = await prisma.ticketBatch.count({ where: { drawSlotId: id } });
  if (usageCount > 0) throw ApiError.conflict('Cannot delete a draw slot that already has ticket batches');

  await prisma.drawSlot.delete({ where: { id } });
  await logActivity(prisma, { actorId, action: 'DRAW_SLOT_DELETE', entityType: 'DrawSlot', entityId: id });
}

/** Called by the minute-tick cron job to persist today's recomputed status for every active-template slot. */
export async function refreshAllSlotStatuses() {
  const slots = await prisma.drawSlot.findMany();
  await Promise.all(
    slots.map((slot) => {
      const status = computeLiveStatus(slot);
      if (status === slot.status) return null;
      return prisma.drawSlot.update({ where: { id: slot.id }, data: { status } });
    }),
  );
}
