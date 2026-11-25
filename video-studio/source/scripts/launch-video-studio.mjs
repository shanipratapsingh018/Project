import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const [major, minor] = process.versions.node.split('.').map(Number);
if (!((major === 20 && minor >= 18) || (major > 20 && major < 25))) {
  console.error(`This project needs Node.js 22 or 24; you currently have ${process.version}.`);
  console.error('Install Node.js 24 from https://nodejs.org/en/download and run this launcher again.');
  process.exit(1);
}

function runNpm(action) {
  // On Windows .cmd files need cmd.exe. The command string is fixed, and the
  // folder is passed separately as cwd, so spaces in an extraction path work.
  const windows = process.platform === 'win32';
  const command = windows ? 'cmd.exe' : 'npm';
  const args = windows
    ? ['/d', '/s', '/c', action === 'install' ? 'npm ci' : 'npm run build']
    : action === 'install' ? ['ci'] : ['run', 'build'];
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: root, stdio: 'inherit', env: process.env });
    child.on('error', () => reject(new Error('Could not start npm. Install Node.js with npm included, then reopen the launcher.')));
    child.on('close', code => code === 0 ? resolve() : reject(new Error(`The ${action} step failed. See the error above.`)));
  });
}

async function main() {
  console.log('\nFreeLLMAPI Video Studio\n');
  const lockHash = createHash('sha256').update(readFileSync(path.join(root, 'package-lock.json'))).digest('hex');
  const installStamp = path.join(root, '.studio-install.json');
  let installedHash;
  try { installedHash = JSON.parse(readFileSync(installStamp, 'utf8')).lockHash; } catch { /* first launch */ }
  if (!existsSync(path.join(root, 'node_modules/.package-lock.json')) || installedHash !== lockHash) {
    console.log('Step 1/3: installing the locked dependencies. First launch needs internet access.');
    await runNpm('install');
    writeFileSync(installStamp, JSON.stringify({ lockHash }) + '\n');
  } else {
    console.log('Step 1/3: dependencies are already installed.');
  }
  console.log('\nStep 2/3: preparing the app.');
  await runNpm('build');
  console.log('\nStep 3/3: starting your private video studio. Keep this window open while using it.');
  const args = [path.join(root, 'scripts/start-video-studio.mjs')];
  if (!process.argv.includes('--no-open')) args.push('--open');
  const server = spawn(process.execPath, args, { cwd: root, stdio: 'inherit', env: process.env });
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.kill(signal));
  await new Promise((resolve, reject) => {
    server.on('error', () => reject(new Error('Could not start the video studio.')));
    server.on('close', code => code === 0 ? resolve() : reject(new Error('The studio stopped. See the error above.')));
  });
}

main().catch(error => { console.error('\n' + error.message); process.exitCode = 1; });
