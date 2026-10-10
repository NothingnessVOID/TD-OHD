import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';

// Run against the development server. Use a LAN IP to exercise an HTTP
// non-secure context, not localhost's special secure-context exemption.
const base = (process.env.E2E_URL || 'http://127.0.0.1:9961').replace(/\/$/, '');
const browser = await chromium.launch({ channel: process.env.CHROME_CHANNEL || 'chromium', headless: true });
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 960 }, locale: 'zh-CN' });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(`${base}/dev/test-people.html`);
  await page.locator('#import:not([disabled])').waitFor();
  await page.locator('#import').click();
  assert.match(await page.locator('#status').innerText(), /新增 10 位/);
  await page.locator('#import').click();
  assert.match(await page.locator('#status').innerText(), /跳过已有 10 位/);
  await page.goto(base);
  await page.locator('#chart-view:not(.hidden)').waitFor({ timeout: 120000 });
  const result = await page.evaluate(async () => {
    const { listPeople, birthFromPerson } = await import('/src/lib/people.js');
    const { computeChart } = await import('/src/lib/chartdata.js');
    const { createMember } = await import('/src/lib/human-design/team-members.js');
    const { saveTeam } = await import('/src/lib/team-repository.js');
    const people = listPeople().filter(person => person.id.startsWith('td-ohd-fictional-'));
    const members = people.slice(0, 3).map(person => createMember({ personId: person.id, displayName: person.name, origin: 'saved' }));
    const values = new Map();
    const storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
    const team = saveTeam({ name: 'Isolated LAN test', members, groups: [] }, storage);
    const { chart } = await computeChart(birthFromPerson(people[0]));
    return { secureContext: isSecureContext, nativeUuid: typeof crypto.randomUUID, people: people.length,
      memberIds: members.map(member => member.memberId), teamId: team.teamId, chartType: chart.type.name };
  });
  assert.equal(result.people, 10);
  assert.ok(result.chartType);
  for (const id of [...result.memberIds, result.teamId]) assert.match(id, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  const url = new URL(base);
  if (url.protocol === 'http:' && !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) {
    assert.equal(result.secureContext, false, 'LAN HTTP must exercise the non-secure-context path');
    assert.equal(result.nativeUuid, 'undefined', 'test the UUID fallback, not a secure-context browser exception');
  }
  for (const resource of ['/docs/handoff/2026-10-10/01-PROJECT-STATUS.md', '/.env.production']) {
    const response = await context.request.get(base + resource);
    assert.equal(response.status(), 403, `private development resource denied: ${resource}`);
  }
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ result: 'passed', base, ...result, privateResources: 'denied' }));
  await context.close();
} finally {
  await browser.close();
}
