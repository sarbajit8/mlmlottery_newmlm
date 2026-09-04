import type { NextFunction, Request, Response } from 'express';
import type { ZodTypeAny } from 'zod';
import { ApiError } from '../lib/apiError.js';

interface ValidationSchemas {
  body?: ZodTypeAny;
  query?: ZodTypeAny;
  params?: ZodTypeAny;
}

export function validate(schemas: ValidationSchemas) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (schemas.body) req.body = schemas.body.parse(req.body);
      // Express 5 exposes `req.query`/`req.params` as getter-only properties, so a plain
      // reassignment throws ("has only a getter"). Redefining the own property shadows the
      // prototype getter and lets us swap in the zod-parsed (and coerced) value.
      if (schemas.query) {
        Object.defineProperty(req, 'query', { value: schemas.query.parse(req.query), writable: true, configurable: true, enumerable: true });
      }
      if (schemas.params) {
        Object.defineProperty(req, 'params', { value: schemas.params.parse(req.params), writable: true, configurable: true, enumerable: true });
      }
      next();
    } catch (err: any) {
      next(ApiError.badRequest('Validation failed', err?.issues ?? err?.message));
    }
  };
}
