import { defineConfig } from 'drizzle-kit';
import { getRequiredEnv, loadEnvironment } from './src/db/env';

loadEnvironment();

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: { url: getRequiredEnv('DATABASE_URL') },
});
