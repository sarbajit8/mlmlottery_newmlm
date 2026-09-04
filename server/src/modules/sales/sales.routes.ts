import { Router } from 'express';
import { asyncHandler } from '../../lib/asyncHandler.js';
import { validate } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/auth.js';
import { createSaleSchema, idParamSchema, listSalesQuerySchema } from './sales.schema.js';
import { createSaleHandler, getReceiptHandler, listSalesHandler } from './sales.controller.js';

export const salesRouter = Router();

salesRouter.use(requireAuth);

salesRouter.post('/', validate({ body: createSaleSchema }), asyncHandler(createSaleHandler));
salesRouter.get('/', validate({ query: listSalesQuerySchema }), asyncHandler(listSalesHandler));
salesRouter.get('/:id', validate({ params: idParamSchema }), asyncHandler(getReceiptHandler));
