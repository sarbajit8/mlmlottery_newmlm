import type { Request, Response } from 'express';
import * as settingsService from './mlmSettings.service.js';
import * as treeService from './mlmTree.service.js';
import * as reportsService from './commissionReports.service.js';
import * as usersService from '../users/users.service.js';
import { ApiError } from '../../lib/apiError.js';

export async function getSettingsHandler(_req: Request, res: Response) {
  res.json(await settingsService.getActiveSettings());
}

export async function getSettingsHistoryHandler(_req: Request, res: Response) {
  res.json(await settingsService.getSettingsHistory());
}

export async function updateSettingsHandler(req: Request, res: Response) {
  if (!req.user) throw ApiError.unauthorized();
  res.json(await settingsService.updateSettings(req.body, req.user.id));
}

export async function getTreeHandler(req: Request, res: Response) {
  const { userId } = req.params as unknown as { userId: number };
  res.json(await treeService.getTree(userId));
}

export async function getMyTreeHandler(req: Request, res: Response) {
  if (!req.user) throw ApiError.unauthorized();
  res.json(await treeService.getTree(req.user.id));
}

export async function getMyDownlineHandler(req: Request, res: Response) {
  if (!req.user) throw ApiError.unauthorized();
  res.json(await treeService.getFlatDownline(req.user.id));
}

export async function recruitHandler(req: Request, res: Response) {
  if (!req.user) throw ApiError.unauthorized();
  // Sub-agents recruited by another agent are also auto-approved, same as public self-registration.
  const user = await usersService.registerAgent(req.body, req.user.id, true);
  res.status(201).json(user);
}

export async function listLedgerHandler(req: Request, res: Response) {
  if (!req.user) throw ApiError.unauthorized();
  const query = req.query as unknown as reportsService.LedgerQuery;
  const isAdmin = req.user.role === 'SUPER_ADMIN';
  const scopedAgentId = isAdmin ? undefined : req.user.id;
  res.json(await reportsService.listLedger(query, scopedAgentId));
}

export async function payoutReportHandler(req: Request, res: Response) {
  res.json(await reportsService.getPayoutReport(req.query as unknown as reportsService.ReportQuery));
}

export async function leaderboardHandler(req: Request, res: Response) {
  const type = (req.query.type as 'personal' | 'team') ?? 'personal';
  const limit = req.query.limit ? Number(req.query.limit) : 20;
  const from = req.query.from ? new Date(req.query.from as string) : undefined;
  const to = req.query.to ? new Date(req.query.to as string) : undefined;
  res.json(await reportsService.getLeaderboard({ type, from, to, limit }));
}
