import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './lib/logger.js';
import { startDrawSlotStatusCron } from './modules/drawSlots/drawSlots.cron.js';

// Apply any pending Prisma migrations before the app starts accepting traffic. This is what makes a
// fresh deploy (e.g. new code pushed to EC2 and restarted) self-migrating — no manual step. Runs by
// default in production only; set MIGRATE_ON_BOOT=true/false to force it on or off anywhere.
function runPendingMigrations() {
  const shouldRun = env.MIGRATE_ON_BOOT ?? env.NODE_ENV === 'production';
  if (!shouldRun) return;

  const packageRoot = path.resolve(import.meta.dirname, '..');
  const prismaBin = path.join(packageRoot, 'node_modules', 'prisma', 'build', 'index.js');
  logger.info('Applying database migrations (prisma migrate deploy)…');
  execFileSync(process.execPath, [prismaBin, 'migrate', 'deploy'], { cwd: packageRoot, stdio: 'inherit' });
  logger.info('Database schema is up to date');
}

runPendingMigrations();

const app = createApp();

app.listen(env.PORT, () => {
  logger.info(`MLM Lottery API listening on http://localhost:${env.PORT} (proxied via Apache at ${env.APP_BASE_URL})`);
  startDrawSlotStatusCron();
});
