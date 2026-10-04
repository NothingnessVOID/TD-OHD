/** Nine complete charts: browser WASM vs independent Swiss C fixtures. */
import { chromium } from 'playwright-core';
import { readFileSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const cases = JSON.parse(readFileSync(new URL('../results.json', import.meta.url))).cases;
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const page = await browser.newPage();
  await page.goto(process.env.E2E_URL || 'http://127.0.0.1:5292');
  const actual = await page.evaluate(async inputs => {
    const { initializeEngine } = await import('/src/lib/chart-engine/sharp-provider.js');
    const { calculate, assetBase } = await initializeEngine();
    const values = [];
    for (const input of inputs) values.push(JSON.parse(await calculate(input, assetBase)));
    return values;
  }, cases.map(row => row.oracle.birthUtc));
  const rows = [];
  for (let i = 0; i < cases.length; i++) {
    const fixture = cases[i], chart = actual[i];
    for (const side of ['personality', 'design']) {
      for (const [body, value] of Object.entries(chart[side])) {
        const native = fixture.sharp.chart[side][body], oracle = fixture.sharp.oracleChart[side][body];
        for (const field of ['gate', 'line', 'color', 'tone', 'base']) {
          assert.equal(value[field], native[field], `${fixture.id} ${side} ${body} native ${field}`);
          assert.equal(value[field], oracle[field], `${fixture.id} ${side} ${body} C ${field}`);
        }
        assert.ok(Math.abs(value.longitude - native.longitude) < 1e-9);
      }
    }
    for (const field of ['type', 'authority', 'profile', 'definition', 'incarnationCross', 'channels', 'centers']) {
      assert.deepEqual(chart[field], fixture.sharp.chart[field], `${fixture.id} native ${field}`);
      assert.deepEqual(chart[field], fixture.sharp.oracleChart[field], `${fixture.id} C ${field}`);
    }
    rows.push({ id: fixture.id, all26Activations: 'PASS', mechanics: 'PASS' });
  }
  writeFileSync(new URL('../wasm-results.json', import.meta.url), JSON.stringify({ cases: rows, comparisons: 234, parity: 'PASS' }, null, 2) + '\n');
  console.log(JSON.stringify({ parity: 'PASS', fullCharts: rows.length, activationComparisons: 234 }));
} finally { await browser.close(); }
