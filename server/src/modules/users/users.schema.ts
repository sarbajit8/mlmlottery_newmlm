import { z } from 'zod';

export const roleEnum = z.enum(['SUPER_ADMIN', 'AGENT']);
export const userStatusEnum = z.enum(['ACTIVE', 'INACTIVE', 'PENDING_KYC']);

export const listUsersQuerySchema = z.object({
  role: roleEnum.optional(),
  status: userStatusEnum.optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  // Capped higher than other list endpoints: the admin agent-picker (wallet credit/debit modals)
  // requests pageSize=200 to populate a single <select> with every agent in one page.
  pageSize: z.coerce.number().int().min(1).max(500).default(20),
});

// Admin only ever creates Agents directly; sponsorId defaults to the Super Admin when omitted.
export const createUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  mobile: z.string().min(6),
  whatsapp: z.string().optional(),
  password: z.string().min(6),
  sponsorId: z.number().int().positive().optional().nullable(),
  autoApprove: z.boolean().default(true),
});

export const registerAgentSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  mobile: z.string().min(6),
  whatsapp: z.string().optional(),
  password: z.string().min(6),
  referralCode: z.string().min(3).optional(), // used on public signup
  kycDocUrl: z.string().url().optional(),
});

export const updateStatusSchema = z.object({
  status: userStatusEnum,
});

export const setPasswordSchema = z.object({
  password: z.string().min(6),
});

export const idParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});
