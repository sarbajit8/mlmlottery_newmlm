import { Router } from 'express';
import { asyncHandler } from '../../lib/asyncHandler.js';
import { validate } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/auth.js';
import { idParamSchema, listCustomersQuerySchema } from './customers.schema.js';
import { getHandler, listHandler, lookupHandler } from './customers.controller.js';

export const customersRouter = Router();

customersRouter.use(requireAuth);

customersRouter.get('/', validate({ query: listCustomersQuerySchema }), asyncHandler(listHandler));
customersRouter.get('/lookup', asyncHandler(lookupHandler));
customersRouter.get('/:id', validate({ params: idParamSchema }), asyncHandler(getHandler));
