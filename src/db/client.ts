import postgres from 'postgres';
import { getRequiredEnv } from './env';

export function createSqlClient(connectionString = getRequiredEnv('DATABASE_URL')) {
  return postgres(connectionString, {
    // Neon poolers reject prepared statements; disabling them also keeps local/test behavior uniform.
    prepare: false,
  });
}
