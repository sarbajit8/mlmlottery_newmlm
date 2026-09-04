import { Router } from 'express';
import { asyncHandler } from '../../lib/asyncHandler.js';
import { validate } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/requireRole.js';
import { createPaymentMethodSchema, idParamSchema, updatePaymentMethodSchema } from './paymentMethods.schema.js';
import {
  activateHandler,
  createHandler,
  deleteHandler,
  getActiveHandler,
  listHandler,
  updateHandler,
} from './paymentMethods.controller.js';

export const paymentMethodsRouter = Router();

paymentMethodsRouter.use(requireAuth);

// Any authenticated agent needs the active method to pay before a sale — not admin-gated.
paymentMethodsRouter.get('/active', asyncHandler(getActiveHandler));

const adminRoles = ['SUPER_ADMIN'] as const;

paymentMethodsRouter.get('/', requireRole(...adminRoles), asyncHandler(listHandler));
paymentMethodsRouter.post('/', requireRole(...adminRoles), validate({ body: createPaymentMethodSchema }), asyncHandler(createHandler));
paymentMethodsRouter.put(
  '/:id',
  requireRole(...adminRoles),
  validate({ params: idParamSchema, body: updatePaymentMethodSchema }),
  asyncHandler(updateHandler),
);
paymentMethodsRouter.put('/:id/activate', requireRole(...adminRoles), validate({ params: idParamSchema }), asyncHandler(activateHandler));
paymentMethodsRouter.delete('/:id', requireRole(...adminRoles), validate({ params: idParamSchema }), asyncHandler(deleteHandler));
