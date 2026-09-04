import { Router } from 'express';
import { asyncHandler } from '../../lib/asyncHandler.js';
import { validate } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/requireRole.js';
import { listActivityQuerySchema, upsertAppSettingSchema } from './system.schema.js';
import {
  listActivityHandler,
  listAppSettingsHandler,
  logoImageHandler,
  publicSettingsHandler,
  rolesReferenceHandler,
  upsertAppSettingHandler,
} from './system.controller.js';

export const systemRouter = Router();

// Public — no auth. Read by the landing/login/join pages and every printed ticket, before login.
systemRouter.get('/public-settings', asyncHandler(publicSettingsHandler));
// Public — a real fetchable URL for the logo (crawlers can't use the data: URI the SPA renders).
systemRouter.get('/logo', asyncHandler(logoImageHandler));

systemRouter.use(requireAuth);

const adminRoles = ['SUPER_ADMIN'] as const;

systemRouter.get('/activity-logs', requireRole(...adminRoles), validate({ query: listActivityQuerySchema }), asyncHandler(listActivityHandler));
systemRouter.get('/roles', requireRole(...adminRoles), asyncHandler(rolesReferenceHandler));
systemRouter.get('/settings', requireRole(...adminRoles), asyncHandler(listAppSettingsHandler));
systemRouter.put(
  '/settings/:key',
  requireRole('SUPER_ADMIN'),
  validate({ body: upsertAppSettingSchema }),
  asyncHandler(upsertAppSettingHandler),
);
