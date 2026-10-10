import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { PROFILE_STORAGE_KEY } from '../src/lib/profile-storage.js';
const base = process.env.E2E_URL;
assert.ok(base, 'Set E2E_URL to the running app.');
const browser = await chromium.launch({ channel: process.env.CHROME_CHANNEL || 'chromium', headless: true });
const people = Array.from({ length: 3 }, (_, i) => ({ id: `fictional-knowledge-${i}`, name: `Fictional ${i}`, birthDate: `198${i}-05-16`, birthTime: '12:00', timeUnknown: false, location: { timezone: 0 } }));
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = []; page.on('pageerror', error => errors.push(error.message));
try {
 await page.addInitScript(({ key, people }) => { localStorage.setItem('ohd-language','en'); localStorage.setItem(key,JSON.stringify(people)); localStorage.setItem('ohd-last-person-id',people[0].id); }, { key: PROFILE_STORAGE_KEY, people });
 await page.goto(base); await page.locator('#chart-view:not(.hidden)').waitFor({ timeout: 120000 });
 const inventory = await page.evaluate(async () => { const { listKnowledgeEntries, getKnowledgeEntry } = await import('/src/lib/knowledge/registry.js'); return { original: listKnowledgeEntries().length, all: listKnowledgeEntries({ includePenta: true }).length, gate: getKnowledgeEntry({ objectType:'penta', objectId:'gate:31' }).summaryStatus }; });
 assert.deepEqual(inventory, { original: 70, all: 91, gate: 'missing' });
 await page.locator('.nav-link[data-view="team"]').click();
 for (const person of people) await page.locator(`#team-direct-people input[data-person-id="${person.id}"]`).check();
 await page.locator('#team-calculate').click(); await page.locator('.penta-canvas').waitFor({ timeout: 90000 });
 assert.equal(await page.locator('.penta-knowledge-nav button').count(), 3);
 // Contract change: all facts and evidence are persistent; graph actions navigate and focus them.
 await page.locator('.penta-gate-hit[data-gate="31"]').click();
 const active = page.locator('.penta-active-detail');
 assert.equal(await active.locator('[data-knowledge-id="hd.penta.gate.31"]').count(),1);
 assert.equal(await active.locator('.penta-structure-facts').count(),1);
 assert.equal(await active.locator('[data-detail-status="missing"]').count(),1);
 assert.match(await active.innerText(), /Verified structural sources/);
 assert.match(await active.innerText(), /Fictional|Contributors/);
 assert.match(await active.innerText(), /Specific interpretation has not been verified/);
 await page.locator('.penta-channel-hit[data-channel="7-31"]').click();
 assert.equal(await active.locator('[data-knowledge-id="hd.penta.channel.7-31"]').count(),1);
 assert.equal(await active.locator('.penta-knowledge-sources a').count(),1);
 assert.equal(await active.locator('[data-detail-status="missing"]').count(),1);
 assert.match(await active.innerText(), /BG5 Semester 3/);
 await page.locator('[data-penta-knowledge="introduction"]').click();
 assert.match(await active.innerText(), /Sacral Center/);
 await page.locator('[data-penta-knowledge="powerColumn"]').click();
 assert.equal(await active.locator('.penta-knowledge-sources a').count(),3);
 assert.match(await active.innerText(), /G Center role gates/);
 for (const locale of ['zh-CN','zh-Hant']) {
  await page.evaluate(async locale => { (await import('/src/lib/i18n.js')).setLocale(locale,{persist:false}); },locale);
  await page.locator('.penta-gate-hit[data-gate="31"]').click();
  assert.match(await active.innerText(), locale === 'zh-CN' ? /已核实结构资料/ : /已核實結構資料/);
  assert.match(await active.innerText(), locale === 'zh-CN' ? /专属解读尚未核实/ : /專屬解讀尚未核實/);
 }
 assert.deepEqual(errors, []);
 console.log('PASS persistent Penta knowledge, source inventory, missing evidence and three locales');
} finally { await browser.close(); }
