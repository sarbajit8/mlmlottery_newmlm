import { z } from 'zod';

const timeString = z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, 'Expected HH:mm or HH:mm:ss');

export const createDrawSlotSchema = z
  .object({
    name: z.string().min(2),
    salesOpenTime: timeString,
    drawCloseTime: timeString,
    isActive: z.boolean().default(true),
  })
  .refine((v) => v.salesOpenTime < v.drawCloseTime, {
    message: 'Sales open time must be before draw/close time',
    path: ['drawCloseTime'],
  });

export const updateDrawSlotSchema = z.object({
  name: z.string().min(2).optional(),
  salesOpenTime: timeString.optional(),
  drawCloseTime: timeString.optional(),
  isActive: z.boolean().optional(),
});

export const idParamSchema = z.object({ id: z.coerce.number().int().positive() });
