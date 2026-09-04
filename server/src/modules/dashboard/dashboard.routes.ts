import { Router } from 'express';
import { asyncHandler } from '../../lib/asyncHandler.js';
import { requireAuth } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/requireRole.js';
import { adminDashboardHandler, agentDashboardHandler } from './dashboard.controller.js';

export const dashboardRouter = Router();

dashboardRouter.use(requireAuth);

dashboardRouter.get('/admin', requireRole('SUPER_ADMIN'), asyncHandler(adminDashboardHandler));
dashboardRouter.get('/agent', asyncHandler(agentDashboardHandler));
