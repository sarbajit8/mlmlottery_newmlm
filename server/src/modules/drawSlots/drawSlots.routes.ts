import { Router } from 'express';
import { asyncHandler } from '../../lib/asyncHandler.js';
import { validate } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/requireRole.js';
import { createDrawSlotSchema, idParamSchema, updateDrawSlotSchema } from './drawSlots.schema.js';
import { createHandler, deleteHandler, getHandler, listHandler, updateHandler } from './drawSlots.controller.js';

export const drawSlotsRouter = Router();

drawSlotsRouter.use(requireAuth);

drawSlotsRouter.get('/', asyncHandler(listHandler));
drawSlotsRouter.get('/:id', validate({ params: idParamSchema }), asyncHandler(getHandler));

const adminRoles = ['SUPER_ADMIN'] as const;
drawSlotsRouter.post('/', requireRole(...adminRoles), validate({ body: createDrawSlotSchema }), asyncHandler(createHandler));
drawSlotsRouter.put(
  '/:id',
  requireRole(...adminRoles),
  validate({ params: idParamSchema, body: updateDrawSlotSchema }),
  asyncHandler(updateHandler),
);
drawSlotsRouter.delete('/:id', requireRole(...adminRoles), validate({ params: idParamSchema }), asyncHandler(deleteHandler));
