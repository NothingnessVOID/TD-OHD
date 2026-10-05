import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { isSyncAvailable } from '../src/lib/sync-config.js';
import { resolveLocale } from '../src/lib/initial-locale.js';

test('empty, whitespace and disabled API config do not activate sync', () => {
  for (const base of [undefined, '', '   ']) assert.equal(isSyncAvailable(base), false);
  assert.equal(isSyncAvailable('https://example.invalid'), true);
  assert.equal(isSyncAvailable('/api', 'false'), false);
  assert.equal(isSyncAvailable('/api', 'true'), true);
});
test('pre-paint locale policy matches runtime and begins with no visible birth entry', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
  for (const saved of [null, '', 'invalid', 'en', 'zh-CN', 'zh-Hant']) {
    const document = { documentElement: {} };
    new Function('localStorage', 'document', script)({ getItem: () => saved }, document);
    assert.equal(document.documentElement.lang, resolveLocale(saved));
  }
  assert.match(html, /<html lang="zh-CN" translate="no" data-booting>/);
  assert.match(html, /id="birth-entry" class="hidden /);
});
