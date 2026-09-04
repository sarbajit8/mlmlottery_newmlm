import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { ApiError } from '../../lib/apiError.js';
import { logActivity } from '../../middleware/auditLog.js';
import { round2 } from '../../lib/money.js';
import { getWalletRules } from '../system/system.service.js';

/** Throws if `amount` doesn't satisfy the admin-configured minimum/step for a wallet operation. */
function assertAmountRule(amount: Prisma.Decimal, min: number, multipleOf: number, label: string) {
  if (amount.lt(min)) {
    throw ApiError.badRequest(`Minimum ${label} amount is ${min}`);
  }
  if (multipleOf > 0 && !amount.modulo(multipleOf).equals(0)) {
    throw ApiError.badRequest(`${label[0].toUpperCase()}${label.slice(1)} amount must be a multiple of ${multipleOf}`);
  }
}

export async function getWallet(userId: number) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { walletBalance: true } });
  if (!user) throw ApiError.notFound('User not found');
  return { balance: user.walletBalance };
}

export interface ListQuery {
  page: number;
  pageSize: number;
}

export async function listTransactions(userId: number, query: ListQuery) {
  const where = { userId };
  const [items, total] = await Promise.all([
    prisma.walletTransaction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
    prisma.walletTransaction.count({ where }),
  ]);
  return { items, total, page: query.page, pageSize: query.pageSize };
}

/** Debit-on-request: immediately reserves the funds so two concurrent requests can't jointly
 *  overdraw. A platform fee (admin-configured %) is taken out of the requested amount and credited
 *  to the company wallet right away too — the agent's net payout (handled outside the app, e.g. bank
 *  transfer) is amount - feeAmount. */
export async function requestWithdrawal(userId: number, amountInput: number) {
  const rules = await getWalletRules();
  const amount = round2(amountInput);
  assertAmountRule(amount, rules.withdrawalMinAmount, rules.withdrawalMultipleOf, 'withdrawal');
  const feeAmount = round2(amount.times(rules.withdrawalFeePercent).dividedBy(100));

  return prisma.$transaction(async (tx) => {
    const updateResult = await tx.user.updateMany({
      where: { id: userId, walletBalance: { gte: amount } },
      data: { walletBalance: { decrement: amount } },
    });
    if (updateResult.count !== 1) {
      throw ApiError.badRequest('Insufficient wallet balance for this withdrawal amount');
    }

    const updatedUser = await tx.user.findUniqueOrThrow({ where: { id: userId }, select: { walletBalance: true } });

    const withdrawal = await tx.withdrawalRequest.create({ data: { userId, amount, feeAmount, status: 'PENDING' } });

    await tx.walletTransaction.create({
      data: {
        userId,
        type: 'WITHDRAWAL',
        amount: amount.negated(),
        balanceAfter: updatedUser.walletBalance,
        refId: `WDR-${withdrawal.id}`,
        status: 'PENDING',
      },
    });

    if (feeAmount.gt(0)) {
      const companyWallet = await tx.user.findFirst({ where: { isCompanyWallet: true }, select: { id: true } });
      if (companyWallet) {
        const creditedCompany = await tx.user.update({ where: { id: companyWallet.id }, data: { walletBalance: { increment: feeAmount } } });
        await tx.walletTransaction.create({
          data: {
            userId: companyWallet.id,
            type: 'FEE',
            amount: feeAmount,
            balanceAfter: creditedCompany.walletBalance,
            refId: `WDR-${withdrawal.id}-FEE`,
            status: 'COMPLETED',
          },
        });
      }
    }

    await logActivity(tx, { actorId: userId, action: 'WITHDRAWAL_REQUEST', entityType: 'WithdrawalRequest', entityId: withdrawal.id, metadata: { amount: amount.toString(), feeAmount: feeAmount.toString() } });
    return withdrawal;
  });
}

