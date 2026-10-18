import { expect, test } from 'bun:test';
import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

test('desktop startup uses DATA_DIR before route services are imported', async () => {
  const cwd = await mkdtemp(join(tmpdir(), 'doggy-startup-'));
  const dataDir = join(cwd, 'saved-data');
  // Release CI exercises the compiled artifact with the same startup regression test.
  const command = process.env.SIDECAR_BINARY
    ? [process.env.SIDECAR_BINARY]
    : [process.execPath, fileURLToPath(new URL('./server.ts', import.meta.url))];
  const child = Bun.spawn(command, {
    cwd,
    env: { ...process.env, DATA_DIR: dataDir },
    stdout: 'pipe',
    stderr: 'pipe',
  });

  try {
    const reader = child.stdout.getReader();
    const decoder = new TextDecoder();
    let output = '';
    let port: string | undefined;
    const timeout = setTimeout(() => child.kill(), 5000);
    try {
      while (!port) {
        const { value, done } = await reader.read();
        if (done) throw new Error(`Backend exited before reporting its port: ${output}`);
        output += decoder.decode(value, { stream: true });
        port = output.match(/^PORT=(\d+)$/m)?.[1];
      }

      const health = await fetch(`http://localhost:${port}/api/health`);
      expect(health.status).toBe(200);
      await health.text();

      // Import-time service construction must not create a stray cwd/data folder.
      expect(await readdir(cwd)).toEqual(['saved-data']);
      expect((await readdir(dataDir)).sort()).toEqual(['entities', 'months']);
    } finally {
      clearTimeout(timeout);
      reader.releaseLock();
    }
  } finally {
    child.kill();
    await child.exited;
    await rm(cwd, { recursive: true, force: true });
  }
});
