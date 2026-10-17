import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import '../src/lib/wa/ui-messages.js';
import { t, setLocale } from '../src/lib/i18n.js';

const source = readFileSync(new URL('../src/views/wa.js', import.meta.url), 'utf8');
const css = readFileSync(new URL('../src/styles/wa.css', import.meta.url), 'utf8');

test('show-names toggle is localized in all three locales', () => {
  for (const [locale, text] of [['zh-CN', '显示姓名'], ['zh-Hant', '顯示姓名'], ['en', 'Show names']]) {
    setLocale(locale, { persist: false });
    assert.equal(t('Wa UI show names'), text);
  }
});

test('show-names is a UI-only localStorage pref, default on, rendering number + escaped truncated name', () => {
  assert.match(source, /SHOW_NAMES_PREF = 'ohd-wa-ui-show-member-names-v1'/);
  assert.match(source, /getItem\(SHOW_NAMES_PREF\)/);
  assert.match(source, /if \(v == null\) return true/);
  assert.match(source, /data-wa-show-names/);
  assert.match(source, /wa-row-member-name">\$\{esc\(nameOf\(id\)\)\}/);
  assert.match(css, /\.wa-row-member-name \{[^}]*text-overflow:ellipsis/);
});