export interface ListWithdrawalsQuery {
  status?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'PAID';
  page: number;
  pageSize: number;
}

export async function listWithdrawals(query: ListWithdrawalsQuery, scopedUserId?: number) {
  const where: Prisma.WithdrawalRequestWhereInput = { status: query.status, userId: scopedUserId };
  const [items, total] = await Promise.all([
    prisma.withdrawalRequest.findMany({
      where,
      orderBy: { requestedAt: 'desc' },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      include: { user: { select: { id: true, name: true, referralCode: true } } },
    }),
    prisma.withdrawalRequest.count({ where }),
  ]);
  return { items, total, page: query.page, pageSize: query.pageSize };
}

export async function processWithdrawal(id: number, status: 'APPROVED' | 'REJECTED' | 'PAID', actorId: number) {
  return prisma.$transaction(async (tx) => {
    const withdrawal = await tx.withdrawalRequest.findUnique({ where: { id } });
    if (!withdrawal) throw ApiError.notFound('Withdrawal request not found');

    const validTransitions: Record<string, string[]> = {
      PENDING: ['APPROVED', 'REJECTED'],
      APPROVED: ['PAID', 'REJECTED'],
    };
    if (!validTransitions[withdrawal.status]?.includes(status)) {
      throw ApiError.conflict(`Cannot move a ${withdrawal.status} withdrawal to ${status}`);
    }

    if (status === 'REJECTED') {
      const updatedUser = await tx.user.update({
        where: { id: withdrawal.userId },
        data: { walletBalance: { increment: withdrawal.amount } },
      });
      await tx.walletTransaction.create({
        data: {
          userId: withdrawal.userId,
          type: 'WITHDRAWAL',
          amount: withdrawal.amount,
          balanceAfter: updatedUser.walletBalance,
          refId: `WDR-${withdrawal.id}-REVERSED`,
          status: 'REVERSED',
        },
      });

      if (withdrawal.feeAmount.gt(0)) {
        const companyWallet = await tx.user.findFirst({ where: { isCompanyWallet: true }, select: { id: true } });
        if (companyWallet) {
          const debitedCompany = await tx.user.update({ where: { id: companyWallet.id }, data: { walletBalance: { decrement: withdrawal.feeAmount } } });
          await tx.walletTransaction.create({
            data: {
              userId: companyWallet.id,
              type: 'FEE',
              amount: withdrawal.feeAmount.negated(),
              balanceAfter: debitedCompany.walletBalance,
              refId: `WDR-${withdrawal.id}-FEE-REVERSED`,
              status: 'REVERSED',
            },
          });
        }
      }
    }

    const updated = await tx.withdrawalRequest.update({
      where: { id },
      data: { status, processedAt: new Date(), processedById: actorId },
    });

    await logActivity(tx, { actorId, action: 'WITHDRAWAL_PROCESS', entityType: 'WithdrawalRequest', entityId: id, metadata: { status } });
    return updated;
  });
}

/** Self-service top-up: agent pays the admin's UPI out-of-band and submits proof here. The wallet
 *  is credited only once an admin approves it — unlike a withdrawal, nothing is reserved up front. */
export async function requestDeposit(userId: number, input: { amount: number; transactionId: string; paymentMethodId?: number }) {
  const amount = round2(input.amount);
  const transactionId = input.transactionId.trim();

  const existing = await prisma.depositRequest.findUnique({ where: { transactionId } });
  if (existing) throw ApiError.conflict('This transaction ID has already been used for another deposit request.');

  const deposit = await prisma.depositRequest.create({
    data: { userId, amount, transactionId, paymentMethodId: input.paymentMethodId, status: 'PENDING' },
  });
  await logActivity(prisma, { actorId: userId, action: 'DEPOSIT_REQUEST', entityType: 'DepositRequest', entityId: deposit.id });
  return deposit;
}

export interface ListDepositsQuery {
  status?: 'PENDING' | 'APPROVED' | 'REJECTED';
  page: number;
  pageSize: number;
}

