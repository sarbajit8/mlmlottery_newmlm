import type { Request, Response } from 'express';
import * as service from './bankDetails.service.js';
import { ApiError } from '../../lib/apiError.js';

export async function getMyBankDetailsHandler(req: Request, res: Response) {
  if (!req.user) throw ApiError.unauthorized();
  res.json(await service.getMyBankDetails(req.user.id));
}

export async function submitBankDetailsHandler(req: Request, res: Response) {
  if (!req.user) throw ApiError.unauthorized();
  res.status(201).json(await service.submitBankDetails(req.user.id, req.body));
}

export async function listBankDetailsRequestsHandler(req: Request, res: Response) {
  res.json(await service.listBankDetailsRequests(req.query as unknown as service.ListBankDetailsQuery));
}

export async function processBankDetailsRequestHandler(req: Request, res: Response) {
  if (!req.user) throw ApiError.unauthorized();
  const { id } = req.params as unknown as { id: number };
  res.json(await service.processBankDetailsRequest(id, req.body.status, req.user.id, req.body.rejectionReason));
}
