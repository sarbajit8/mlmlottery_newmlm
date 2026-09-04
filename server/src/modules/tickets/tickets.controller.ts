import type { Request, Response } from 'express';
import * as service from './tickets.service.js';
import { ApiError } from '../../lib/apiError.js';

export async function previewHandler(req: Request, res: Response) {
  res.json(await service.previewTickets(req.body));
}

export async function generateHandler(req: Request, res: Response) {
  if (!req.user) throw ApiError.unauthorized();
  res.status(201).json(await service.generateTickets(req.body, req.user.id));
}

export async function listBatchesHandler(req: Request, res: Response) {
  res.json(await service.listBatches(req.query as unknown as service.ListBatchesQuery));
}

export async function summaryHandler(req: Request, res: Response) {
  const drawDate = req.query.drawDate ? new Date(req.query.drawDate as string) : undefined;
  res.json(await service.getSummaryCards(drawDate));
}

export async function getBatchHandler(req: Request, res: Response) {
  const { id } = req.params as unknown as { id: number };
  res.json(await service.getBatchDetail(id));
}

export async function getBatchTicketsHandler(req: Request, res: Response) {
  const { id } = req.params as unknown as { id: number };
  res.json(await service.getBatchTickets(id, req.query as unknown as service.BatchTicketsQuery));
}

export async function exportBatchHandler(req: Request, res: Response) {
  const { id } = req.params as unknown as { id: number };
  await service.exportBatchCsv(id, res);
}

export async function lockBatchHandler(req: Request, res: Response) {
  if (!req.user) throw ApiError.unauthorized();
  const { id } = req.params as unknown as { id: number };
  res.json(await service.lockBatch(id, req.user.id));
}

export async function searchHandler(req: Request, res: Response) {
  res.json(await service.searchAvailableTickets(req.query as unknown as service.TicketSearchQuery));
}