export async function listDeposits(query: ListDepositsQuery, scopedUserId?: number) {
  const where: Prisma.DepositRequestWhereInput = { status: query.status, userId: scopedUserId };
  const [items, total] = await Promise.all([
    prisma.depositRequest.findMany({
      where,
      orderBy: { requestedAt: 'desc' },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      include: { user: { select: { id: true, name: true, referralCode: true } }, paymentMethod: { select: { id: true, label: true } } },
    }),
    prisma.depositRequest.count({ where }),
  ]);
  return { items, total, page: query.page, pageSize: query.pageSize };
}

export async function processDeposit(id: number, status: 'APPROVED' | 'REJECTED', actorId: number) {
  return prisma.$transaction(async (tx) => {
    const deposit = await tx.depositRequest.findUnique({ where: { id } });
    if (!deposit) throw ApiError.notFound('Deposit request not found');
    if (deposit.status !== 'PENDING') {
      throw ApiError.conflict(`This deposit request has already been ${deposit.status.toLowerCase()}`);
    }

    if (status === 'APPROVED') {
      const updatedUser = await tx.user.update({
        where: { id: deposit.userId },
        data: { walletBalance: { increment: deposit.amount } },
      });
      await tx.walletTransaction.create({
        data: {
          userId: deposit.userId,
          type: 'DEPOSIT',
          amount: deposit.amount,
          balanceAfter: updatedUser.walletBalance,
          refId: `DEP-${deposit.id}`,
          status: 'COMPLETED',
        },
      });
    }

    const updated = await tx.depositRequest.update({
      where: { id },
      data: { status, processedAt: new Date(), processedById: actorId },
    });

    await logActivity(tx, { actorId, action: 'DEPOSIT_PROCESS', entityType: 'DepositRequest', entityId: id, metadata: { status } });
    return updated;
  });
}

/** Admin credits a wallet directly — no request/approval step — e.g. for cash received in person.
 *  Recorded as an already-approved DepositRequest so it shows up alongside self-service top-ups. */
export async function adminCreditWallet(input: { userId: number; amount: number; note?: string }, actorId: number) {
  const amount = round2(input.amount);

  return prisma.$transaction(async (tx) => {
    const target = await tx.user.findUnique({ where: { id: input.userId }, select: { id: true } });
    if (!target) throw ApiError.notFound('User not found');

    const updatedUser = await tx.user.update({
      where: { id: input.userId },
      data: { walletBalance: { increment: amount } },
    });

    const deposit = await tx.depositRequest.create({
      data: {
        userId: input.userId,
        amount,
        note: input.note,
        status: 'APPROVED',
        processedAt: new Date(),
        processedById: actorId,
      },
    });

    await tx.walletTransaction.create({
      data: {
        userId: input.userId,
        type: 'DEPOSIT',
        amount,
        balanceAfter: updatedUser.walletBalance,
        refId: `DEP-${deposit.id}`,
        status: 'COMPLETED',
      },
    });

    await logActivity(tx, { actorId, action: 'WALLET_ADMIN_CREDIT', entityType: 'User', entityId: input.userId, metadata: { amount: amount.toString() } });
    return deposit;
  });
}

/** Admin removes money from a wallet directly — e.g. correcting a mistake, a penalty, a chargeback.
 *  Won't push the balance negative; guarded the same way withdrawals/transfers are. Logged as an
 *  ADJUSTMENT wallet transaction (there's no request/approval table for this — it's the opposite of
 *  a deposit, not a variant of one). */
