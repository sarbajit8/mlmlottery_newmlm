import { z } from 'zod';
import { MAX_TICKET_GENERATION_QTY } from '../../config/constants.js';

export const generateTicketsBodySchema = z.object({
  drawSlotId: z.coerce.number().int().positive(),
  drawDate: z.coerce.date(),
  seriesId: z.coerce.number().int().positive(),
  prefix: z
    .string()
    .min(1)
    .max(10)
    .regex(/^[A-Za-z0-9]+$/, 'Prefix must be alphanumeric'),
  startNumber: z.coerce.number().int().min(0),
  quantity: z.coerce.number().int().min(1).max(MAX_TICKET_GENERATION_QTY),
  pricePerTicket: z.coerce.number().positive().optional(), // defaults to the admin ticket base price x series multiplier
});

export const previewTicketsBodySchema = generateTicketsBodySchema;

export const listBatchesQuerySchema = z.object({
  drawDate: z.coerce.date().optional(),
  drawSlotId: z.coerce.number().int().positive().optional(),
  status: z.enum(['OPEN', 'LOCKED']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const batchTicketsQuerySchema = z.object({
  status: z.enum(['AVAILABLE', 'SOLD', 'WINNER', 'CANCELLED']).optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(500).default(200),
});

export const ticketSearchQuerySchema = z.object({
  drawSlotId: z.coerce.number().int().positive(),
  drawDate: z.coerce.date(),
  seriesId: z.coerce.number().int().positive().optional(),
  q: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(60),
});

export const idParamSchema = z.object({ id: z.coerce.number().int().positive() });
