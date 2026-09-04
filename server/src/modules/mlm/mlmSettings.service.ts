import { prisma } from '../../lib/prisma.js';
import { ApiError } from '../../lib/apiError.js';
import { logActivity } from '../../middleware/auditLog.js';

export async function getActiveSettings() {
  const settings = await prisma.mlmSettings.findFirst({
    where: { effectiveTo: null },
    orderBy: { effectiveFrom: 'desc' },
    include: { levelPercentages: { orderBy: { levelNumber: 'asc' } } },
  });
  if (!settings) throw ApiError.notFound('MLM settings have not been configured yet');
  return settings;
}

export interface UpdateSettingsInput {
  maxLevels: number;
  commissionBase: 'SEM_VALUE' | 'PRICE' | 'FLAT';
  flatAmount?: number;
  payoutMode: 'INSTANT' | 'BATCH';
  minPayoutThreshold: number;
  shortfallPolicy: 'FORFEIT' | 'ROLLUP_TO_ADMIN';
  levelPercentages: { levelNumber: number; percentage: number }[];
}

/** Closes the currently-active settings row and inserts a new one, so past sales keep the % active at the time. */
export async function updateSettings(input: UpdateSettingsInput, actorId: number) {
  if (input.commissionBase !== 'SEM_VALUE') {
    throw ApiError.badRequest('Only SEM_VALUE commission base is implemented in this build. PRICE/FLAT are reserved for a future update.');
  }

  const totalPercent = input.levelPercentages.reduce((sum, l) => sum + l.percentage, 0);
  const levelNumbers = new Set(input.levelPercentages.map((l) => l.levelNumber));
  if (levelNumbers.size !== input.levelPercentages.length) {
    throw ApiError.badRequest('Duplicate level numbers in percentage table');
  }
  if (Math.max(...levelNumbers) > input.maxLevels) {
    throw ApiError.badRequest('Level percentages reference a level beyond maxLevels');
  }

  const settings = await prisma.$transaction(async (tx) => {
    const current = await tx.mlmSettings.findFirst({ where: { effectiveTo: null } });
    if (current) {
      await tx.mlmSettings.update({ where: { id: current.id }, data: { effectiveTo: new Date() } });
    }

    const created = await tx.mlmSettings.create({
      data: {
        maxLevels: input.maxLevels,
        commissionBase: input.commissionBase,
        flatAmount: input.flatAmount,
        payoutMode: input.payoutMode,
        minPayoutThreshold: input.minPayoutThreshold,
        shortfallPolicy: input.shortfallPolicy,
        levelPercentages: { create: input.levelPercentages },
      },
      include: { levelPercentages: { orderBy: { levelNumber: 'asc' } } },
    });

    await logActivity(tx, { actorId, action: 'MLM_SETTINGS_UPDATE', entityType: 'MlmSettings', entityId: created.id });
    return created;
  });

  return { settings, warning: totalPercent > 100 ? `Level percentages sum to ${totalPercent}%, which exceeds 100%.` : null };
}

export async function getSettingsHistory() {
  return prisma.mlmSettings.findMany({
    orderBy: { effectiveFrom: 'desc' },
    include: { levelPercentages: { orderBy: { levelNumber: 'asc' } } },
  });
}
