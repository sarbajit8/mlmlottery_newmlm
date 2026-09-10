import { z } from 'zod';
import { MAX_CART_SIZE } from '../../config/constants.js';

export const createSaleSchema = z.object({
  ticketIds: z.array(z.number().int().positive()).min(1).max(MAX_CART_SIZE),
  customer: z.object({
    name: z.string().min(2),
    mobile: z.string().min(6),
    whatsapp: z.string().optional(),
    email: z.preprocess((v) => (v === '' ? undefined : v), z.string().email().optional()),
  }),
});

export const listSalesQuerySchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  agentId: z.coerce.number().int().positive().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const salesReportQuerySchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  agentId: z.coerce.number().int().positive().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
});

export const idParamSchema = z.object({ id: z.coerce.number().int().positive() });
