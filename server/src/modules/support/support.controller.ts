import type { Request, Response } from 'express';
import * as service from './support.service.js';
import { ApiError } from '../../lib/apiError.js';

export async function sendMessageHandler(req: Request, res: Response) {
  if (!req.user) throw ApiError.unauthorized();
  const message = await service.sendMessage({ id: req.user.id, role: req.user.role }, req.body);
  res.status(201).json(message);
}

export async function listMessagesHandler(req: Request, res: Response) {
  if (!req.user) throw ApiError.unauthorized();
  const isAdmin = req.user.role === 'SUPER_ADMIN';
  const query = req.query as unknown as service.ListMessagesQuery & { agentId?: number };

  let agentId: number;
  if (isAdmin) {
    if (!query.agentId) throw ApiError.badRequest('agentId is required');
    agentId = query.agentId;
  } else {
    agentId = req.user.id;
  }

  const result = await service.listThreadMessages(agentId, { page: query.page, pageSize: query.pageSize });
  await service.markThreadRead(agentId, isAdmin ? 'ADMIN' : 'AGENT');
  res.json(result);
}

export async function listThreadsHandler(req: Request, res: Response) {
  res.json(await service.listThreads(req.query as unknown as service.ListThreadsQuery));
}

export async function unreadCountHandler(req: Request, res: Response) {
  if (!req.user) throw ApiError.unauthorized();
  const count = req.user.role === 'SUPER_ADMIN' ? await service.getAdminUnreadCount() : await service.getAgentUnreadCount(req.user.id);
  res.json({ count });
}
