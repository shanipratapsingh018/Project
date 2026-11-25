import { randomBytes } from 'node:crypto';
import { existsSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
if (!existsSync(path.join(root, 'server/dist/index.js')) || !existsSync(path.join(root, 'client/dist/index.html'))) {
  console.error('Build the video studio first: npm ci && npm run build');
  process.exit(1);
}
const envFile = path.join(root, '.env');
if (!existsSync(envFile)) {
  writeFileSync(envFile, `ENCRYPTION_KEY=${randomBytes(32).toString('hex')}\nPORT=3000\nHOST=127.0.0.1\n`, { mode: 0o600, flag: 'wx' });
  console.log('Created private local configuration. Keep .env and the database together for backups.');
}
const child = spawn(process.execPath, ['server/dist/index.js'], {
  cwd: root, stdio: ['inherit', 'pipe', 'inherit'], env: {
    ...process.env, NODE_ENV: 'production',
    // Native fetch (including catalog sync) must honor inherited proxy policy.
    // An explicit operator setting remains authoritative.
    NODE_USE_ENV_PROXY: process.env.NODE_USE_ENV_PROXY ?? '1',
  },
});
let outputTail = '';
let browserOpened = false;
child.stdout.on('data', chunk => {
  process.stdout.write(chunk);
  outputTail = (outputTail + chunk.toString()).slice(-2000);
  const ready = outputTail.match(/Server running on http:\/\/[^\s]+:(\d+)\r?\n/);
  if (ready && !browserOpened && process.argv.includes('--open')) {
    browserOpened = true;
    const port = Number(ready[1]);
    if (!Number.isInteger(port) || port < 1 || port > 65535) return;
    const url = `http://127.0.0.1:${port}/video-studio`;
    let command;
    let args;
    if (process.platform === 'win32') {
      command = 'cmd.exe'; args = ['/d', '/s', '/c', `start "" "${url}"`];
    } else if (process.platform === 'darwin') {
      command = 'open'; args = [url];
    } else {
      command = 'xdg-open'; args = [url];
    }
    const browser = spawn(command, args, { stdio: 'ignore', windowsHide: true });
    browser.on('error', () => console.log(`Open ${url} in your browser.`));
    browser.on('close', code => { if (code) console.log(`Open ${url} in your browser.`); });
    browser.unref();
  }
});
child.on('error', () => { console.error('Could not start the server.'); process.exitCode = 1; });
child.on('exit', code => { process.exitCode = code ?? 1; });
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
