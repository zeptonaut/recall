import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { getEnvFilePaths, loadEnvironment } from '@/db/env';

test('getEnvFilePaths skips .env.local for test', () => {
  const files = getEnvFilePaths('test', '/tmp/recall');

  assert.deepEqual(files, [
    '/tmp/recall/.env',
    '/tmp/recall/.env.test',
    '/tmp/recall/.env.test.local',
  ]);
});

test('loadEnvironment prefers test-specific files over shared files', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'recall-env-'));
  const originalDatabaseUrl = process.env.DATABASE_URL;
  const originalNodeEnv = process.env.NODE_ENV;

  fs.writeFileSync(path.join(tempDir, '.env'), 'DATABASE_URL=postgres://from-env\n');
  fs.writeFileSync(path.join(tempDir, '.env.local'), 'DATABASE_URL=postgres://from-local\n');
  fs.writeFileSync(path.join(tempDir, '.env.test'), 'DATABASE_URL=postgres://from-test\n');
  fs.writeFileSync(path.join(tempDir, '.env.test.local'), 'DATABASE_URL=postgres://from-test-local\n');

  delete process.env.DATABASE_URL;
  process.env.NODE_ENV = 'test';

  try {
    loadEnvironment('test', tempDir);
    assert.equal(process.env.DATABASE_URL, 'postgres://from-test-local');
  } finally {
    if (originalDatabaseUrl === undefined) {
      delete process.env.DATABASE_URL;
    } else {
      process.env.DATABASE_URL = originalDatabaseUrl;
    }

    if (originalNodeEnv === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = originalNodeEnv;
    }

    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});
