import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './lib/logger.js';
import { startDrawSlotStatusCron } from './modules/drawSlots/drawSlots.cron.js';

const app = createApp();

app.listen(env.PORT, () => {
  logger.info(`MLM Lottery API listening on http://localhost:${env.PORT} (proxied via Apache at ${env.APP_BASE_URL})`);
  startDrawSlotStatusCron();
});
