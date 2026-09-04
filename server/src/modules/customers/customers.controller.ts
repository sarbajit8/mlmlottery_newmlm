import type { Request, Response } from 'express';
import * as service from './customers.service.js';
import { ApiError } from '../../lib/apiError.js';

export async function listHandler(req: Request, res: Response) {
  if (!req.user) throw ApiError.unauthorized();
  res.json(await service.listCustomers(req.query as unknown as service.ListCustomersQuery, req.user));
}

export async function getHandler(req: Request, res: Response) {
  const { id } = req.params as unknown as { id: number };
  res.json(await service.getCustomerDetail(id));
}

export async function lookupHandler(req: Request, res: Response) {
  if (!req.user) throw ApiError.unauthorized();
  const mobile = String(req.query.mobile ?? '');
  const customer = await service.findByMobile(mobile, req.user.id);
  res.json(customer);
}
