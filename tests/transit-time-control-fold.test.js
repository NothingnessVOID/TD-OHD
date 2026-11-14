/**
 * The shared transit time control's DST-fold selection, at the widget level.
 *
 * Two behaviours are the whole point of this file:
 * 1. "Now" must mean *now*: during a fall-back the wall time alone is ambiguous
 *    (America/New_York 2026-11-01 01:30 happens twice), so the control has to
 *    keep the offset that the clock actually had — the second 01:30, EST.
 * 2. A reader's chosen offset must survive an edit of the minutes, but an offset
 *    that no longer exists must not be forced onto a different season.
 *
 * The clock is frozen with a counting `Date`, so "reads the clock once" is a
 * real assertion rather than a claim; every expected instant is a fixed UTC
 * string resolved through the platform's IANA data.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { mountTransitTimeControl } from '../src/lib/transit-time-control.js';

const NEW_YORK = 'America/New_York';
const utc = instant => new Date(instant).toISOString();

/**
 * A minimal element/host stub: enough surface for the control's markup, its
 * `#id` lookups, its listeners and the `<select>` value contract (a value that
 * is not an option reads as ''), without a DOM library in the test suite.
 */
function createHost() {
  const elements = new Map();
  const listeners = new WeakMap();

  function element(id, tag, onHtml = null) {
    const classes = new Set();
    const node = {
      id,
      tag,
      value: '',
      textContent: '',
      html: '',
      hidden: false,
      dataset: {},
      attributes: new Map(),
      classList: {
        add: name => classes.add(name),
        remove: name => classes.delete(name),
        contains: name => classes.has(name)
      },
      setAttribute: (name, value) => node.attributes.set(name, String(value)),
      getAttribute: name => (node.attributes.has(name) ? node.attributes.get(name) : null),
      addEventListener: (type, handler) => {
        const list = listeners.get(node) || new Map();
        listeners.set(node, list);
        list.set(type, [...(list.get(type) || []), handler]);
      },
      querySelector: () => null,
      querySelectorAll: () => []
    };
    Object.defineProperty(node, 'innerHTML', {
      get: () => node.html,
      set: html => {
        node.html = String(html);
        onHtml?.(node.html);
        if (tag === 'select') {
          const values = [...node.html.matchAll(/value="([^"]*)"/g)].map(match => match[1]);
          if (!values.includes(node.value)) node.value = '';
        }
      }
    });
    return node;
  }

  const register = html => {
    for (const [, tag, id] of String(html).matchAll(/<([a-z]+)[^>]*\bid="([^"]+)"/g)) {
      if (!elements.has(id)) elements.set(id, element(id, tag));
    }
  };

  const host = element('host', 'div', html => {
    elements.clear();
    register(html);
  });
  host.innerHTML = '';
  host.querySelector = selector => elements.get(String(selector).replace(/^#/, '')) || null;
  host.replaceChildren = () => { elements.clear(); host.html = ''; };
  host.byId = id => elements.get(id);
  host.fire = (id, type) => {
    const node = elements.get(id);
    assert.ok(node, `no #${id} to dispatch ${type} on`);
    for (const handler of listeners.get(node)?.get(type) || []) handler({ type, target: node });
  };
  return host;
}

/** Freeze the clock at `instant` and count how often the control looks at it. */
function withFrozenClock(instant, run) {
  const RealDate = Date;
  const reads = { total: 0, now: 0, constructed: 0 };
  class FrozenDate extends RealDate {
    constructor(...args) {
      super(...(args.length ? args : [instant]));
      if (!args.length) { reads.total += 1; reads.constructed += 1; }
    }
    static now() {
      reads.total += 1;
      reads.now += 1;
      return instant;
    }
  }
  globalThis.Date = FrozenDate;
  try {
    return run(reads);
  } finally {
    globalThis.Date = RealDate;
  }
}

function mount() {
  const host = createHost();
  const changes = [];
  const control = mountTransitTimeControl({
    host,
    idPrefix: 'transit',
    onChange: selection => changes.push(selection)
  });
  assert.ok(control, 'the control did not mount');
  return { host, control, changes, field: id => host.byId('transit-' + id) };
}

const setZone = (host, zone) => {
  const node = host.byId('transit-timezone');
  node.value = zone;
  node.textContent = zone;
};

const setWall = (host, date, time) => {
  host.byId('transit-date').value = date;
  host.byId('transit-time').value = time;
};

test('Now in a fall-back keeps the offset the clock actually had (second 01:30, EST)', () => {
  const { host, control, changes } = mount();
  setZone(host, NEW_YORK);

  // 01:30:25 EST is 06:30:25Z; the same wall time also exists an hour earlier as
  // 01:30:25 EDT (05:30:25Z), which is what a wall-time-only resolution picks.
  const observed = Date.parse('2026-11-01T06:30:25.400Z');
  const reads = withFrozenClock(observed, counter => {
    control.setNow();
    return counter;
  });

  assert.equal(reads.total, 1, 'setNow must read the clock exactly once');
  assert.deepEqual(control.getSelection(), { date: '2026-11-01', time: '01:30:25', zone: NEW_YORK });
  const resolved = control.getResolved();
  assert.equal(utc(resolved.instant), '2026-11-01T06:30:25.000Z');
  assert.equal(resolved.offset, -5);
  assert.equal(control.getInstant(), Date.parse('2026-11-01T06:30:25Z'));
  // The fold remains offered, with the second occurrence selected.
  assert.equal(host.byId('transit-choice-label').hidden, false);
  assert.equal(host.byId('transit-choice').value, String(resolved.instant));
  assert.deepEqual(changes.at(-1), resolved);
});

test('a chosen second occurrence survives a minute edit instead of dropping to EDT', () => {
  const { host, control } = mount();
  setZone(host, NEW_YORK);
  setWall(host, '2026-11-01', '01:30:25');
  host.fire('transit-date', 'change');
  assert.equal(control.getResolved().offset, -4, 'the fold starts on the earlier 01:30');

  // The reader explicitly picks the second occurrence.
  host.byId('transit-choice').value = String(Date.parse('2026-11-01T06:30:25Z'));
  host.fire('transit-choice', 'change');
  assert.equal(utc(control.getResolved().instant), '2026-11-01T06:30:25.000Z');
  assert.equal(control.getResolved().offset, -5);

  // Editing the minutes is a new wall time in the same zone and same season.
  host.byId('transit-time').value = '01:31:25';
  host.fire('transit-time', 'change');
  assert.equal(utc(control.getResolved().instant), '2026-11-01T06:31:25.000Z');
  assert.equal(control.getResolved().offset, -5);
  assert.equal(host.byId('transit-choice').value, String(Date.parse('2026-11-01T06:31:25Z')));
});

test('the first occurrence stays reachable through an explicit choice', () => {
  const { host, control } = mount();
  setZone(host, NEW_YORK);
  setWall(host, '2026-11-01', '01:31:25');
  host.fire('transit-date', 'change');
  assert.equal(control.getResolved().offset, -4);

  host.byId('transit-choice').value = String(Date.parse('2026-11-01T06:31:25Z'));
  host.fire('transit-choice', 'change');
  assert.equal(utc(control.getResolved().instant), '2026-11-01T06:31:25.000Z');
  assert.equal(control.getResolved().offset, -5);

  // And back again, so neither side of the fold is sticky.
  host.byId('transit-choice').value = String(Date.parse('2026-11-01T05:31:25Z'));
  host.fire('transit-choice', 'change');
  assert.equal(utc(control.getResolved().instant), '2026-11-01T05:31:25.000Z');
  assert.equal(control.getResolved().offset, -4);
});

test('a spring-forward gap is still rejected', () => {
  const { host, control, changes } = mount();
  setZone(host, NEW_YORK);
  setWall(host, '2026-03-08', '02:30:00');
  host.fire('transit-time', 'change');

  assert.equal(control.getResolved(), null);
  assert.equal(control.getInstant(), null);
  assert.equal(changes.at(-1), null);
  assert.equal(host.byId('transit-choice-label').hidden, true);
  const status = host.byId('transit-status');
  assert.equal(status.dataset.i18n, 'This local time does not exist in that timezone. Choose another time.');
  assert.ok(status.textContent.trim(), 'the gap must be stated in the status line');
  assert.equal(status.classList.contains('tl-sr-only'), false);
});

test('ordinary days keep their single offset, and a stale fold offset is not forced onto a new season', () => {
  const { host, control } = mount();
  setZone(host, NEW_YORK);
  setWall(host, '2026-07-15', '12:00:00');
  host.fire('transit-date', 'change');
  assert.equal(utc(control.getResolved().instant), '2026-07-15T16:00:00.000Z');
  assert.equal(control.getResolved().offset, -4);
  assert.equal(host.byId('transit-choice-label').hidden, true, 'no fold is offered outside the fold');

  // Carry EST from the fold, then step to a summer wall time: only EDT exists.
  host.byId('transit-choice').value = '';
  setWall(host, '2026-11-01', '01:30:25');
  host.fire('transit-date', 'change');
  host.byId('transit-choice').value = String(Date.parse('2026-11-01T06:30:25Z'));
  host.fire('transit-choice', 'change');
  assert.equal(control.getResolved().offset, -5);
  setWall(host, '2026-07-15', '12:00:00');
  host.fire('transit-date', 'change');
  assert.equal(utc(control.getResolved().instant), '2026-07-15T16:00:00.000Z');
  assert.equal(control.getResolved().offset, -4);
});

test('Now on an ordinary day resolves to the instant the clock was read at', () => {
  const { host, control } = mount();
  setZone(host, NEW_YORK);
  const observed = Date.parse('2026-07-15T16:00:07.900Z');
  const reads = withFrozenClock(observed, counter => {
    control.setNow();
    return counter;
  });
  assert.equal(reads.total, 1, 'setNow must read the clock exactly once');
  assert.equal(utc(control.getResolved().instant), '2026-07-15T16:00:07.000Z');
  assert.equal(control.getResolved().offset, -4);
  assert.deepEqual(control.getSelection(), { date: '2026-07-15', time: '12:00:07', zone: NEW_YORK });
});
