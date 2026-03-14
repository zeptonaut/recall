import 'server-only';

import { apiKey } from '@better-auth/api-key';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { betterAuth } from 'better-auth';
import { nextCookies } from 'better-auth/next-js';
import { db } from '@/db';
import * as schema from '@/db/schema';
import { getRequiredEnv } from '@/db/env';

const baseURL = process.env.BETTER_AUTH_URL ?? 'http://localhost:4321';

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema,
  }),
  baseURL,
  secret: getRequiredEnv('BETTER_AUTH_SECRET'),
  trustedOrigins: (request) => {
    const origin = request?.headers?.get('origin');
    if (!origin) return [];
    try {
      const url = new URL(origin);
      if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') return [origin];
    } catch {}
    return [];
  },
  emailAndPassword: {
    enabled: true,
  },
  advanced: {
    database: {
      generateId: 'uuid',
    },
  },
  plugins: [
    apiKey({
      defaultPrefix: 'recall_',
      requireName: true,
      keyExpiration: {
        defaultExpiresIn: null,
        disableCustomExpiresTime: true,
      },
      rateLimit: {
        enabled: false,
      },
    }),
    nextCookies(),
  ],
});
