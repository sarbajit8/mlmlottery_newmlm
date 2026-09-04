import cron from 'node-cron';
import { refreshAllSlotStatuses } from './drawSlots.service.js';
import { logger } from '../../lib/logger.js';

export function startDrawSlotStatusCron() {
  cron.schedule('* * * * *', async () => {
    try {
      await refreshAllSlotStatuses();
    } catch (err) {
      logger.error({ err }, 'Failed to refresh draw slot statuses');
    }
  });
  logger.info('Draw slot status cron scheduled (every minute)');
}
