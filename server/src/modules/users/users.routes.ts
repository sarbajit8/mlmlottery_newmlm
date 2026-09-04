import { Router } from 'express';
import { asyncHandler } from '../../lib/asyncHandler.js';
import { validate } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/requireRole.js';
import { createUserSchema, idParamSchema, listUsersQuerySchema, setPasswordSchema, updateStatusSchema } from './users.schema.js';
import { createUserHandler, getUserHandler, listUsersHandler, setPasswordHandler, setStatusHandler } from './users.controller.js';

export const usersRouter = Router();

const adminRoles = ['SUPER_ADMIN'] as const;

usersRouter.use(requireAuth, requireRole(...adminRoles));

usersRouter.get('/', validate({ query: listUsersQuerySchema }), asyncHandler(listUsersHandler));
usersRouter.get('/:id', validate({ params: idParamSchema }), asyncHandler(getUserHandler));
usersRouter.post('/', validate({ body: createUserSchema }), asyncHandler(createUserHandler));
usersRouter.put('/:id/status', validate({ params: idParamSchema, body: updateStatusSchema }), asyncHandler(setStatusHandler));
usersRouter.put('/:id/password', validate({ params: idParamSchema, body: setPasswordSchema }), asyncHandler(setPasswordHandler));
