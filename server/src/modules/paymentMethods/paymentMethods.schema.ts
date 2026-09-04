import { z } from 'zod';

export const createPaymentMethodSchema = z.object({
  label: z.string().min(2).max(60),
  upiId: z.string().min(3).max(100),
  qrImage: z.string().min(10),
  isActive: z.boolean().optional().default(false),
});

export const updatePaymentMethodSchema = z.object({
  label: z.string().min(2).max(60).optional(),
  upiId: z.string().min(3).max(100).optional(),
  qrImage: z.string().min(10).optional(),
});

export const idParamSchema = z.object({ id: z.coerce.number().int().positive() });
