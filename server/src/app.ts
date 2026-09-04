import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { apiRouter } from './routes/index.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { requestLogger } from './middleware/requestLogger.js';
import { getPublicSettings } from './modules/system/system.service.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
// server/src (dev, tsx) or server/dist (prod, tsc) — both are exactly two path segments below the
// repo root, so the same relative path finds the client's build output either way.
const clientDistDir = resolve(__dirname, '../../client/dist');
const clientIndexPath = join(clientDistDir, 'index.html');

function escapeHtmlAttr(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Injects live company name / social-preview (Open Graph, Twitter Card) meta tags into the built
 *  client's index.html, server-side, on every request — so a link to this site shared on WhatsApp,
 *  Facebook, etc. shows the admin's current logo and name. Those crawlers fetch raw HTML without
 *  running JavaScript, so this can't be done client-side the way the in-app logo/favicon are. */
async function renderClientIndex(baseUrl: string): Promise<string> {
  const html = readFileSync(clientIndexPath, 'utf-8');
  const { companyName, logoUrl } = await getPublicSettings();
  const name = escapeHtmlAttr(companyName);
  const imageUrl = escapeHtmlAttr(logoUrl ? `${baseUrl}/api/system/logo` : `${baseUrl}/favicon.svg`);
  const siteUrl = escapeHtmlAttr(baseUrl);

  const metaTags = `
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="${name}" />
    <meta property="og:title" content="${name}" />
    <meta property="og:url" content="${siteUrl}" />
    <meta property="og:image" content="${imageUrl}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${name}" />
    <meta name="twitter:image" content="${imageUrl}" />
  </head>`;

  return html.replace(/<title>.*?<\/title>/s, `<title>${name}</title>`).replace('</head>', metaTags);
}

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', true); // behind the Apache reverse proxy on :8083
  app.use(helmet());
  app.use(cors());
  app.use(express.json({ limit: '4mb' })); // headroom for base64 payment-QR uploads
  app.use(requestLogger);

  app.use('/api', apiRouter);

  const clientIsBuilt = existsSync(clientIndexPath);

  if (clientIsBuilt) {
    // Static assets (JS/CSS/images) first; index.html is excluded here so every non-asset request
    // falls through to the templated handler below instead of getting the raw, un-injected file.
    app.use(express.static(clientDistDir, { index: false }));
    app.get(/^\/(?!api\/).*/, async (req, res, next) => {
      try {
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        res.type('html').send(await renderClientIndex(baseUrl));
      } catch (err) {
        next(err);
      }
    });
  } else {
    // No client build yet (e.g. local API-only dev) — a human-friendly page for the raw backend
    // URL, so hitting it directly confirms the API is up instead of showing a bare 404.
    app.get('/', async (_req, res) => {
      const { companyName } = await getPublicSettings();
      res.type('html').send(`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${companyName} API</title>
</head>
<body style="margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#05070c;color:#e7e9ee;font-family:system-ui,-apple-system,sans-serif;">
  <div style="text-align:center;padding:24px;">
    <div style="width:56px;height:56px;margin:0 auto 16px;border-radius:16px;background:linear-gradient(135deg,#34d399,#059669);display:flex;align-items:center;justify-content:center;font-size:28px;box-shadow:0 8px 24px rgba(5,150,105,0.35);">✓</div>
    <h1 style="margin:0 0 6px;font-size:18px;font-weight:600;">Server Running Successfully</h1>
    <p style="margin:0;color:#8b93a3;font-size:13px;">${companyName} API</p>
    <p style="margin:8px 0 0;color:#4b5563;font-size:11px;">${new Date().toISOString()}</p>
  </div>
</body>
</html>`);
    });
  }

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
