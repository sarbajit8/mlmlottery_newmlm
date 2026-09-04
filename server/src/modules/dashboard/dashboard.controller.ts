import type { Request, Response } from 'express';
import * as service from './dashboard.service.js';
import { ApiError } from '../../lib/apiError.js';

export async function adminDashboardHandler(_req: Request, res: Response) {
  res.json(await service.getAdminDashboard());
}

export async function agentDashboardHandler(req: Request, res: Response) {
  if (!req.user) throw ApiError.unauthorized();
  res.json(await service.getAgentDashboard(req.user.id));
}
