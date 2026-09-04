import type { Request, Response } from 'express';
import * as service from './drawSlots.service.js';
import { ApiError } from '../../lib/apiError.js';

export async function listHandler(_req: Request, res: Response) {
  res.json(await service.listDrawSlots());
}

export async function getHandler(req: Request, res: Response) {
  const { id } = req.params as unknown as { id: number };
  res.json(await service.getDrawSlot(id));
}

export async function createHandler(req: Request, res: Response) {
  if (!req.user) throw ApiError.unauthorized();
  res.status(201).json(await service.createDrawSlot(req.body, req.user.id));
}

export async function updateHandler(req: Request, res: Response) {
  if (!req.user) throw ApiError.unauthorized();
  const { id } = req.params as unknown as { id: number };
  res.json(await service.updateDrawSlot(id, req.body, req.user.id));
}

export async function deleteHandler(req: Request, res: Response) {
  if (!req.user) throw ApiError.unauthorized();
  const { id } = req.params as unknown as { id: number };
  await service.deleteDrawSlot(id, req.user.id);
  res.status(204).send();
}
