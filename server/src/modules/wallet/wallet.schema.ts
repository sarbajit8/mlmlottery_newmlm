import { z } from 'zod';

export const createWithdrawalSchema = z.object({
  amount: z.coerce.number().positive(),
});

export const processWithdrawalSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED', 'PAID']),
});

export const listWithdrawalsQuerySchema = z.object({
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'PAID']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const exportWithdrawalsQuerySchema = z.object({
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'PAID']).optional(),
});

export const listTransactionsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const idParamSchema = z.object({ id: z.coerce.number().int().positive() });

export const createDepositSchema = z.object({
  amount: z.coerce.number().positive(),
  transactionId: z.string().trim().min(4).max(100),
  paymentMethodId: z.coerce.number().int().positive().optional(),
});

export const processDepositSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED']),
});

export const listDepositsQuerySchema = z.object({
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const adminCreditSchema = z.object({
  userId: z.coerce.number().int().positive(),
  amount: z.coerce.number().positive(),
  note: z.string().trim().min(1).max(500).optional(),
});

export const adminDebitSchema = z.object({
  userId: z.coerce.number().int().positive(),
  amount: z.coerce.number().positive(),
  note: z.string().trim().min(1).max(500).optional(),
});

export const transferBalanceSchema = z.object({
  toReferralCode: z.string().trim().min(3),
  amount: z.coerce.number().positive(),
});
