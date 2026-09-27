import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { once } from 'node:events';
import { chromium } from 'playwright-core';
import { createLocalServer } from '../local/server.mjs';

const dir = mkdtempSync(join(tmpdir(), 'ohd-observations-desktop-'));
const server = createLocalServer({ dataDir: dir, referencePages: false });
const chrome = process.env.CHROME_PATH
  ? { executablePath: process.env.CHROME_PATH }
  : { channel: process.env.CHROME_CHANNEL || 'chrome' };
let browser;
try {
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({ ...chrome, headless: true });
  const first = await browser.newContext({ locale: 'en-GB' });
  const pageA = await first.newPage();
  await pageA.goto(base + '/#observations');
  await pageA.locator('#local-password').fill('desktop-test-password');
  await pageA.locator('#local-confirm').fill('desktop-test-password');
  await pageA.locator('#local-auth-submit').click();
  await pageA.locator('.ob-editor textarea[name="raw"]').fill('Saved in SQLite.');
  await pageA.locator('.ob-editor [type="submit"]').click();
  await pageA.getByText('Observation saved.').waitFor();

  const second = await browser.newContext({ locale: 'en-GB' });
  const pageB = await second.newPage();
  await pageB.goto(base + '/#observations');
  await pageB.locator('#local-password').fill('desktop-test-password');
  await pageB.locator('#local-auth-submit').click();
  await pageB.locator('.ob-list-item').first().click();
  assert.equal(await pageB.locator('.ob-editor textarea[name="raw"]').inputValue(), 'Saved in SQLite.');
  console.log('Desktop observations persist across independent browser sessions.');
} finally {
  if (browser) await browser.close();
  if (server.listening) { const closed = once(server, 'close'); server.close(); server.closeAllConnections(); await closed; }
  rmSync(dir, { recursive: true, force: true });
}
