import type { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { ApiError } from '../../lib/apiError.js';
import { logActivity } from '../../middleware/auditLog.js';

const bankFieldsSelect = {
  bankAccountHolder: true,
  bankAccountNumber: true,
  bankIfsc: true,
  bankName: true,
  upiId: true,
} satisfies Prisma.UserSelect;

export interface BankDetailsInput {
  bankAccountHolder: string;
  bankAccountNumber: string;
  bankIfsc: string;
  bankName?: string;
  upiId?: string;
}

/** Current live bank details plus any pending change request, so the UI can show both at once. */
export async function getMyBankDetails(userId: number) {
  const [user, pendingRequest] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: bankFieldsSelect }),
    prisma.bankDetailsRequest.findFirst({ where: { userId, status: 'PENDING' }, orderBy: { requestedAt: 'desc' } }),
  ]);
  if (!user) throw ApiError.notFound('User not found');

  const isComplete = Boolean(user.bankAccountNumber);
  return { ...user, isComplete, pendingRequest };
}

/** First-ever submission (no bank details on file yet) applies immediately — nothing to protect.
 *  Any change after that goes through admin approval instead of touching the live record directly. */
export async function submitBankDetails(userId: number, input: BankDetailsInput) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { bankAccountNumber: true } });
  if (!user) throw ApiError.notFound('User not found');

  if (!user.bankAccountNumber) {
    const updated = await prisma.user.update({ where: { id: userId }, data: input, select: bankFieldsSelect });
    await logActivity(prisma, { actorId: userId, action: 'BANK_DETAILS_SET', entityType: 'User', entityId: userId });
    return { applied: true as const, ...updated, isComplete: true, pendingRequest: null };
  }

  const existingPending = await prisma.bankDetailsRequest.findFirst({ where: { userId, status: 'PENDING' } });
  if (existingPending) {
    throw ApiError.conflict('You already have a bank details change pending admin approval.');
  }

  const request = await prisma.bankDetailsRequest.create({ data: { userId, ...input, status: 'PENDING' } });
  await logActivity(prisma, { actorId: userId, action: 'BANK_DETAILS_REQUEST', entityType: 'BankDetailsRequest', entityId: request.id });

  const current = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: bankFieldsSelect });
  return { applied: false as const, ...current, isComplete: true, pendingRequest: request };
}

export interface ListBankDetailsQuery {
  status?: 'PENDING' | 'APPROVED' | 'REJECTED';
  page: number;
  pageSize: number;
}

export async function listBankDetailsRequests(query: ListBankDetailsQuery) {
  const where: Prisma.BankDetailsRequestWhereInput = { status: query.status };
  const [items, total] = await Promise.all([
    prisma.bankDetailsRequest.findMany({
      where,
      orderBy: { requestedAt: 'desc' },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      include: { user: { select: { id: true, name: true, referralCode: true, ...bankFieldsSelect } } },
    }),
    prisma.bankDetailsRequest.count({ where }),
  ]);
  return { items, total, page: query.page, pageSize: query.pageSize };
}

export async function processBankDetailsRequest(id: number, status: 'APPROVED' | 'REJECTED', actorId: number, rejectionReason?: string) {
  return prisma.$transaction(async (tx) => {
    const request = await tx.bankDetailsRequest.findUnique({ where: { id } });
    if (!request) throw ApiError.notFound('Bank details request not found');
    if (request.status !== 'PENDING') {
      throw ApiError.conflict(`This request has already been ${request.status.toLowerCase()}`);
    }

    if (status === 'APPROVED') {
      await tx.user.update({
        where: { id: request.userId },
        data: {
          bankAccountHolder: request.bankAccountHolder,
          bankAccountNumber: request.bankAccountNumber,
          bankIfsc: request.bankIfsc,
          bankName: request.bankName,
          upiId: request.upiId,
        },
      });
    }

    const updated = await tx.bankDetailsRequest.update({
      where: { id },
      data: { status, rejectionReason: status === 'REJECTED' ? rejectionReason : null, processedAt: new Date(), processedById: actorId },
    });

    await logActivity(tx, { actorId, action: 'BANK_DETAILS_PROCESS', entityType: 'BankDetailsRequest', entityId: id, metadata: { status } });
    return updated;
  });
}
