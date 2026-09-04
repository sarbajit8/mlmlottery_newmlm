import type { Request, Response } from 'express';
import * as service from './results.service.js';
import { ApiError } from '../../lib/apiError.js';

export async function declareHandler(req: Request, res: Response) {
  if (!req.user) throw ApiError.unauthorized();
  res.status(201).json(await service.declareResult(req.body, req.user.id));
}

export async function updateHandler(req: Request, res: Response) {
  if (!req.user) throw ApiError.unauthorized();
  const { id } = req.params as unknown as { id: number };
  res.json(await service.updateResult(id, req.body, req.user.id));
}

export async function deleteHandler(req: Request, res: Response) {
  if (!req.user) throw ApiError.unauthorized();
  const { id } = req.params as unknown as { id: number };
  await service.deleteResult(id, req.user.id);
  res.status(204).send();
}

export async function getHandler(req: Request, res: Response) {
  const { id } = req.params as unknown as { id: number };
  res.json(await service.getResult(id));
}

export async function listHandler(req: Request, res: Response) {
  res.json(await service.listResults(req.query as unknown as service.ListResultsQuery));
}

export async function randomTicketHandler(req: Request, res: Response) {
  const { drawSlotId, drawDate } = req.query as unknown as { drawSlotId: number; drawDate: Date };
  res.json(await service.getRandomTicket(drawSlotId, drawDate));
}

export async function listWinnersHandler(req: Request, res: Response) {
  if (!req.user) throw ApiError.unauthorized();
  const query = req.query as unknown as service.ListWinnersQuery & { mine?: boolean };
  const scopedAgentId = query.mine ? req.user.id : undefined;
  res.json(await service.listWinners(query, scopedAgentId));
}
