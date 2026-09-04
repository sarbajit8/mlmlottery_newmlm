import { z } from 'zod';

export const listActivityQuerySchema = z.object({
  actorId: z.coerce.number().int().positive().optional(),
  entityType: z.string().optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(30),
});

export const upsertAppSettingSchema = z.object({
  value: z.unknown(),
});
