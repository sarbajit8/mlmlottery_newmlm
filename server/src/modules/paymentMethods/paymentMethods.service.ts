import { prisma } from '../../lib/prisma.js';
import { ApiError } from '../../lib/apiError.js';
import { logActivity } from '../../middleware/auditLog.js';

export async function listPaymentMethods() {
  return prisma.paymentMethod.findMany({
    orderBy: { createdAt: 'desc' },
    include: { createdBy: { select: { id: true, name: true } } },
  });
}

export async function getActivePaymentMethod() {
  const method = await prisma.paymentMethod.findFirst({ where: { isActive: true } });
  if (!method) throw ApiError.notFound('No active payment method is configured. Please contact admin.');
  return method;
}

export interface CreatePaymentMethodInput {
  label: string;
  upiId: string;
  qrImage: string;
  isActive?: boolean;
}

/** First payment method ever added is auto-activated so agents always have somewhere to pay. */
export async function createPaymentMethod(input: CreatePaymentMethodInput, actorId: number) {
  const created = await prisma.$transaction(async (tx) => {
    const activeCount = await tx.paymentMethod.count({ where: { isActive: true } });
    const shouldActivate = Boolean(input.isActive) || activeCount === 0;
    if (shouldActivate) {
      await tx.paymentMethod.updateMany({ where: { isActive: true }, data: { isActive: false } });
    }
    return tx.paymentMethod.create({
      data: { label: input.label, upiId: input.upiId, qrImage: input.qrImage, isActive: shouldActivate, createdById: actorId },
    });
  });

  await logActivity(prisma, { actorId, action: 'PAYMENT_METHOD_CREATE', entityType: 'PaymentMethod', entityId: created.id });
  return created;
}

export interface UpdatePaymentMethodInput {
  label?: string;
  upiId?: string;
  qrImage?: string;
}

export async function updatePaymentMethod(id: number, input: UpdatePaymentMethodInput, actorId: number) {
  const existing = await prisma.paymentMethod.findUnique({ where: { id } });
  if (!existing) throw ApiError.notFound('Payment method not found');

  const updated = await prisma.paymentMethod.update({
    where: { id },
    data: { label: input.label, upiId: input.upiId, qrImage: input.qrImage },
  });
  await logActivity(prisma, { actorId, action: 'PAYMENT_METHOD_UPDATE', entityType: 'PaymentMethod', entityId: id });
  return updated;
}

/** Only one payment method may be active at a time — activating one deactivates all others. */
export async function activatePaymentMethod(id: number, actorId: number) {
  const existing = await prisma.paymentMethod.findUnique({ where: { id } });
  if (!existing) throw ApiError.notFound('Payment method not found');

  const [, activated] = await prisma.$transaction([
    prisma.paymentMethod.updateMany({ where: { id: { not: id } }, data: { isActive: false } }),
    prisma.paymentMethod.update({ where: { id }, data: { isActive: true } }),
  ]);
  await logActivity(prisma, { actorId, action: 'PAYMENT_METHOD_ACTIVATE', entityType: 'PaymentMethod', entityId: id });
  return activated;
}

export async function deletePaymentMethod(id: number, actorId: number) {
  const usageCount = await prisma.receipt.count({ where: { paymentMethodId: id } });
  if (usageCount > 0) throw ApiError.conflict('Cannot delete a payment method that has already been used for sales');

  await prisma.paymentMethod.delete({ where: { id } });
  await logActivity(prisma, { actorId, action: 'PAYMENT_METHOD_DELETE', entityType: 'PaymentMethod', entityId: id });
}
