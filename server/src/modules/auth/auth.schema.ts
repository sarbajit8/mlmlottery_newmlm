import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

export const registerAgentPublicSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  mobile: z.string().min(6),
  whatsapp: z.string().optional(),
  password: z.string().min(6),
  // Optional — registering with no referral code sponsors the new agent directly under Super Admin.
  referralCode: z.preprocess((v) => (v === '' ? undefined : v), z.string().min(3).optional()),
  kycDocUrl: z.string().url().optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
