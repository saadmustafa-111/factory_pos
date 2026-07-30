import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';

const rootDir = process.cwd();
const cacheDir = path.join(rootDir, '.cache');
const electronGypDir = path.join(cacheDir, 'electron-gyp');
const electronCacheDir = path.join(cacheDir, 'electron');
const homeDir = path.join(cacheDir, 'home');
const cliPath = path.join(
  rootDir,
  'node_modules',
  '@electron',
  'rebuild',
  'lib',
  'cli.js',
);

await mkdir(electronGypDir, { recursive: true });
await mkdir(electronCacheDir, { recursive: true });
await mkdir(homeDir, { recursive: true });

const child = spawn(
  process.execPath,
  [cliPath, '--force', '--sequential', '--module-dir', 'backend'],
  {
    cwd: rootDir,
    stdio: 'inherit',
    env: {
      ...process.env,
      HOME: homeDir,
      USERPROFILE: homeDir,
      ELECTRON_CACHE: electronCacheDir,
    },
  },
);

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 1);
});
