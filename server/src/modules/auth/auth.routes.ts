import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { asyncHandler } from '../../lib/asyncHandler.js';
import { validate } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/auth.js';
import { loginSchema, refreshSchema, registerAgentPublicSchema } from './auth.schema.js';
import { loginHandler, logoutHandler, meHandler, refreshHandler, registerAgentHandler } from './auth.controller.js';

const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: true, legacyHeaders: false });
const registerLimiter = rateLimit({ windowMs: 60 * 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false });

export const authRouter = Router();

authRouter.post('/login', loginLimiter, validate({ body: loginSchema }), asyncHandler(loginHandler));
authRouter.post('/refresh', validate({ body: refreshSchema }), asyncHandler(refreshHandler));
authRouter.post('/logout', requireAuth, asyncHandler(logoutHandler));
authRouter.get('/me', requireAuth, asyncHandler(meHandler));
authRouter.post(
  '/register-agent',
  registerLimiter,
  validate({ body: registerAgentPublicSchema }),
  asyncHandler(registerAgentHandler),
);
