/**
 * Touch preview contract — the overlay on a device that cannot hover.
 *
 *   E2E_URL=http://127.0.0.1:10015 node tests/mobile/touch-preview-contract.mjs
 *
 * Why this exists
 * ---------------
 * Chrome replays a compatibility hover after a tap: it dispatches `pointerover` with
 * `pointerType: "mouse"` at the point of the last touch, again whenever the layout under
 * that point changes. On the sleep chart that is exactly what happened after leaving the
 * view and coming back — a redrawn graph appeared under the stale point, the renderer
 * read the event as a mouse hover and left a preview ("骶骨中心未定义" in the run that
 * caught it) floating with no finger on the screen.
 *
 * The stylesheet already accepts the rule for the hover ring — `@media (hover: none)`
 * switches it off — so this file asks the renderer to follow the same rule. The real
 * gesture is covered by `dream-mobile-acceptance.mjs`; here the compatibility event is
 * replayed deliberately, because that is the event Chrome sends and the one a user
 * cannot reproduce on purpose.
 */
import assert from 'node:assert/strict';
import { chromium, devices } from 'playwright-core';
import { PROFILE_STORAGE_KEY } from '../../src/lib/profile-storage.js';

const BASE = (process.env.E2E_URL || 'http://127.0.0.1:10015').replace(/\/$/, '');
const people = [
  { id: 'mobile-a', name: 'Fictional A', birthDate: '1987-04-12', birthTime: '06:30', timeUnknown: false, location: { timezone: 0 } }
];

let failures = 0;
const ok = name => console.log(`✔ ${name}`);
const fail = (name, error) => { failures++; console.error(`✖ ${name}\n  ${error?.message || error}`); };
async function check(name, fn) {
  try { await fn(); ok(name); } catch (error) { fail(name, error); }
}

const browser = await chromium.launch({ channel: process.env.CHROME_CHANNEL || 'chromium', headless: true });
const context = await browser.newContext({
  ...devices['Pixel 7'],
  viewport: { width: 390, height: 844 },
  hasTouch: true,
  isMobile: true,
  locale: 'zh-CN',
  timezoneId: 'UTC'
});
const page = await context.newPage();
page.setDefaultTimeout(60000);
const cdp = await context.newCDPSession(page);
await page.addInitScript(({ key, people }) => {
  localStorage.setItem('ohd-language', 'zh-CN');
  localStorage.setItem(key, JSON.stringify(people));
  localStorage.setItem('ohd-last-person-id', people[0].id);
}, { key: PROFILE_STORAGE_KEY, people });
await page.goto(BASE);
await page.locator('#chart-view:not(.hidden)').waitFor({ timeout: 180000 });
await page.evaluate(() => document.querySelector('.nav-link[data-view="dream"]').click());
await page.waitForSelector('#dream-content .dream-type-strip', { timeout: 120000 });
await page.waitForTimeout(900);

const openOverlays = () => page.evaluate(() => [...document.querySelectorAll('.bg-tooltip')]
  .filter(node => node.matches(':popover-open'))
  .map(node => node.textContent.trim().slice(0, 40)));

const gatePoint = () => page.evaluate(() => {
  const disc = document.querySelector('#dream-bodygraph .bg-gate .bg-gate-circle');
  disc.scrollIntoView({ block: 'center', behavior: 'instant' });
  const rect = disc.getBoundingClientRect();
  return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
});
await gatePoint();
await page.waitForTimeout(250);

await check('the phone really cannot hover', async () => {
  const capability = await page.evaluate(() => ({
    hover: matchMedia('(hover: hover)').matches,
    anyHover: matchMedia('(any-hover: hover)').matches
  }));
  assert.equal(capability.hover, false, `this context claims hover support: ${JSON.stringify(capability)}`);
});

await check("Chrome's compatibility hover opens no preview on a hover-less device", async () => {
  const point = await gatePoint();
  // Exactly what the browser sends after a tap: pointerType "mouse" at the touch point.
  await page.evaluate(({ point }) => {
    const target = document.elementFromPoint(point.x, point.y);
    target.dispatchEvent(new PointerEvent('pointerover', {
      bubbles: true, clientX: point.x, clientY: point.y, pointerType: 'mouse'
    }));
  }, { point });
  await page.waitForTimeout(300);
  const overlays = await openOverlays();
  assert.deepEqual(overlays, [], `a compatibility hover left ${JSON.stringify(overlays)} on screen`);
});

await check('a real press still previews, and releasing clears it', async () => {
  const point = await gatePoint();
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: point.x, y: point.y }] });
  await page.waitForTimeout(450);
  const during = await openOverlays();
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await page.waitForTimeout(400);
  const after = await openOverlays();
  assert.equal(during.length, 1, 'a press showed no preview');
  assert.deepEqual(after, [], 'the preview stayed after release');
  // A tap opens the sheet: that is the shipped interaction, so the harness clears it.
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
});

await browser.close();
if (failures) {
  console.error(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log('\nall touch preview checks passed');
