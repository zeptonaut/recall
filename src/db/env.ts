import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';

export type AppEnvironment = 'development' | 'test' | 'production';

export function normalizeNodeEnv(nodeEnv = process.env.NODE_ENV): AppEnvironment {
  if (nodeEnv === 'test' || nodeEnv === 'production') {
    return nodeEnv;
  }

  return 'development';
}

export function getEnvFilePaths(nodeEnv = process.env.NODE_ENV, rootDir = process.cwd()) {
  const env = normalizeNodeEnv(nodeEnv);
  const fileNames = ['.env', `.env.${env}`];

  if (env !== 'test' && env !== 'production') {
    fileNames.push('.env.local');
  }

  fileNames.push(`.env.${env}.local`);

  return fileNames.map((fileName) => path.join(rootDir, fileName));
}

export function loadEnvironment(nodeEnv = process.env.NODE_ENV, rootDir = process.cwd()) {
  const env = normalizeNodeEnv(nodeEnv);
  const loadedValues: Record<string, string> = {};
  const mutableEnv = process.env as Record<string, string | undefined>;

  for (const filePath of getEnvFilePaths(env, rootDir)) {
    if (!fs.existsSync(filePath)) {
      continue;
    }

    const parsed = dotenv.parse(fs.readFileSync(filePath));
    Object.assign(loadedValues, parsed);
  }

  for (const [name, value] of Object.entries(loadedValues)) {
    if (mutableEnv[name] === undefined) {
      mutableEnv[name] = value;
    }
  }

  return env;
}

export function getRequiredEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    const env = normalizeNodeEnv();
    throw new Error(`Missing ${name}. Define it for the ${env} environment.`);
  }

  return value;
}
