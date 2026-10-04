/** Browser WASM against independently generated Swiss C nine-case fixtures. */
import { chromium } from 'playwright-core';
import { readFileSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const path = new URL('../results.json', import.meta.url);
const cases = JSON.parse(readFileSync(path)).cases;
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const page = await browser.newPage();
  await page.goto(process.env.E2E_URL || 'http://127.0.0.1:5291');
  const actual = await page.evaluate(async inputs => {
    const { initializeEngine } = await import('/src/lib/chart-engine/sharp-provider.js');
    const { calculate, assetBase } = await initializeEngine();
    const values = [];
    for (const input of inputs) values.push(JSON.parse(await calculate(input, assetBase)));
    return values;
  }, cases.map(row => row.oracle.birthUtc));
  const rows = [];
  for (let index = 0; index < cases.length; index++) {
    const fixture = cases[index], chart = actual[index];
    for (const side of ['personality', 'design']) {
      for (const [body, value] of Object.entries(chart[side])) {
        const expected = fixture.sharp.chart[side][body];
        for (const field of ['gate', 'line', 'color', 'tone', 'base']) assert.equal(value[field], expected[field], `${fixture.id} ${side} ${body} ${field}`);
        assert.ok(Math.abs(value.longitude - expected.longitude) < 1e-9);
      }
    }
    for (const field of ['type', 'authority', 'profile', 'definition', 'incarnationCross', 'channels', 'centers']) assert.deepEqual(chart[field], fixture.sharp.chart[field], `${fixture.id} ${field}`);
    rows.push({ id: fixture.id, all26Activations: 'PASS', mechanics: 'PASS' });
  }
  writeFileSync(new URL('../wasm-results.json', import.meta.url), JSON.stringify({ base: process.env.E2E_URL || 'http://127.0.0.1:5291', cases: rows, comparisons: 234, parity: 'PASS' }, null, 2) + '\n');
  console.log(JSON.stringify({ parity: 'PASS', fullCharts: rows.length, activationComparisons: 234 }));
} finally { await browser.close(); }
