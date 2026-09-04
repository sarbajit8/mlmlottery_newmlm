import { z } from 'zod';

export const createSeriesSchema = z.object({
  name: z.string().min(1),
  multiplier: z.coerce.number().positive(),
  status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
});

export const updateSeriesSchema = z.object({
  name: z.string().min(1).optional(),
  multiplier: z.coerce.number().positive().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
});

export const idParamSchema = z.object({ id: z.coerce.number().int().positive() });
