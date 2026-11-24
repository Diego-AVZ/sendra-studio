import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';

const exec = promisify(execFile);
const root = process.cwd();
const src = path.resolve(root, '../web-frontend/charting_library');
const dest = path.join(root, 'public', 'charting_library');

async function exists(target) {
  try {
    await fs.lstat(target);
    return true;
  } catch {
    return false;
  }
}

if (!(await exists(path.join(src, 'charting_library.standalone.js')))) {
  console.warn('[tradingview] Charting library not found next to this app. The spot chart will not load.');
  process.exit(0);
}

if ((await exists(path.join(dest, 'charting_library.standalone.js'))) && (await exists(path.join(dest, 'bundles')))) {
  process.exit(0);
}

await fs.mkdir(path.dirname(dest), { recursive: true });
if (await exists(dest)) await fs.rm(dest, { recursive: true, force: true });

if (process.platform === 'win32') {
  await exec('cmd', ['/c', 'mklink', '/J', dest, src]);
} else {
  try {
    await fs.symlink(src, dest, 'dir');
  } catch {
    await fs.cp(src, dest, { recursive: true });
  }
}
