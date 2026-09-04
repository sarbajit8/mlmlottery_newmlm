import { prisma } from '../../lib/prisma.js';
import { comparePassword, hashPassword } from '../../lib/password.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../../lib/jwt.js';
import { ApiError } from '../../lib/apiError.js';
import { logActivity } from '../../middleware/auditLog.js';
import type { LoginInput } from './auth.schema.js';

async function issueTokenPair(userId: number, role: Parameters<typeof signAccessToken>[0]['role']) {
  const accessToken = signAccessToken({ sub: userId, role });
  const refreshToken = signRefreshToken({ sub: userId });
  const refreshTokenHash = await hashPassword(refreshToken);
  await prisma.user.update({ where: { id: userId }, data: { refreshTokenHash } });
  return { accessToken, refreshToken };
}

export async function login(input: LoginInput, req?: { ip?: string }) {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  if (!user) throw ApiError.unauthorized('Invalid email or password');

  const valid = await comparePassword(input.password, user.passwordHash);
  if (!valid) throw ApiError.unauthorized('Invalid email or password');

  if (user.status !== 'ACTIVE') {
    throw ApiError.forbidden(
      user.status === 'PENDING_KYC' ? 'Your account is pending approval.' : 'Your account has been deactivated.',
    );
  }

  const tokens = await issueTokenPair(user.id, user.role);
  await logActivity(prisma, { actorId: user.id, action: 'AUTH_LOGIN', entityType: 'User', entityId: user.id });

  const { passwordHash, refreshTokenHash, ...safeUser } = user;
  return { ...tokens, user: safeUser };
}

export async function refresh(refreshToken: string) {
  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw ApiError.unauthorized('Invalid or expired refresh token');
  }

  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user?.refreshTokenHash) throw ApiError.unauthorized('Session expired, please log in again');

  const matches = await comparePassword(refreshToken, user.refreshTokenHash);
  if (!matches) throw ApiError.unauthorized('Session expired, please log in again');

  return issueTokenPair(user.id, user.role);
}

export async function logout(userId: number) {
  await prisma.user.update({ where: { id: userId }, data: { refreshTokenHash: null } });
}

export async function me(userId: number) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw ApiError.notFound('User not found');
  const { passwordHash, refreshTokenHash, ...safeUser } = user;
  return safeUser;
}
