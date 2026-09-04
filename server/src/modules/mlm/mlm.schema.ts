import { z } from 'zod';

export const levelPercentageSchema = z.object({
  levelNumber: z.number().int().min(1),
  percentage: z.coerce.number().min(0).max(100),
});

export const updateMlmSettingsSchema = z.object({
  maxLevels: z.number().int().min(1).max(20),
  commissionBase: z.enum(['SEM_VALUE', 'PRICE', 'FLAT']).default('SEM_VALUE'),
  flatAmount: z.coerce.number().min(0).optional(),
  payoutMode: z.enum(['INSTANT', 'BATCH']).default('INSTANT'),
  minPayoutThreshold: z.coerce.number().min(0).default(0),
  shortfallPolicy: z.enum(['FORFEIT', 'ROLLUP_TO_ADMIN']).default('ROLLUP_TO_ADMIN'),
  levelPercentages: z.array(levelPercentageSchema).min(1),
});

export const recruitAgentSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  mobile: z.string().min(6),
  whatsapp: z.string().optional(),
  password: z.string().min(6),
});

export const userIdParamSchema = z.object({ userId: z.coerce.number().int().positive() });

export const commissionReportQuerySchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  level: z.coerce.number().int().min(1).optional(),
  agentId: z.coerce.number().int().positive().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
});
