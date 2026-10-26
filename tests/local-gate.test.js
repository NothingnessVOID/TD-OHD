import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { shouldShowLocalGate, passwordControlsVisible } from '../src/lib/local-gate.js';

// The gate mirrors what the service enforces; it never decides on its own.
test('the unlock gate is skipped only when the service reports no password', () => {
  assert.equal(shouldShowLocalGate({ passwordRequired: false, authenticated: true }), false);
  assert.equal(shouldShowLocalGate({ passwordRequired: false, authenticated: false }), false);
  assert.equal(shouldShowLocalGate({ passwordRequired: true, authenticated: false }), true);
  assert.equal(shouldShowLocalGate({ passwordRequired: true, authenticated: true }), false);
  // Missing or malformed status keeps the original fail-closed behaviour.
  assert.equal(shouldShowLocalGate(undefined), true);
  assert.equal(shouldShowLocalGate(null), true);
  assert.equal(shouldShowLocalGate({}), true);
});

test('lock and change-password controls follow the same flag', () => {
  assert.equal(passwordControlsVisible({ passwordRequired: false }), false);
  assert.equal(passwordControlsVisible({ passwordRequired: true }), true);
  assert.equal(passwordControlsVisible(undefined), true);
  assert.equal(passwordControlsVisible({}), true);
});

test('the local account screen hides password controls through the shared flag', () => {
  const source = readFileSync(new URL('../src/lib/local-account.js', import.meta.url), 'utf8');
  assert.match(source, /if \(!shouldShowLocalGate\(info\)\)/);
  assert.match(source, /const passwordRequired = passwordControlsVisible\(localAccount\)/);
  // The popover markup is conditional, not merely hidden with CSS.
  assert.match(source, /const passwordSettings = passwordRequired \?/);
  assert.match(source, /const lockMarkup = passwordRequired \?/);
  assert.doesNotMatch(source, /local-lock'\)\.onclick/);
  assert.doesNotMatch(source, /local-change-password'\)\.onsubmit/);
});
