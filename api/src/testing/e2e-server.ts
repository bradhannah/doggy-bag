// Run browser tests against disposable data, including read-time migrations.
import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { once } from 'node:events';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '../../..');
const directory = await mkdtemp(join(tmpdir(), 'doggybag-e2e-'));
const backend = spawn(process.execPath, [join(root, 'api/server.ts')], {
  cwd: directory,
  env: { ...process.env, DATA_DIR: '' },
  stdio: 'inherit',
});
const frontend = spawn(process.execPath, [join(root, 'node_modules/vite/bin/vite.js'), 'dev'], {
  cwd: root,
  stdio: 'inherit',
});

let stopping = false;
async function stop(code: number) {
  if (stopping) return;
  stopping = true;
  await Promise.all(
    [backend, frontend].map(async (child) => {
      if (child.exitCode !== null || child.signalCode !== null) return;
      const closed = once(child, 'close');
      child.kill('SIGTERM');
      await closed;
    })
  );
  await rm(directory, { recursive: true, force: true });
  process.exit(code);
}
process.once('SIGINT', () => void stop(0));
process.once('SIGTERM', () => void stop(0));
backend.once('exit', (code) => void stop(code ?? 1));
frontend.once('exit', (code) => void stop(code ?? 1));
