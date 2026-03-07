import { spawn } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { getRequiredEnv, loadEnvironment } from './env';

type PostgresTarget = {
  database: string;
  host: string;
  password?: string;
  port?: string;
  username?: string;
};

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);

export function parseResetTarget(databaseUrl: string): PostgresTarget {
  const url = new URL(databaseUrl);

  if (!['postgres:', 'postgresql:'].includes(url.protocol)) {
    throw new Error(`Unsupported DATABASE_URL protocol: ${url.protocol}`);
  }

  const database = url.pathname.replace(/^\//, '');
  if (!database) {
    throw new Error('DATABASE_URL must include a database name.');
  }

  if (!LOCAL_HOSTS.has(url.hostname)) {
    throw new Error(`db:reset only supports local databases. Refusing host "${url.hostname}".`);
  }

  return {
    database,
    host: url.hostname,
    password: url.password || undefined,
    port: url.port || undefined,
    username: url.username || undefined,
  };
}

async function runCommand(command: string, args: string[], password?: string) {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      env: {
        ...process.env,
        ...(password ? { PGPASSWORD: password } : {}),
      },
    });

    child.on('exit', (code, signal) => {
      if (signal) {
        reject(new Error(`${command} exited with signal ${signal}`));
        return;
      }

      if (code !== 0) {
        reject(new Error(`${command} exited with code ${code}`));
        return;
      }

      resolve();
    });

    child.on('error', reject);
  });
}

async function resetDatabase() {
  loadEnvironment();

  const nodeEnv = process.env.NODE_ENV ?? 'development';
  const target = parseResetTarget(getRequiredEnv('DATABASE_URL'));
  const connectionArgs = [
    '--if-exists',
    '--force',
    '--host',
    target.host,
    '--maintenance-db',
    'postgres',
  ];

  if (target.port) {
    connectionArgs.push('--port', target.port);
  }

  if (target.username) {
    connectionArgs.push('--username', target.username);
  }

  console.log(`Resetting ${nodeEnv} database "${target.database}" on ${target.host}...`);

  await runCommand('dropdb', [...connectionArgs, target.database], target.password);
  await runCommand(
    'createdb',
    connectionArgs.filter((arg) => arg !== '--if-exists' && arg !== '--force').concat(target.database),
    target.password
  );

  console.log(`Database "${target.database}" has been recreated.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  resetDatabase().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
