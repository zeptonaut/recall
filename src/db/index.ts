import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from './schema';
import { createSqlClient } from './client';

const client = createSqlClient();
export const db = drizzle({ client, schema });

/** Close the underlying connection pool. Used by tests to exit cleanly. */
export function closeDb() {
  return client.end();
}
