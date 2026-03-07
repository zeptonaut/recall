import { spawn } from 'node:child_process';

const [nodeEnv, command, ...args] = process.argv.slice(2);

if (!nodeEnv || !command) {
  console.error('Usage: node scripts/run-with-node-env.mjs <environment> <command> [...args]');
  process.exit(1);
}

const child = spawn(command, args, {
  stdio: 'inherit',
  env: {
    ...process.env,
    NODE_ENV: nodeEnv,
  },
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 1);
});

child.on('error', (error) => {
  console.error(error);
  process.exit(1);
});
