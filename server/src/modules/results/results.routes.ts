import { Router } from 'express';
import { asyncHandler } from '../../lib/asyncHandler.js';
import { validate } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/requireRole.js';
import { declareResultSchema, idParamSchema, listResultsQuerySchema, listWinnersQuerySchema, randomTicketQuerySchema } from './results.schema.js';
import { declareHandler, deleteHandler, getHandler, listHandler, listWinnersHandler, randomTicketHandler, updateHandler } from './results.controller.js';

export const resultsRouter = Router();

resultsRouter.use(requireAuth);

const adminRoles = ['SUPER_ADMIN'] as const;

resultsRouter.get('/random-ticket', requireRole(...adminRoles), validate({ query: randomTicketQuerySchema }), asyncHandler(randomTicketHandler));
resultsRouter.get('/winners', validate({ query: listWinnersQuerySchema }), asyncHandler(listWinnersHandler));

// Reading declared results is open to any authenticated role (agents see them on their Results
// page); only declaring/editing/deleting is admin-only.
resultsRouter.get('/', validate({ query: listResultsQuerySchema }), asyncHandler(listHandler));
resultsRouter.get('/:id', validate({ params: idParamSchema }), asyncHandler(getHandler));
resultsRouter.post('/', requireRole(...adminRoles), validate({ body: declareResultSchema }), asyncHandler(declareHandler));
resultsRouter.put('/:id', requireRole(...adminRoles), validate({ params: idParamSchema, body: declareResultSchema }), asyncHandler(updateHandler));
resultsRouter.delete('/:id', requireRole(...adminRoles), validate({ params: idParamSchema }), asyncHandler(deleteHandler));
