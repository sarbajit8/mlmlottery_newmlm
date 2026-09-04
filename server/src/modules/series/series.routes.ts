import { Router } from 'express';
import { asyncHandler } from '../../lib/asyncHandler.js';
import { validate } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/requireRole.js';
import { createSeriesSchema, idParamSchema, updateSeriesSchema } from './series.schema.js';
import { createHandler, deleteHandler, getHandler, listHandler, updateHandler } from './series.controller.js';

export const seriesRouter = Router();

seriesRouter.use(requireAuth);

seriesRouter.get('/', asyncHandler(listHandler));
seriesRouter.get('/:id', validate({ params: idParamSchema }), asyncHandler(getHandler));

const adminRoles = ['SUPER_ADMIN'] as const;
seriesRouter.post('/', requireRole(...adminRoles), validate({ body: createSeriesSchema }), asyncHandler(createHandler));
seriesRouter.put(
  '/:id',
  requireRole(...adminRoles),
  validate({ params: idParamSchema, body: updateSeriesSchema }),
  asyncHandler(updateHandler),
);
seriesRouter.delete('/:id', requireRole(...adminRoles), validate({ params: idParamSchema }), asyncHandler(deleteHandler));
