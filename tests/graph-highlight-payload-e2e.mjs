import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';

/**
 * `onHighlight` payload contract, checked against the real renderer.
 *
 *   npx vite --host 127.0.0.1 --port 10024
 *   E2E_URL=http://127.0.0.1:10024 node tests/graph-highlight-payload-e2e.mjs
 *
 * A gate selection lights its defined channel partner too, so a host that only reads
 * `{gates, centers}` cannot tell a hovered gate from its partner card: every panel row
 * for the whole relation lit up. The payload now also carries `selection`, the object
 * the reader actually chose, as a copy. `gates`/`centers` keep their old meaning
 * exactly, and a cleared selection still arrives as `null`.
 */

const BASE = process.env.E2E_URL || 'http://127.0.0.1:10024';

let failures = 0;
const check = async (name, fn) => {
  try { await fn(); console.log(`✔ ${name}`); } catch (error) { failures++; console.error(`✖ ${name}\n  ${error.message || error}`); }
};

const browser = await chromium.launch({ channel: process.env.CHROME_CHANNEL || 'chrome', headless: true });
const errors = [];
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(BASE, { waitUntil: 'load' });
  await page.waitForSelector('#boot-status', { state: 'hidden' }).catch(() => {});

  const observed = await page.evaluate(async () => {
    const { renderBodygraph } = await import('/src/bodygraph.js');
    const { CHANNELS } = await import('/src/lib/human-design/catalog.js');
    const { compositePalette } = await import('/src/lib/skin-registry.js');
    const channel = CHANNELS.find(ch => ch.gates.join('-') === '20-57');

    const litState = host => {
      const svg = host.querySelector('svg');
      return {
        gates: [...svg.querySelectorAll('.bg-gate.bg-lit')].map(node => Number(node.dataset.gate)).sort((a, b) => a - b),
        centers: [...svg.querySelectorAll('.bg-center.bg-lit')].map(node => node.dataset.center).sort()
      };
    };

    const mount = chart => {
      const host = document.createElement('div');
      host.style.cssText = 'position:absolute;left:-9999px;top:0;width:600px;height:900px';
      document.body.appendChild(host);
      const payloads = [];
      const api = renderBodygraph(host, chart, {
        planetColumns: false,
        animate: false,
        onHighlight: payload => payloads.push(payload)
      });
      return { host, api, payloads };
    };

    const natal = {
      gates: { personality: { Sun: { gate: 20, line: 1 } }, design: { Earth: { gate: 57, line: 2 } } },
      channels: [channel],
      centers: { definedNames: [...channel.centers] },
      type: { name: 'Generator' }, strategy: 'To Respond',
      authority: { name: 'Sacral Authority' }, profile: { numbers: '1/3' },
      definition: 'Single Definition'
    };
    const { host, api, payloads } = mount(natal);
    const pal = compositePalette();
    const chartOf = gates => {
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
    const chartA = chartOf([20, 57]);
    const chartB = chartOf([20]);
    const compositeHost = document.createElement('div');
    compositeHost.style.cssText = 'position:absolute;left:-9999px;top:0;width:600px;height:900px';
    document.body.appendChild(compositeHost);
    const compositePayloads = [];
    const compositeApi = renderBodygraph(compositeHost, chartA, {
      planetColumns: false,
      animate: false,
      onHighlight: payload => compositePayloads.push(payload),
      composite: { chartA, chartB, labelA: 'A', labelB: 'B', colorA: pal.a, colorB: pal.b, colorBridged: pal.bridged }
    });

    // 1. A gate hover: the relation expands, the selection does not.
    api.highlightGate(20);
    const hoverGate = { payload: payloads.at(-1), lit: litState(host) };

    // 2. Pointer-out with nothing pinned clears with a literal null.
    api.highlightGate(null);
    const cleared = payloads.at(-1);

    // 3. A centre hover names the centre, and its gates stay in `gates`.
    api.highlightCenter('throat');
    const hoverCenter = { payload: payloads.at(-1), lit: litState(host) };

    // 4. A pinned selection comes back when the pointer leaves.
    api.setPinned({ kind: 'gate', id: 57 });
    const pinned = payloads.at(-1);
    api.highlightGate(20);
    api.highlightGate(null);
    const reverted = payloads.at(-1);

    // 5. A multi-object selection from a host panel keeps its own arrays, copied.
    const hostSelection = { kind: 'targets', gates: [20], centers: ['throat'] };
    api.highlightSelection(hostSelection);
    const targets = payloads.at(-1);
    const targetsSelection = targets?.selection
      ? { kind: targets.selection.kind, gates: [...(targets.selection.gates || [])], centers: [...(targets.selection.centers || [])] }
      : null;
    const beforeMutation = { gates: [...hostSelection.gates], centers: [...hostSelection.centers] };
    if (targets?.selection) {
      targets.selection.gates.push(999);
      targets.selection.centers.push('root');
    }
    const afterMutation = { gates: hostSelection.gates, centers: hostSelection.centers };
    // A relation array the host keeps mutating must never become the next payload.
    targets?.gates?.push(999);
    api.highlightSelection({ kind: 'gates', gates: [57] });
    const otherSelection = payloads.at(-1);
    const relationIsFresh = !otherSelection.gates.includes(999);

    // 6. The composite keeps both: expanded relation, single chosen gate.
    compositeApi.highlightGate(20);
    const compositeHover = { payload: compositePayloads.at(-1), lit: litState(compositeHost) };

    return {
      hoverGate: {
        selection: hoverGate.payload?.selection ?? null,
        gates: hoverGate.payload?.gates ?? null,
        centers: hoverGate.payload?.centers ?? null,
        lit: hoverGate.lit
      },
      clearedIsNull: cleared === null,
      cleared,
      hoverCenter: {
        selection: hoverCenter.payload?.selection ?? null,
        gates: hoverCenter.payload?.gates ?? null,
        centers: hoverCenter.payload?.centers ?? null
      },
      pinned: pinned?.selection ?? null,
      reverted: reverted?.selection ?? null,
      targets: {
        selection: targetsSelection,
        gates: targets?.gates ?? null,
        copyIsDetached: !!targets?.selection && targets.selection.gates !== targets.gates
          && targets.selection.gates !== hostSelection.gates
          && targets.selection.centers !== hostSelection.centers,
        callerUntouched: JSON.stringify(afterMutation.gates) === JSON.stringify(beforeMutation.gates)
          && JSON.stringify(afterMutation.centers) === JSON.stringify(beforeMutation.centers),
        relationIsFresh
      },
      otherSelection: otherSelection?.selection ?? null,
      compositeHover: {
        selection: compositeHover.payload?.selection ?? null,
        gates: compositeHover.payload?.gates ?? null,
        centers: compositeHover.payload?.centers ?? null,
        lit: compositeHover.lit
      }
    };
  });

  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

  await check('a gate selection carries the chosen gate and still lights its partner', async () => {
    assert.deepEqual(observed.hoverGate.selection, { kind: 'gate', id: 20 });
    assert.ok(observed.hoverGate.gates.includes(20), 'the chosen gate is missing from gates');
    assert.ok(observed.hoverGate.gates.includes(57), 'the defined channel partner is no longer lit');
    assert.deepEqual(observed.hoverGate.centers.sort(), ['spleen', 'throat']);
    assert.ok(same([...observed.hoverGate.gates].sort((a, b) => a - b), observed.hoverGate.lit.gates),
      `gates ${observed.hoverGate.gates} disagree with the lit gates ${observed.hoverGate.lit.gates}`);
    assert.ok(same([...observed.hoverGate.centers].sort(), observed.hoverGate.lit.centers),
      `centers ${observed.hoverGate.centers} disagree with the lit centres ${observed.hoverGate.lit.centers}`);
  });

  await check('a cleared highlight is still a literal null', async () => {
    assert.equal(observed.clearedIsNull, true, `the cleared payload was ${JSON.stringify(observed.cleared)}`);
  });

  await check('a centre selection names the centre, not the gates it lights', async () => {
    assert.deepEqual(observed.hoverCenter.selection, { kind: 'center', id: 'throat' });
    assert.ok(observed.hoverCenter.gates.length >= 1, 'a centre selection stopped lighting its gates');
  });

  await check('a pinned gate is what the pointer returning to rest reports', async () => {
    assert.deepEqual(observed.pinned, { kind: 'gate', id: 57 });
    assert.deepEqual(observed.reverted, { kind: 'gate', id: 57 });
  });

  await check('a panel selection hands over copies, never the caller\'s arrays', async () => {
    assert.deepEqual(observed.targets.selection, { kind: 'targets', gates: [20], centers: ['throat'] });
    assert.equal(observed.targets.copyIsDetached, true, 'selection shares an array with the payload or the caller');
    assert.equal(observed.targets.callerUntouched, true, 'mutating the reported selection reached the caller\'s arrays');
    assert.equal(observed.targets.relationIsFresh, true, 'a mutated relation array leaked into the next payload');
    assert.deepEqual(observed.otherSelection, { kind: 'gates', gates: [57] });
  });

  await check('the composite reports the same contract', async () => {
    assert.deepEqual(observed.compositeHover.selection, { kind: 'gate', id: 20 });
    assert.ok(observed.compositeHover.gates.includes(57), 'the composite stopped lighting the channel partner');
    assert.ok(same([...observed.compositeHover.gates].sort((a, b) => a - b), observed.compositeHover.lit.gates),
      `composite gates ${observed.compositeHover.gates} disagree with the lit gates ${observed.compositeHover.lit.gates}`);
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
console.log('\nall highlight payload checks passed');
