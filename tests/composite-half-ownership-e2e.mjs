import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';

/**
 * Composite half-channel ownership, checked on the real SVG.
 *
 *   npx vite --host 127.0.0.1 --port 10024
 *   E2E_URL=http://127.0.0.1:10024 node tests/composite-half-ownership-e2e.mjs
 *
 * The defect this guards: a half-channel was coloured by who completed the channel
 * instead of by who carries that gate. With A completing 20-57 and B carrying only
 * gate 20 (a compromise), the 20 disc was striped but the 20 half-channel was solid
 * A. The gate-level ownership is the one the reader sees in the disc, so the half
 * must follow it. The compromise/dominance classification itself must not move.
 */

const BASE = process.env.E2E_URL || 'http://127.0.0.1:10024';

let failures = 0;
async function check(name, fn) {
  try {
    await fn();
    console.log(`✔ ${name}`);
  } catch (error) {
    failures++;
    console.error(`✖ ${name}\n  ${error.message || error}`);
  }
}

const browser = await chromium.launch({ channel: process.env.CHROME_CHANNEL || 'chrome', headless: true });
const errors = [];
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(BASE, { waitUntil: 'load' });
  await page.waitForSelector('#boot-status', { state: 'hidden' }).catch(() => {});

  /** Render one synthetic composite per case, in both topologies, and read the paint. */
  const read = page.evaluate(async () => {
    const { renderBodygraph } = await import('/src/bodygraph.js');
    const { CHANNELS } = await import('/src/lib/human-design/catalog.js');
    const { DREAM_TOPOLOGY } = await import('/src/lib/human-design/dream-topology.js');
    const { compositePalette } = await import('/src/lib/skin-registry.js');
    const pal = compositePalette();

    const chart = gates => {
      const channels = CHANNELS.filter(ch => ch.gates.every(gate => gates.includes(gate)));
      return {
        gates: { all: gates, personality: {}, design: {} },
        channels,
        centers: { definedNames: [...new Set(channels.flatMap(ch => ch.centers))] },
        type: { name: 'Generator' }, strategy: 'To Respond',
        authority: { name: 'Sacral Authority' }, profile: { numbers: '1/3' },
        definition: 'Single Definition'
      };
    };

    const paintOf = host => {
      const svg = host.querySelector('svg');
      const stripe = [...svg.querySelectorAll('pattern')].find(node => /-stripe-ab$/.test(node.id))?.id || null;
      const norm = value => value === (stripe ? `url(#${stripe})` : '\u0000') ? 'both'
        : value === pal.a ? 'A' : value === pal.b ? 'B'
        : /^url\(/.test(value || '') ? value : 'inactive';
      const gate = id => {
        const path = host.querySelector(`.bg-gate-path[data-gate="${id}"]`);
        const circle = host.querySelector(`.bg-gate[data-gate="${id}"] .bg-gate-circle`);
        return {
          path: path ? norm(path.getAttribute('fill')) : null,
          opacity: path ? path.getAttribute('opacity') : null,
          circle: circle ? norm(circle.getAttribute('fill')) : null
        };
      };
      return {
        '20': gate('20'),
        '57': gate('57'),
        spans: [...host.querySelectorAll('.bg-integration-span')].map(node => norm(node.getAttribute('fill')))
      };
    };

    const cases = [
      { name: 'A completes 20-57, B carries 20', a: [20, 57], b: [20], expect: { '20': 'both', '57': 'A' }, dynamic: 'compromise' },
      { name: 'A carries 20, B completes 20-57', a: [20], b: [20, 57], expect: { '20': 'both', '57': 'B' }, dynamic: 'compromise' },
      { name: 'A completes 20-57, B carries 57', a: [20, 57], b: [57], expect: { '20': 'A', '57': 'both' }, dynamic: 'compromise' },
      { name: 'A carries 57, B completes 20-57', a: [57], b: [20, 57], expect: { '20': 'B', '57': 'both' }, dynamic: 'compromise' },
      { name: 'both complete 20-57', a: [20, 57], b: [20, 57], expect: { '20': 'both', '57': 'both' }, dynamic: 'companionship' },
      { name: 'A carries 20, B carries 57', a: [20], b: [57], expect: { '20': 'A', '57': 'B' }, dynamic: 'electromagnetic' },
      { name: 'A carries 57, B carries 20', a: [57], b: [20], expect: { '20': 'B', '57': 'A' }, dynamic: 'electromagnetic' },
      { name: 'A completes 20-57, B carries neither', a: [20, 57], b: [], expect: { '20': 'A', '57': 'A' }, dynamic: 'dominance' },
      { name: 'both carry 20 only, 20-57 open', a: [20], b: [20], expect: { '20': 'both', '57': 'inactive' }, dynamic: null }
    ];

    const out = [];
    for (const [topologyName, topology] of [['standard', null], ['dream', DREAM_TOPOLOGY]]) {
      for (const item of cases) {
        const gates = topology ? topology.gates : null;
        if (gates && ![...item.a, ...item.b].every(gate => gates.has(gate))) continue;
        const chartA = chart(item.a);
        const chartB = chart(item.b);
        const host = document.createElement('div');
        host.style.cssText = 'position:absolute;left:-9999px;top:0;width:600px;height:900px';
        document.body.appendChild(host);
        const api = renderBodygraph(host, chartA, {
          ...(topology ? { topology } : {}),
          planetColumns: false,
          animate: false,
          composite: { chartA, chartB, labelA: 'A', labelB: 'B', colorA: pal.a, colorB: pal.b, colorBridged: pal.bridged }
        });
        const channel = CHANNELS.find(ch => ch.gates.join('-') === '20-57');
        out.push({
          topology: topologyName,
          name: item.name,
          expect: item.expect,
          expectedDynamic: item.dynamic,
          dynamic: api.channelDynamic(channel),
          paint: paintOf(host),
          palette: pal
        });
        host.remove();
      }
    }
    return out;
  });

  const rows = await read;
  assert.ok(rows.length >= 16, `only ${rows.length} renderings were measured`);

  for (const row of rows) {
    await check(`${row.topology}: ${row.name}`, async () => {
      assert.equal(row.dynamic, row.expectedDynamic, `channel 20-57 is classified "${row.dynamic}", expected "${row.expectedDynamic}"`);
      for (const gate of ['20', '57']) {
        const actual = row.paint[gate].path;
        assert.equal(actual, row.expect[gate], `gate ${gate} half-channel is ${actual}, expected ${row.expect[gate]}`);
        assert.equal(row.paint[gate].circle, row.expect[gate],
          `gate ${gate} disc is ${row.paint[gate].circle}, expected ${row.expect[gate]}`);
      }
    });
  }

  await check('standard: the shared span never contradicts the half it belongs to', async () => {
    for (const row of rows.filter(entry => entry.topology === 'standard')) {
      if (!row.paint.spans.length) continue;
      const half = new Set([row.paint['20'].path, row.paint['57'].path]);
      for (const span of row.paint.spans) {
        assert.ok(span === 'inactive' || half.has(span) || span === 'both',
          `${row.name}: shared span is ${span} while its halves are ${[...half].join('/')}`);
      }
    }
  });

  await check('dream: the shared trunk takes the ownership of the gates that cross it', async () => {
    const byName = name => rows.filter(row => row.topology === 'dream').find(row => row.name === name);
    const compromised = byName('A completes 20-57, B carries 20');
    assert.equal(compromised.paint.spans.length, 2, `the dream trunk has ${compromised.paint.spans.length} spans`);
    assert.equal(compromised.paint.spans[0], 'both', `the 20 side of the trunk is ${compromised.paint.spans[0]}, expected both`);
    assert.equal(compromised.paint.spans[1], 'A', `the 57 side of the trunk is ${compromised.paint.spans[1]}, expected A`);
    const swapped = byName('A carries 20, B completes 20-57');
    assert.deepEqual(swapped.paint.spans, ['both', 'B'], `swapped trunk is ${swapped.paint.spans.join('/')}`);
    const electromagnetic = byName('A carries 20, B carries 57');
    assert.deepEqual(electromagnetic.paint.spans, ['A', 'B'], `electromagnetic trunk is ${electromagnetic.paint.spans.join('/')}`);
    const dominated = byName('A completes 20-57, B carries neither');
    assert.deepEqual(dominated.paint.spans, ['A', 'A'], `dominated trunk is ${dominated.paint.spans.join('/')}`);
  });

  await check('the page reported no runtime errors', async () => {
    assert.deepEqual(errors, []);
  });
} finally {
  await browser.close();
}

if (failures) {
  console.error(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log('\nall composite half-ownership checks passed');
