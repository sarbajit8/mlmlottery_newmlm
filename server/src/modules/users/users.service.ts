import { Prisma, type Role, type UserStatus } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { hashPassword } from '../../lib/password.js';
import { generateReferralCode } from '../../lib/codes.js';
import { ApiError } from '../../lib/apiError.js';
import { logActivity } from '../../middleware/auditLog.js';

function sanitize<T extends { passwordHash: string; refreshTokenHash: string | null }>(user: T) {
  const { passwordHash, refreshTokenHash, ...rest } = user;
  return rest;
}

async function uniqueReferralCode(): Promise<string> {
  for (let i = 0; i < 10; i++) {
    const code = generateReferralCode();
    const existing = await prisma.user.findUnique({ where: { referralCode: code } });
    if (!existing) return code;
  }
  throw new Error('Failed to generate a unique referral code');
}

export async function getSuperAdminId(): Promise<number> {
  const admin = await prisma.user.findFirst({ where: { role: 'SUPER_ADMIN' } });
  if (!admin) throw new Error('No Super Admin account exists');
  return admin.id;
}

export interface ListUsersQuery {
  role?: Role;
  status?: UserStatus;
  search?: string;
  page: number;
  pageSize: number;
}

export async function listUsers(query: ListUsersQuery) {
  const where = {
    ...(query.role ? { role: query.role } : {}),
    ...(query.status ? { status: query.status } : {}),
    ...(query.search
      ? {
          OR: [
            { name: { contains: query.search } },
            { email: { contains: query.search } },
            { mobile: { contains: query.search } },
            { referralCode: { contains: query.search } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      include: { sponsor: { select: { id: true, name: true, referralCode: true } }, _count: { select: { downline: true } } },
    }),
    prisma.user.count({ where }),
  ]);

  return { items: items.map(sanitize), total, page: query.page, pageSize: query.pageSize };
}

export async function getUserById(id: number) {
  const user = await prisma.user.findUnique({
    where: { id },
    include: { sponsor: { select: { id: true, name: true, referralCode: true } } },
  });
  if (!user) throw ApiError.notFound('User not found');
  return sanitize(user);
}

export interface CreateUserInput {
  name: string;
  email: string;
  mobile: string;
  whatsapp?: string;
  password: string;
  sponsorId?: number | null;
  autoApprove: boolean;
}

/** Admin directly creating an Agent. Defaults the new agent's sponsor to the Super Admin so every
 *  admin-created agent roots into the one MLM tree, rather than becoming a disconnected top-level node. */
export async function createUser(input: CreateUserInput, actorId: number) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) throw ApiError.conflict('A user with this email already exists');

  if (input.sponsorId) {
    const sponsor = await prisma.user.findUnique({ where: { id: input.sponsorId } });
    if (!sponsor) throw ApiError.badRequest('Sponsor not found');
  }

  const [passwordHash, referralCode, sponsorId] = await Promise.all([
    hashPassword(input.password),
    uniqueReferralCode(),
    input.sponsorId ? Promise.resolve(input.sponsorId) : getSuperAdminId(),
  ]);

  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      mobile: input.mobile,
      whatsapp: input.whatsapp,
      passwordHash,
      role: 'AGENT',
      sponsorId,
      referralCode,
      status: input.autoApprove ? 'ACTIVE' : 'PENDING_KYC',
      approvedById: input.autoApprove ? actorId : null,
      approvedAt: input.autoApprove ? new Date() : null,
    },
  });

  await logActivity(prisma, { actorId, action: 'USER_CREATE', entityType: 'User', entityId: user.id, metadata: { role: user.role } });
  return sanitize(user);
}

export interface RegisterAgentInput {
  name: string;
  email: string;
  mobile: string;
  whatsapp?: string;
  password: string;
  kycDocUrl?: string;
}

/** Used for both public referral-link signup and a logged-in sponsor recruiting directly. */
export async function registerAgent(input: RegisterAgentInput, sponsorId: number, autoApprove: boolean) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) throw ApiError.conflict('A user with this email already exists');

  const sponsor = await prisma.user.findUnique({ where: { id: sponsorId } });
  if (!sponsor) throw ApiError.badRequest('Sponsor not found');

  const [passwordHash, referralCode] = await Promise.all([hashPassword(input.password), uniqueReferralCode()]);

  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      mobile: input.mobile,
      whatsapp: input.whatsapp,
      passwordHash,
      role: 'AGENT',
      sponsorId,
      referralCode,
      status: autoApprove ? 'ACTIVE' : 'PENDING_KYC',
      approvedAt: autoApprove ? new Date() : null,
      kycDocUrl: input.kycDocUrl,
    },
  });

  await logActivity(prisma, { actorId: sponsorId, action: 'AGENT_REGISTER', entityType: 'User', entityId: user.id });
  return sanitize(user);
}

