import type { Request, Response } from 'express';
import * as usersService from './users.service.js';
import { ApiError } from '../../lib/apiError.js';

export async function listUsersHandler(req: Request, res: Response) {
  const result = await usersService.listUsers(req.query as unknown as usersService.ListUsersQuery);
  res.json(result);
}

export async function getUserHandler(req: Request, res: Response) {
  const { id } = req.params as unknown as { id: number };
  const user = await usersService.getUserById(id);
  res.json(user);
}

export async function createUserHandler(req: Request, res: Response) {
  if (!req.user) throw ApiError.unauthorized();
  const user = await usersService.createUser(req.body, req.user.id);
  res.status(201).json(user);
}

export async function setStatusHandler(req: Request, res: Response) {
  if (!req.user) throw ApiError.unauthorized();
  const { id } = req.params as unknown as { id: number };
  const user = await usersService.setStatus(id, req.body.status, req.user.id);
  res.json(user);
}

export async function setPasswordHandler(req: Request, res: Response) {
  if (!req.user) throw ApiError.unauthorized();
  const { id } = req.params as unknown as { id: number };
  await usersService.setPassword(id, req.body.password, req.user.id);
  res.status(204).send();
}
