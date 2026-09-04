import { Router } from 'express';
import { asyncHandler } from '../../lib/asyncHandler.js';
import { validate } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/requireRole.js';
import { idParamSchema, listBankDetailsQuerySchema, processBankDetailsSchema, submitBankDetailsSchema } from './bankDetails.schema.js';
import {
  getMyBankDetailsHandler,
  listBankDetailsRequestsHandler,
  processBankDetailsRequestHandler,
  submitBankDetailsHandler,
} from './bankDetails.controller.js';

export const bankDetailsRouter = Router();

bankDetailsRouter.use(requireAuth);

bankDetailsRouter.get('/me', asyncHandler(getMyBankDetailsHandler));
bankDetailsRouter.post('/me', validate({ body: submitBankDetailsSchema }), asyncHandler(submitBankDetailsHandler));

bankDetailsRouter.get('/requests', requireRole('SUPER_ADMIN'), validate({ query: listBankDetailsQuerySchema }), asyncHandler(listBankDetailsRequestsHandler));
bankDetailsRouter.put(
  '/requests/:id',
  requireRole('SUPER_ADMIN'),
  validate({ params: idParamSchema, body: processBankDetailsSchema }),
  asyncHandler(processBankDetailsRequestHandler),
);
