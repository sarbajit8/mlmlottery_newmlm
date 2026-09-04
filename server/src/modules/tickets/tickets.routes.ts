import { Router } from 'express';
import { asyncHandler } from '../../lib/asyncHandler.js';
import { validate } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/requireRole.js';
import {
  batchTicketsQuerySchema,
  generateTicketsBodySchema,
  idParamSchema,
  listBatchesQuerySchema,
  previewTicketsBodySchema,
  ticketSearchQuerySchema,
} from './tickets.schema.js';
import {
  exportBatchHandler,
  generateHandler,
  getBatchHandler,
  getBatchTicketsHandler,
  listBatchesHandler,
  lockBatchHandler,
  previewHandler,
  searchHandler,
  summaryHandler,
} from './tickets.controller.js';

export const ticketsRouter = Router();

ticketsRouter.use(requireAuth);

const adminRoles = ['SUPER_ADMIN'] as const;

ticketsRouter.post('/preview', requireRole(...adminRoles), validate({ body: previewTicketsBodySchema }), asyncHandler(previewHandler));
ticketsRouter.post('/generate', requireRole(...adminRoles), validate({ body: generateTicketsBodySchema }), asyncHandler(generateHandler));

ticketsRouter.get('/summary', requireRole(...adminRoles), asyncHandler(summaryHandler));
ticketsRouter.get('/batches', requireRole(...adminRoles), validate({ query: listBatchesQuerySchema }), asyncHandler(listBatchesHandler));
ticketsRouter.get('/batches/:id', requireRole(...adminRoles), validate({ params: idParamSchema }), asyncHandler(getBatchHandler));
ticketsRouter.get(
  '/batches/:id/tickets',
  requireRole(...adminRoles),
  validate({ params: idParamSchema, query: batchTicketsQuerySchema }),
  asyncHandler(getBatchTicketsHandler),
);
ticketsRouter.get('/batches/:id/export', requireRole(...adminRoles), validate({ params: idParamSchema }), asyncHandler(exportBatchHandler));
ticketsRouter.post('/batches/:id/lock', requireRole(...adminRoles), validate({ params: idParamSchema }), asyncHandler(lockBatchHandler));

// Agent-facing ticket search for the Sell Tickets flow (any authenticated role can sell)
ticketsRouter.get('/search', validate({ query: ticketSearchQuerySchema }), asyncHandler(searchHandler));
