import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  PORT: z.coerce.number().default(5000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  TZ: z.string().default('Asia/Kolkata'),
  JWT_ACCESS_SECRET: z.string().min(16),
  JWT_REFRESH_SECRET: z.string().min(16),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  APP_BASE_URL: z.string().default('http://localhost:8083'),
  SEED_ADMIN_EMAIL: z.string().email().default('admin@mlmlottery.local'),
  SEED_ADMIN_PASSWORD: z.string().min(6).default('Admin@12345'),
});

export const env = envSchema.parse(process.env);
