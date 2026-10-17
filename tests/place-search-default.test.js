import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../src/lib/placesearch.js', import.meta.url), 'utf8');

test('createPlaceSearch starts in birthplace mode and only opens manual when offset exists without iana', () => {
  assert.match(source, /let manualMode = false/);
  assert.match(source, /const hasIana = Boolean\(location\?\.iana\)/);
  assert.match(source, /manualMode = !hasIana && timezone != null && timezone !== ''/);
  assert.match(source, /toggle\.textContent = manualMode \? t\('Search birth place'\) : t\('Enter UTC offset'\)/);
});
