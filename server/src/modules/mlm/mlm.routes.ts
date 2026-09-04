import { Router } from 'express';
import { asyncHandler } from '../../lib/asyncHandler.js';
import { validate } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/requireRole.js';
import { commissionReportQuerySchema, recruitAgentSchema, updateMlmSettingsSchema, userIdParamSchema } from './mlm.schema.js';
import {
  getMyDownlineHandler,
  getMyTreeHandler,
  getSettingsHandler,
  getSettingsHistoryHandler,
  getTreeHandler,
  leaderboardHandler,
  listLedgerHandler,
  payoutReportHandler,
  recruitHandler,
  updateSettingsHandler,
} from './mlm.controller.js';

export const mlmRouter = Router();

mlmRouter.use(requireAuth);

const adminRoles = ['SUPER_ADMIN'] as const;

mlmRouter.get('/settings', asyncHandler(getSettingsHandler));
mlmRouter.get('/settings/history', requireRole(...adminRoles), asyncHandler(getSettingsHistoryHandler));
mlmRouter.put('/settings', requireRole(...adminRoles), validate({ body: updateMlmSettingsSchema }), asyncHandler(updateSettingsHandler));

mlmRouter.get('/tree/me', asyncHandler(getMyTreeHandler));
mlmRouter.get('/downline/me', asyncHandler(getMyDownlineHandler));
mlmRouter.get('/tree/:userId', requireRole(...adminRoles), validate({ params: userIdParamSchema }), asyncHandler(getTreeHandler));

mlmRouter.post('/recruit', validate({ body: recruitAgentSchema }), asyncHandler(recruitHandler));

mlmRouter.get('/commissions', validate({ query: commissionReportQuerySchema }), asyncHandler(listLedgerHandler));
mlmRouter.get('/commission-report', requireRole(...adminRoles), asyncHandler(payoutReportHandler));
mlmRouter.get('/leaderboard', asyncHandler(leaderboardHandler));
