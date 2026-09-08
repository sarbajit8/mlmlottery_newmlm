import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './lib/logger.js';
import { startDrawSlotStatusCron } from './modules/drawSlots/drawSlots.cron.js';

// Apply any pending Prisma migrations before the app starts accepting traffic, so a fresh upload
// (new code pushed to EC2 + process restarted) migrates itself with no manual `prisma migrate
// deploy` step. `prisma migrate deploy` is idempotent — a no-op when the schema is already current.
//
// Default: runs whenever this is a real deployment — NODE_ENV=production OR the server is running
// from compiled `dist/` (pm2 / systemd / `npm start`), even if NODE_ENV was never set. Skipped only
// under `tsx watch` local dev (where you use `prisma migrate dev`). Force either way with
// MIGRATE_ON_BOOT=true|false.
function runPendingMigrations() {
  const runningCompiled = import.meta.url.includes('/dist/');
  const shouldRun = env.MIGRATE_ON_BOOT ?? (env.NODE_ENV === 'production' || runningCompiled);
  if (!shouldRun) return;

  const packageRoot = path.resolve(import.meta.dirname, '..');
  const prismaBin = path.join(packageRoot, 'node_modules', 'prisma', 'build', 'index.js');
  if (!fs.existsSync(prismaBin)) {
    logger.error(
      { prismaBin },
      'Cannot auto-migrate: the `prisma` package is not installed. Run `npm ci` (not `--omit=dev` — prisma is a runtime dependency) or apply migrations manually with `npx prisma migrate deploy`.',
    );
    process.exit(1);
  }

  logger.info('Applying database migrations (prisma migrate deploy)…');
  try {
    execFileSync(process.execPath, [prismaBin, 'migrate', 'deploy'], { cwd: packageRoot, stdio: 'inherit' });
  } catch {
    logger.error('Database migration failed — not starting the API with a mismatched schema. Fix the DB/connection and restart.');
    process.exit(1);
  }
  logger.info('Database schema is up to date');
}

runPendingMigrations();

const app = createApp();

app.listen(env.PORT, () => {
  logger.info(`MLM Lottery API listening on http://localhost:${env.PORT} (proxied via Apache at ${env.APP_BASE_URL})`);
  startDrawSlotStatusCron();
});