export async function findSponsorByReferralCode(referralCode: string) {
  const sponsor = await prisma.user.findUnique({ where: { referralCode } });
  if (!sponsor) throw ApiError.badRequest('Invalid referral code');
  return sponsor;
}

export async function setStatus(id: number, status: UserStatus, actorId: number) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw ApiError.notFound('User not found');
  if (user.role === 'SUPER_ADMIN') throw ApiError.forbidden('Cannot change status of a Super Admin');

  const updated = await prisma.user.update({
    where: { id },
    data: {
      status,
      approvedById: status === 'ACTIVE' && user.status === 'PENDING_KYC' ? actorId : user.approvedById,
      approvedAt: status === 'ACTIVE' && user.status === 'PENDING_KYC' ? new Date() : user.approvedAt,
    },
  });

  await logActivity(prisma, { actorId, action: 'USER_STATUS_CHANGE', entityType: 'User', entityId: id, metadata: { status } });
  return sanitize(updated);
}

/** Permanently deletes an agent. Only allowed for a "clean" account — no downline and no
 *  financial / sales footprint — because those records reference the user and must not be
 *  silently dropped. Anyone with history should be Deactivated instead. */
export async function deleteUser(id: number, actorId: number) {
  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          downline: true,
          ticketsSold: true,
          receipts: true,
          customersCreated: true,
          commissionsEarned: true,
          commissionsSourced: true,
          walletTransactions: true,
          withdrawalRequests: true,
          depositRequests: true,
          transfersSent: true,
          transfersReceived: true,
          createdBatches: true,
          drawResultsDeclared: true,
        },
      },
    },
  });
  if (!user) throw ApiError.notFound('User not found');
  if (user.role === 'SUPER_ADMIN' || user.isCompanyWallet) throw ApiError.forbidden('An admin / company wallet account cannot be deleted');
  if (user.id === actorId) throw ApiError.badRequest('You cannot delete your own account');

  const c = user._count;
  const blockers: string[] = [];
  if (c.downline > 0) blockers.push(`${c.downline} downline agent(s)`);
  if (c.ticketsSold > 0) blockers.push(`${c.ticketsSold} sold ticket(s)`);
  if (c.receipts > 0) blockers.push(`${c.receipts} sale(s)`);
  if (c.customersCreated > 0) blockers.push(`${c.customersCreated} customer(s)`);
  if (c.commissionsEarned + c.commissionsSourced > 0) blockers.push('commission history');
  if (c.walletTransactions > 0) blockers.push('wallet history');
  if (c.withdrawalRequests + c.depositRequests + c.transfersSent + c.transfersReceived > 0) blockers.push('wallet requests / transfers');
  if (c.createdBatches > 0) blockers.push('generated ticket batches');
  if (c.drawResultsDeclared > 0) blockers.push('declared results');
  if (!new Prisma.Decimal(user.walletBalance).equals(0)) blockers.push('a non-zero wallet balance');

  if (blockers.length > 0) {
    throw ApiError.conflict(`Cannot delete "${user.name}" — they still have ${blockers.join(', ')}. Deactivate the account instead.`);
  }

  await prisma.$transaction(async (tx) => {
    await tx.bankDetailsRequest.deleteMany({ where: { userId: id } });
    await tx.supportMessage.deleteMany({ where: { OR: [{ agentId: id }, { senderId: id }] } });
    await tx.auditLog.updateMany({ where: { actorId: id }, data: { actorId: null } });
    await tx.user.updateMany({ where: { approvedById: id }, data: { approvedById: null } });
    await tx.user.delete({ where: { id } });
    await logActivity(tx, { actorId, action: 'USER_DELETE', entityType: 'User', entityId: id, metadata: { name: user.name, email: user.email } });
  });
}

/** Admin sets a new password for an agent (e.g. they forgot it). The old password can never be
 *  recovered — it's a one-way bcrypt hash — so this issues a fresh one rather than "revealing" it.
 *  Also clears the refresh token so any existing session is forced to log in again. */
export async function setPassword(id: number, newPassword: string, actorId: number) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw ApiError.notFound('User not found');

  const passwordHash = await hashPassword(newPassword);
  await prisma.user.update({ where: { id }, data: { passwordHash, refreshTokenHash: null } });

  await logActivity(prisma, { actorId, action: 'USER_PASSWORD_RESET', entityType: 'User', entityId: id });
}
