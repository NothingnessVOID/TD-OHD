import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const root = resolve(import.meta.dirname, '..');
const forbidden = ['natal', 'engine'].join('');
async function files(path) {
  const entries = await readdir(path, { withFileTypes: true });
  const nested = await Promise.all(entries.filter(entry => !['bin', 'obj', 'node_modules'].includes(entry.name)).map(async entry => {
    const file = resolve(path, entry.name);
    return entry.isDirectory() ? files(file) : [file];
  }));
  return nested.flat();
}
test('the removed astronomy package cannot return to code or dependency manifests', async () => {
  const targets = ['src', 'scripts', 'engine-core', 'engine-tools', 'engine-wasm', 'tests', 'worker'];
  const paths = (await Promise.all(targets.map(dir => files(resolve(root, dir))))).flat();
  paths.push(resolve(root, 'package.json'), resolve(root, 'package-lock.json'));
  const violations = [];
  for (const path of paths.filter(file => /\.(?:js|mjs|cs|csproj|json)$/.test(file))) {
    if ((await readFile(path, 'utf8')).toLowerCase().includes(forbidden)) violations.push(path.slice(root.length + 1));
  }
  assert.deepEqual(violations, [], 'no imports, dependencies, compatibility patches or copied runtime references');
});