export async function adminDebitWallet(input: { userId: number; amount: number; note?: string }, actorId: number) {
  const amount = round2(input.amount);

  return prisma.$transaction(async (tx) => {
    const target = await tx.user.findUnique({ where: { id: input.userId }, select: { id: true } });
    if (!target) throw ApiError.notFound('User not found');

    const debitResult = await tx.user.updateMany({
      where: { id: input.userId, walletBalance: { gte: amount } },
      data: { walletBalance: { decrement: amount } },
    });
    if (debitResult.count !== 1) throw ApiError.badRequest('Cannot deduct more than the agent\'s current wallet balance');

    const updatedUser = await tx.user.findUniqueOrThrow({ where: { id: input.userId }, select: { walletBalance: true } });

    const txn = await tx.walletTransaction.create({
      data: {
        userId: input.userId,
        type: 'ADJUSTMENT',
        amount: amount.negated(),
        balanceAfter: updatedUser.walletBalance,
        refId: input.note ? `ADJ-${input.note.slice(0, 40)}` : 'ADJ-ADMIN-DEBIT',
        status: 'COMPLETED',
      },
    });

    await logActivity(tx, { actorId, action: 'WALLET_ADMIN_DEBIT', entityType: 'User', entityId: input.userId, metadata: { amount: amount.toString(), note: input.note } });
    return txn;
  });
}

/** Instant agent-to-agent wallet transfer, identified by the recipient's referral code — no
 *  approval step. Amount must clear the admin-configured minimum/step (see getWalletRules). */
export async function transferBalance(fromUserId: number, input: { toReferralCode: string; amount: number }) {
  const rules = await getWalletRules();
  const amount = round2(input.amount);
  assertAmountRule(amount, rules.transferMinAmount, rules.transferMultipleOf, 'transfer');

  return prisma.$transaction(async (tx) => {
    const recipient = await tx.user.findUnique({ where: { referralCode: input.toReferralCode.trim().toUpperCase() } });
    if (!recipient) throw ApiError.badRequest('No agent found with that referral code');
    if (recipient.role !== 'AGENT') throw ApiError.badRequest('You can only transfer to another agent');
    if (recipient.id === fromUserId) throw ApiError.badRequest('You cannot transfer to yourself');

    const debitResult = await tx.user.updateMany({
      where: { id: fromUserId, walletBalance: { gte: amount } },
      data: { walletBalance: { decrement: amount } },
    });
    if (debitResult.count !== 1) throw ApiError.badRequest('Insufficient wallet balance for this transfer');

    const sender = await tx.user.findUniqueOrThrow({ where: { id: fromUserId }, select: { walletBalance: true } });
    const creditedRecipient = await tx.user.update({ where: { id: recipient.id }, data: { walletBalance: { increment: amount } } });

    const transfer = await tx.walletTransfer.create({ data: { fromUserId, toUserId: recipient.id, amount } });

    await tx.walletTransaction.createMany({
      data: [
        { userId: fromUserId, type: 'TRANSFER', amount: amount.negated(), balanceAfter: sender.walletBalance, refId: `XFER-${transfer.id}`, status: 'COMPLETED' },
        { userId: recipient.id, type: 'TRANSFER', amount, balanceAfter: creditedRecipient.walletBalance, refId: `XFER-${transfer.id}`, status: 'COMPLETED' },
      ],
    });

    await logActivity(tx, { actorId: fromUserId, action: 'WALLET_TRANSFER', entityType: 'WalletTransfer', entityId: transfer.id, metadata: { toUserId: recipient.id, amount: amount.toString() } });

    return { ...transfer, toUser: { id: recipient.id, name: recipient.name, referralCode: recipient.referralCode } };
  });
}

export async function listTransfers(userId: number, query: ListQuery) {
  const where: Prisma.WalletTransferWhereInput = { OR: [{ fromUserId: userId }, { toUserId: userId }] };
  const [items, total] = await Promise.all([
    prisma.walletTransfer.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      include: {
        fromUser: { select: { id: true, name: true, referralCode: true } },
        toUser: { select: { id: true, name: true, referralCode: true } },
      },
    }),
    prisma.walletTransfer.count({ where }),
  ]);
  return { items, total, page: query.page, pageSize: query.pageSize };
}
