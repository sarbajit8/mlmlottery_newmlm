import type { Request, Response } from 'express';
import * as authService from './auth.service.js';
import * as usersService from '../users/users.service.js';
import { ApiError } from '../../lib/apiError.js';

export async function loginHandler(req: Request, res: Response) {
  const result = await authService.login(req.body, { ip: req.ip });
  res.json(result);
}

export async function refreshHandler(req: Request, res: Response) {
  const result = await authService.refresh(req.body.refreshToken);
  res.json(result);
}

export async function logoutHandler(req: Request, res: Response) {
  if (!req.user) throw ApiError.unauthorized();
  await authService.logout(req.user.id);
  res.status(204).send();
}

export async function meHandler(req: Request, res: Response) {
  if (!req.user) throw ApiError.unauthorized();
  const user = await authService.me(req.user.id);
  res.json(user);
}

export async function registerAgentHandler(req: Request, res: Response) {
  const { referralCode, ...rest } = req.body;
  // Referral code is optional — no code means the new agent sponsors directly under Super Admin,
  // same default as when an admin creates an agent without picking a sponsor.
  const sponsorId = referralCode ? (await usersService.findSponsorByReferralCode(referralCode)).id : await usersService.getSuperAdminId();
  // Self-registration is auto-approved — the new agent can log in immediately, no admin action needed.
  const user = await usersService.registerAgent(rest, sponsorId, true);
  res.status(201).json(user);
}
