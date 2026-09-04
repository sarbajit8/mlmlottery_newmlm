import type { Request, Response } from 'express';
import * as service from './paymentMethods.service.js';
import { ApiError } from '../../lib/apiError.js';

export async function listHandler(_req: Request, res: Response) {
  res.json(await service.listPaymentMethods());
}

export async function getActiveHandler(_req: Request, res: Response) {
  res.json(await service.getActivePaymentMethod());
}

export async function createHandler(req: Request, res: Response) {
  if (!req.user) throw ApiError.unauthorized();
  res.status(201).json(await service.createPaymentMethod(req.body, req.user.id));
}

export async function updateHandler(req: Request, res: Response) {
  if (!req.user) throw ApiError.unauthorized();
  const { id } = req.params as unknown as { id: number };
  res.json(await service.updatePaymentMethod(id, req.body, req.user.id));
}

export async function activateHandler(req: Request, res: Response) {
  if (!req.user) throw ApiError.unauthorized();
  const { id } = req.params as unknown as { id: number };
  res.json(await service.activatePaymentMethod(id, req.user.id));
}

export async function deleteHandler(req: Request, res: Response) {
  if (!req.user) throw ApiError.unauthorized();
  const { id } = req.params as unknown as { id: number };
  await service.deletePaymentMethod(id, req.user.id);
  res.status(204).send();
}
