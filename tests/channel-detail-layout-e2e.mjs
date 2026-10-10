/** Regression for the timeline channel detail header. Run against a local Vite server. */
import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';

const base = process.env.E2E_URL || 'http://127.0.0.1:5173';
const browser = await chromium.launch(process.env.CHROME_PATH
  ? { executablePath: process.env.CHROME_PATH, headless: true }
  : { channel: process.env.CHROME_CHANNEL || 'chrome', headless: true });

try {
  const page = await browser.newPage({ viewport: { width: 873, height: 703 }, locale: 'zh-CN' });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(`${base}/?d=2000-05-10&t=12%3A30&tz=8&view=timeline`);
  await page.waitForFunction(() => document.querySelector('#timeline-view .tl-table')?.getAttribute('aria-busy') === 'false',
    null, { timeout: 120000 });

  const selectMoment = async (date, time, utc) => {
    await page.locator('#timeline-view [data-field="date"]').fill(date);
    await page.locator('#timeline-view [data-field="time"]').fill(time);
    await page.waitForFunction(expected => {
      const table = document.querySelector('#timeline-view .tl-table');
      return table?.getAttribute('aria-busy') === 'false' && Number(table.dataset.selected) === expected;
    }, Date.parse(utc), { timeout: 120000 });
  };

  // The review example is a 7–31 channel completed by transit at this instant.
  await selectMoment('2026-09-26', '17:51:02', '2026-09-26T09:51:02Z');
  await page.locator('#timeline-view .tl-row[data-key="channel:7-31"] .tl-row-name').click();
  await page.locator('#gate-detail:not(.hidden) .tl-detail-timing[data-kind="channel"][data-id="7-31"]').waitFor();

  const inspect = () => page.locator('#gate-detail .gate-detail-body').evaluate(body => {
    const header = body.querySelector(':scope > .tl-detail-header');
    const heading = header?.querySelector(':scope > .tl-detail-heading');
    const timing = header?.querySelector(':scope > .tl-detail-timing');
    const description = heading?.querySelector('.gate-detail-desc');
    const status = heading?.querySelector('.tl-detail-channel-status');
    const label = heading?.querySelector('.detail-label');
    const timingSource = timing?.querySelector('.tl-timing-source');
    const rect = node => {
      const { top, bottom, left, right, width } = node.getBoundingClientRect();
      return { top, bottom, left, right, width };
    };
    return {
      header: header && rect(header), heading: heading && rect(heading),
      timing: timing && rect(timing), description: description && rect(description),
      status: status && rect(status), label: label && rect(label),
      timingSource: timingSource && rect(timingSource),
      descriptionText: description?.textContent.trim(),
      allDescriptionText: body.querySelector('.gate-detail-desc')?.textContent.trim(),
      descriptionCount: [...body.querySelectorAll('.gate-detail-desc')]
        .filter(node => node.textContent.includes('两个闸门均已激活')).length,
      directDescriptionCount: [...body.querySelectorAll(':scope > .gate-detail-desc')]
        .filter(node => node.textContent.includes('两个闸门均已激活')).length,
      headerIsTwoColumns: header && getComputedStyle(header).gridTemplateColumns.split(' ').length === 2,
      bodyOverflow: body.scrollWidth - body.clientWidth,
      card: rect(body.closest('.gate-detail-card')),
      viewport: innerWidth,
    };
  });

  const desktop = await inspect();
  assert.match(desktop.allDescriptionText || '', /两个闸门均已激活/,
    `review instant has a connected 7–31 channel: ${JSON.stringify(desktop)}`);
  assert.equal(desktop.descriptionCount, 1, 'channel status explanation is rendered once');
  assert.equal(desktop.directDescriptionCount, 0, 'channel status explanation belongs to the left header column');
  assert.ok(desktop.headerIsTwoColumns && desktop.heading.right < desktop.timing.left &&
    desktop.description.left >= desktop.heading.left - 1 &&
    desktop.description.right <= desktop.heading.right + 1,
  `desktop keeps the channel summary left of timing: ${JSON.stringify(desktop)}`);
  assert.ok(Math.abs(desktop.label.top - desktop.timingSource.top) <= 3,
    `channel title and timing content start on the same line: ${JSON.stringify(desktop)}`);
  assert.ok(desktop.description.top >= desktop.status.bottom - 1 &&
    Math.abs(desktop.description.bottom - desktop.timing.bottom) <= 24,
  `channel summary fills the lower left header alongside timing: ${JSON.stringify(desktop)}`);

  await page.setViewportSize({ width: 390, height: 844 });
  const mobile = await inspect();
  assert.equal(mobile.descriptionCount, 1);
  assert.equal(mobile.directDescriptionCount, 0);
  assert.ok(mobile.heading.bottom <= mobile.timing.top + 1 &&
    mobile.description.top >= mobile.status.bottom - 1 &&
    mobile.description.right <= mobile.heading.right + 1,
  `phone stacks the channel summary before timing: ${JSON.stringify(mobile)}`);
  assert.ok(mobile.card.left >= -1 && mobile.card.right <= mobile.viewport + 1 &&
    mobile.bodyOverflow <= 1,
  `phone detail fits without horizontal clipping: ${JSON.stringify(mobile)}`);

  const assertSharedHeadingAlignment = async kind => {
    const desktopLayout = await inspect();
    assert.ok(desktopLayout.headerIsTwoColumns &&
      desktopLayout.heading.right < desktopLayout.timing.left &&
      Math.abs(desktopLayout.label.top - desktopLayout.timingSource.top) <= 3,
    `${kind} title and timing are aligned at desktop width: ${JSON.stringify(desktopLayout)}`);
    await page.setViewportSize({ width: 390, height: 844 });
    const phoneLayout = await inspect();
    assert.ok(phoneLayout.heading.bottom <= phoneLayout.timing.top + 1 &&
      phoneLayout.card.left >= -1 && phoneLayout.card.right <= phoneLayout.viewport + 1 &&
      phoneLayout.bodyOverflow <= 1,
    `${kind} title and timing stack within the phone sheet: ${JSON.stringify(phoneLayout)}`);
    await page.setViewportSize({ width: 873, height: 703 });
    await page.keyboard.press('Escape');
  };

  await page.setViewportSize({ width: 873, height: 703 });
  await page.keyboard.press('Escape');
  await page.locator('#timeline-view .tl-row[data-key="gate:7"] .tl-row-name').click();
  await page.locator('#gate-detail:not(.hidden) .tl-detail-timing[data-kind="gate"][data-id="7"]').waitFor();
  await assertSharedHeadingAlignment('gate 7');

  // Use the interior of the active interval. The old 21:00:51 sample lies
  // six seconds before the current annual ephemeris interval (21:00:57).
  await selectMoment('2026-09-27', '21:05:00', '2026-09-27T13:05:00Z');
  await page.locator('#timeline-view .tl-row[data-key="center:heart"] .tl-row-name').click();
  await page.locator('#gate-detail:not(.hidden) .tl-detail-timing[data-kind="center"][data-id="heart"]').waitFor();
  await assertSharedHeadingAlignment('heart center');
  assert.deepEqual(errors, []);
  console.log('Timeline channel, gate, and center detail headers passed at 873px and 390px.');
  await page.close();
} finally {
  await browser.close();
}
