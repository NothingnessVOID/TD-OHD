import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
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
    let source = await readFile(path, 'utf8');
    const relative = path.slice(root.length + 1).replaceAll('\\', '/');
    // Phase 1B checks that the legacy storage key is untouched. Permit only
    // these two exact fixture/assertion lines, never the entire test file.
    if (relative === 'tests/team-members-phase1b.test.js') {
      assert.equal(createHash('sha256').update(source).digest('hex'),
        '839077d4ed2361815023bf95de88c34d6b789f9072501cc6654d79ad21ebed55',
        'Phase 1B storage-key exception requires the frozen test digest');
      for (const line of [
        `  const data = new Map([['${forbidden}_profiles', 'untouched'], ['ohd-last-person-id', 'person-a']]);`,
        `  assert.equal(store.data.get('${forbidden}_profiles'), 'untouched');`
      ]) {
        assert.equal(source.split(line).length, 2, `exact Phase 1B storage isolation check: ${relative}`);
        source = source.replace(line, '');
      }
    }
    if (source.toLowerCase().includes(forbidden)) violations.push(relative);
  }
  assert.deepEqual(violations, [], 'no imports, dependencies, compatibility patches or copied runtime references');
});
