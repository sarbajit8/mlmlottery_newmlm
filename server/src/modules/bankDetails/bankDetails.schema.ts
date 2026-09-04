import { z } from 'zod';

export const submitBankDetailsSchema = z.object({
  bankAccountHolder: z.string().trim().min(2).max(150),
  bankAccountNumber: z.string().trim().min(4).max(30),
  bankIfsc: z.string().trim().toUpperCase().min(2).max(20),
  bankName: z.string().trim().max(150).optional(),
  // Optional — not every agent has a UPI ID, and formats vary too much to validate strictly.
  upiId: z.preprocess((v) => (v === '' || v === undefined || v === null ? undefined : v), z.string().trim().toLowerCase().max(100).optional()),
});

export const processBankDetailsSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED']),
  rejectionReason: z.string().trim().max(500).optional(),
});

export const listBankDetailsQuerySchema = z.object({
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const idParamSchema = z.object({ id: z.coerce.number().int().positive() });
