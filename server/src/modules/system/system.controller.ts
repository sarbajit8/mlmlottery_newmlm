import type { Request, Response } from 'express';
import * as service from './system.service.js';

export async function listActivityHandler(req: Request, res: Response) {
  res.json(await service.listActivityLogs(req.query as unknown as service.ListActivityQuery));
}

export async function rolesReferenceHandler(_req: Request, res: Response) {
  res.json(service.ROLE_PERMISSIONS_REFERENCE);
}

export async function listAppSettingsHandler(_req: Request, res: Response) {
  res.json(await service.listAppSettings());
}

export async function publicSettingsHandler(_req: Request, res: Response) {
  res.json(await service.getPublicSettings());
}

/** Real, fetchable image URL for the uploaded logo (stored as a data: URI) — needed for social
 *  link-preview crawlers, which can't use inline data: URIs the way the SPA can. */
export async function logoImageHandler(_req: Request, res: Response) {
  const logo = await service.getLogoImage();
  if (!logo) {
    res.redirect(302, '/favicon.svg');
    return;
  }
  res.set('Cache-Control', 'no-cache');
  res.type(logo.mimeType).send(logo.buffer);
}

export async function upsertAppSettingHandler(req: Request, res: Response) {
  const key = String(req.params.key);
  res.json(await service.upsertAppSetting(key, req.body.value));
}
