import { z } from 'zod';

export const sendMessageSchema = z.object({
  message: z.string().trim().min(1).max(2000),
  // Only meaningful (and required) when an admin sends — which agent's thread this reply goes to.
  agentId: z.coerce.number().int().positive().optional(),
});

export const listMessagesQuerySchema = z.object({
  agentId: z.coerce.number().int().positive().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
});

export const listThreadsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
