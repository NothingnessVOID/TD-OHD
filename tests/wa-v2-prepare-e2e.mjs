/** Targeted real-WASM regression: runtime charts need not satisfy stored JSON shape. */
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { createServer } from 'vite';

const server = await createServer({ configFile: false, root: fileURLToPath(new URL('..', import.meta.url)),
  server: { host: '127.0.0.1', port: Number(process.env.WA_TEST_PORT || 5189), strictPort: true }, logLevel: 'error' });
server.middlewares.use('/__wa-prepare-test', (_request, response) => {
  response.setHeader('Content-Type', 'text/html');
  response.end('<!doctype html><html><head><title>Synthetic Wa prepare test</title></head><body></body></html>');
});
let browser;
try {
  await server.listen();
  const executablePath = process.env.CHROME_PATH || [
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
  ].find(existsSync);
  browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : { channel: 'chromium' }) });
  const page = await browser.newPage();
  await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/__wa-prepare-test`);
  const result = await page.evaluate(async () => {
    const { createWaDraft } = await import('/src/lib/wa/model.js');
    const { prepareWaMembers } = await import('/src/lib/wa/prepare.js');
    const { computeChart } = await import('/src/lib/chartdata.js');
    const { effectiveTeamBirth } = await import('/src/views/team-birth.js');
    const snapshot = createWaDraft({ organizationId: 'synthetic-real-prepare' });
    snapshot.layoutMode = 'observation';
    snapshot.members = [{ memberId: 'synthetic-member', personId: 'synthetic-person', labelSnapshot: 'Synthetic legacy person' }];
    snapshot.alphaId = 'synthetic-member';
    const person = { id: 'synthetic-person', name: 'Synthetic legacy person', birthDate: '2000-02-29', birthTime: '10:30',
      location: { timezone: 8 }, note: undefined };
    const known = await prepareWaMembers(snapshot, { getPerson: () => person, calculateBirth: computeChart, effectiveBirth: effectiveTeamBirth });
    const unknown = await prepareWaMembers(snapshot, { getPerson: () => ({ ...person, timeUnknown: true, birthTime: null }),
      calculateBirth: computeChart, effectiveBirth: effectiveTeamBirth });
    return { known: { status: known.status, issues: known.issues, timeUnknown: known.members[0]?.timeUnknown,
      personalityCount: Object.keys(known.members[0]?.chart?.gates?.personality ?? {}).length },
      unknown: { status: unknown.status, issues: unknown.issues, birthTime: unknown.members[0]?.birth.birthTime },
      schema: snapshot.schema, memberKeys: Object.keys(snapshot.members[0]).sort() };
  });
  assert.equal(result.known.status, 'ready', JSON.stringify(result));
  assert.equal(result.known.timeUnknown, false);
  assert.equal(result.known.personalityCount, 13);
  assert.equal(result.unknown.status, 'ready', JSON.stringify(result));
  assert.equal(result.unknown.birthTime, '12:00');
  assert.equal(result.schema, 'wa-refs-v1');
  assert.deepEqual(result.memberKeys, ['labelSnapshot', 'memberId', 'personId']);
  console.log('PASS real WASM computeChart -> prepare legacy missing flag, optional undefined, explicit unknown noon; refs snapshot unchanged');
} finally {
  await browser?.close();
  await server.close();
}
