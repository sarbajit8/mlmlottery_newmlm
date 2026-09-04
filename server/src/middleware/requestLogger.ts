import type { NextFunction, Request, Response } from 'express';
import { logger } from '../lib/logger.js';

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  if (req.path === '/api/health') return next();
  const start = Date.now();
  res.on('finish', () => {
    logger.info({ method: req.method, path: req.originalUrl, status: res.statusCode, ms: Date.now() - start }, 'request');
  });
  next();
}
