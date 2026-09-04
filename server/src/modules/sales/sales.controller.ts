import type { Request, Response } from 'express';
import * as service from './sales.service.js';
import { ApiError } from '../../lib/apiError.js';

export async function createSaleHandler(req: Request, res: Response) {
  if (!req.user) throw ApiError.unauthorized();
  res.status(201).json(await service.createSale(req.body, req.user.id));
}

export async function listSalesHandler(req: Request, res: Response) {
  if (!req.user) throw ApiError.unauthorized();
  res.json(await service.listSales(req.query as unknown as service.ListSalesQuery, req.user));
}

export async function getReceiptHandler(req: Request, res: Response) {
  if (!req.user) throw ApiError.unauthorized();
  const { id } = req.params as unknown as { id: number };
  res.json(await service.getReceipt(id, req.user));
}
