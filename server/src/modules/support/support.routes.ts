import { Router } from 'express';
import { asyncHandler } from '../../lib/asyncHandler.js';
import { validate } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/requireRole.js';
import { listMessagesQuerySchema, listThreadsQuerySchema, sendMessageSchema } from './support.schema.js';
import { listMessagesHandler, listThreadsHandler, sendMessageHandler, unreadCountHandler } from './support.controller.js';

export const supportRouter = Router();

supportRouter.use(requireAuth);

supportRouter.post('/messages', validate({ body: sendMessageSchema }), asyncHandler(sendMessageHandler));
supportRouter.get('/messages', validate({ query: listMessagesQuerySchema }), asyncHandler(listMessagesHandler));
supportRouter.get('/threads', requireRole('SUPER_ADMIN'), validate({ query: listThreadsQuerySchema }), asyncHandler(listThreadsHandler));
supportRouter.get('/unread-count', asyncHandler(unreadCountHandler));
