import type { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';

export interface ListActivityQuery {
  actorId?: number;
  entityType?: string;
  from?: Date;
  to?: Date;
  page: number;
  pageSize: number;
}

export async function listActivityLogs(query: ListActivityQuery) {
  const where: Prisma.AuditLogWhereInput = {
    actorId: query.actorId,
    entityType: query.entityType,
    createdAt: query.from || query.to ? { gte: query.from, lte: query.to } : undefined,
  };

  const [items, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      include: { actor: { select: { id: true, name: true, role: true } } },
    }),
    prisma.auditLog.count({ where }),
  ]);

  return { items, total, page: query.page, pageSize: query.pageSize };
}

export const ROLE_PERMISSIONS_REFERENCE = [
  {
    role: 'SUPER_ADMIN',
    panel: 'Admin',
    description: 'Full control of the platform. Creates agents directly, configures lottery/MLM settings, and is the root of the MLM tree — not a commission-earning node except as the configured rollup wallet.',
  },
  {
    role: 'AGENT',
    panel: 'Agent',
    description: 'Sells tickets, recruits new agents beneath themselves via a referral link, and earns multi-level commission from their entire downline\'s sales.',
  },
] as const;

export async function getAppSetting(key: string) {
  return prisma.appSetting.findUnique({ where: { key } });
}

const DEFAULT_COMPANY_NAME = 'FastDialCab';
const DEFAULT_TICKET_BASE_PRICE = 7;

/** The single admin-configured ticket price (AppSetting key "ticketBasePrice") that every series
 *  scales from: a series' final ticket price = this x that series' own multiplier. */
export async function getTicketBasePrice(): Promise<number> {
  const setting = await prisma.appSetting.findUnique({ where: { key: 'ticketBasePrice' } });
  const raw = setting?.value;
  const n = typeof raw === 'number' ? raw : typeof raw === 'string' ? Number(raw) : NaN;
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_TICKET_BASE_PRICE;
}

export interface WalletRules {
  withdrawalMinAmount: number;
  withdrawalMultipleOf: number;
  withdrawalFeePercent: number;
  transferMinAmount: number;
  transferMultipleOf: number;
}

const DEFAULT_WALLET_RULES: WalletRules = {
  withdrawalMinAmount: 100,
  withdrawalMultipleOf: 100,
  withdrawalFeePercent: 10,
  transferMinAmount: 100,
  transferMultipleOf: 100,
};

/** Admin-configured wallet rules (AppSetting key "walletRules") — withdrawal minimum/step/fee and
 *  agent-to-agent transfer minimum/step. Missing/invalid fields fall back to the defaults above. */
export async function getWalletRules(): Promise<WalletRules> {
  const setting = await prisma.appSetting.findUnique({ where: { key: 'walletRules' } });
  const raw = setting?.value;
  if (!raw || typeof raw !== 'object') return DEFAULT_WALLET_RULES;
  const merged = { ...DEFAULT_WALLET_RULES, ...(raw as Partial<WalletRules>) };
  for (const key of Object.keys(DEFAULT_WALLET_RULES) as (keyof WalletRules)[]) {
    if (typeof merged[key] !== 'number' || !Number.isFinite(merged[key]) || merged[key] < 0) {
      merged[key] = DEFAULT_WALLET_RULES[key];
    }
  }
  return merged;
}

/** The admin-uploaded logo is stored as a data: URI (base64) — fine for the SPA to render directly,
 *  but link-preview crawlers (WhatsApp, Facebook, ...) need a real fetchable image URL, not inline
 *  data. This decodes it back to raw bytes + its MIME type for GET /api/system/logo to serve. */
export async function getLogoImage(): Promise<{ buffer: Buffer; mimeType: string } | null> {
  const setting = await prisma.appSetting.findUnique({ where: { key: 'logoUrl' } });
  const value = typeof setting?.value === 'string' ? setting.value.trim() : '';
  const match = /^data:([^;]+);base64,(.+)$/.exec(value);
  if (!match) return null;
  return { mimeType: match[1], buffer: Buffer.from(match[2], 'base64') };
}

/** Unauthenticated-safe subset of settings — shown on the public landing/login pages and every ticket. */
export async function getPublicSettings() {
  const [nameSetting, logoSetting, ticketBasePrice] = await Promise.all([
    prisma.appSetting.findUnique({ where: { key: 'companyName' } }),
    prisma.appSetting.findUnique({ where: { key: 'logoUrl' } }),
    getTicketBasePrice(),
  ]);
  const companyName = typeof nameSetting?.value === 'string' && nameSetting.value.trim() ? nameSetting.value.trim() : DEFAULT_COMPANY_NAME;
  const logoUrl = typeof logoSetting?.value === 'string' && logoSetting.value.trim() ? logoSetting.value.trim() : null;
  return { companyName, logoUrl, ticketBasePrice };
}

export interface PrizeAmountDefaults {
  firstPrizeAmount: number;
  secondPrizeAmount: number;
  thirdPrizeAmount: number;
  fourthPrizeAmount: number;
  fifthPrizeAmount: number;
  fifthPrizePercentage: number;
}

const DEFAULT_PRIZE_AMOUNTS: PrizeAmountDefaults = {
  firstPrizeAmount: 0,
  secondPrizeAmount: 0,
  thirdPrizeAmount: 0,
  fourthPrizeAmount: 0,
  fifthPrizeAmount: 0,
  fifthPrizePercentage: 50,
};

/** Admin-configured 1-SEM base prize amounts (AppSetting key "defaultPrizeAmounts", set on the
 *  Prize Settings page). Declaring a result no longer takes per-prize amounts — they always come
 *  from here, and each winning ticket is paid the base × its series multiplier. */
export async function getDefaultPrizeAmounts(): Promise<PrizeAmountDefaults> {
  const setting = await prisma.appSetting.findUnique({ where: { key: 'defaultPrizeAmounts' } });
  const raw = setting?.value;
  if (!raw || typeof raw !== 'object') return DEFAULT_PRIZE_AMOUNTS;
  const merged = { ...DEFAULT_PRIZE_AMOUNTS, ...(raw as Partial<PrizeAmountDefaults>) };
  for (const key of Object.keys(DEFAULT_PRIZE_AMOUNTS) as (keyof PrizeAmountDefaults)[]) {
    const n = Number(merged[key]);
    merged[key] = Number.isFinite(n) && n >= 0 ? n : DEFAULT_PRIZE_AMOUNTS[key];
  }
  return merged;
}

export async function listAppSettings() {
  return prisma.appSetting.findMany();
}

export async function upsertAppSetting(key: string, value: unknown) {
  return prisma.appSetting.upsert({
    where: { key },
    create: { key, value: value as Prisma.InputJsonValue },
    update: { value: value as Prisma.InputJsonValue },
  });
}
