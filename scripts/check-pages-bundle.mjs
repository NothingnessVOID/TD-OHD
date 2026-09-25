import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = process.argv[2] || fileURLToPath(new URL('../dist/', import.meta.url));
const forbidden = [/\/api\/local\//, /ohd_session/, /local-account/i];

function check(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) { check(path); continue; }
    if (forbidden.some(pattern => pattern.test(entry.name))) {
      throw new Error(`Local account asset leaked into Pages bundle: ${path}`);
    }
    if (!/\.(?:html|js|css)$/.test(entry.name)) continue;
    const content = readFileSync(path, 'utf8');
    if (forbidden.some(pattern => pattern.test(content))) {
      throw new Error(`Local account code leaked into Pages bundle: ${path}`);
    }
  }
}

check(root);
console.log('Pages bundle excludes the local account client.');
