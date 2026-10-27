import test from 'node:test';
import assert from 'node:assert/strict';
// src/bodygraph.js re-exports PLANET_ORDER but imports CSS, so it cannot load
// under `node --test`; planet-reference.js is the canonical definition.
import { PLANET_ORDER } from '../src/lib/planet-reference.js';
import {
  DREAM_CHANNELS, DREAM_GATES, DREAM_REALMS, DREAM_REALM_ORDER,
  dreamChannelKey, isDreamChannelKey, isDreamGate
} from '../src/lib/human-design/dream-topology.js';
import {
  DREAM_LUNAR_ARC, solveLunarArcInstant, dreamTypeOf, dreamTypeName,
  computeDreamChart, dreamGraphChart, buildDreamTransitGraph, dreamRealmOf,
  buildCompositeRealms
} from '../src/lib/dream-chart.js';

const MS_PER_DAY = 86_400_000;
const wrap360 = value => ((value % 360) + 360) % 360;
/** Circular distance, so the 0/360 seam cannot turn 0.0000001 into 359.9999999. */
const angularDelta = (a, b) => Math.abs(((a - b + 540) % 360) - 180);
const keys = channels => channels.map(dreamChannelKey).sort();

/* --------------------------------------------------- synthetic lunar motion */

/**
 * Mean lunar motion plus one sinusoidal anomaly, so the instantaneous rate
 * sweeps 13.176 ± 1.8 = 11.38-14.98 deg/day the way the real Moon does
 * (observed band 11.7-15.3 deg/day). `phaseTurns` places the birth inside the
 * anomalistic cycle; that is what makes the arc take 6.1-7.5 days and the
 * Newton iteration need 5-11 ephemeris passes instead of one.
 */
const MEAN_LUNAR_RATE_PER_DAY = 13.176358;
const ANOMALISTIC_MONTH_DAYS = 27.55;
const RATE_SWING_PER_DAY = 1.8;
const ANOMALY_AMPLITUDE_DEG = (RATE_SWING_PER_DAY * ANOMALISTIC_MONTH_DAYS) / (2 * Math.PI);

function syntheticMoonLongitude({ birthUtc, natalLongitude, phaseTurns }) {
  const phase = 2 * Math.PI * phaseTurns;
  return instant => {
    const days = (instant - birthUtc) / MS_PER_DAY;
    const anomaly = ANOMALY_AMPLITUDE_DEG *
      (Math.sin(phase + (2 * Math.PI * days) / ANOMALISTIC_MONTH_DAYS) - Math.sin(phase));
    return wrap360(natalLongitude + MEAN_LUNAR_RATE_PER_DAY * days + anomaly);
  };
}

/* ------------------------------------------------------- snapshot fabrication */

/** One engine-shaped activation: gate/line/color/tone/base with valid ranges. */
const act = (gate, line = 1, color = 1, tone = 1, base = 1) => ({ gate, line, color, tone, base });

/**
 * A transit snapshot carries all thirteen PLANET_ORDER keys, null where the
 * planet is absent. `moonLongitude` is what the arc solver reads back.
 */
function activationSnapshot(activations, moonLongitude) {
  const snapshot = {};
  for (const planet of PLANET_ORDER) snapshot[planet] = activations[planet] ?? null;
  if (Number.isFinite(moonLongitude)) snapshot.moon = { ...(snapshot.moon ?? {}), longitude: moonLongitude };
  return snapshot;
}

assert.equal(PLANET_ORDER.length, 13, 'expected the thirteen planet keys of the waking chart');
assert.ok(PLANET_ORDER.includes('moon'));

const BIRTH_ISO = '2001-05-20T12:00:00.000Z';
const BIRTH_UTC = Date.parse(BIRTH_ISO);
/** Fixed, so no test depends on Date.now(). */
const TRANSIT_INSTANT = Date.UTC(2026, 9, 1, 0, 0, 0);
const PHASE = 0.35;

/**
 * One callable `snapshotAt` plus the chart the sleep model consumes. Non-dream
 * gates (14, 30, 34, 44, 64) are seeded into every side on purpose: the sleep
 * design must drop all of them.
 */
function makeFixture({
  natalLongitude = 287,
  phaseTurns = PHASE,
  personality = {
    sun: act(20, 3), moon: act(57, 1), mercury: act(1, 5), venus: act(8, 2),
    mars: act(62, 4), jupiter: act(12, 6),
    earth: act(30, 2), northNode: act(44, 3), southNode: act(64, 1)   // waking-only
  },
  design = {
    sun: act(27, 2), moon: act(50, 4), mercury: act(5, 1), venus: act(15, 6),
    mars: act(42, 3), jupiter: act(14, 2),                            // 14 is waking-only
    saturn: act(44, 5)                                                // waking-only
  },
  transit = {
    sun: act(20, 1),      // natal too -> gateSource 'both'
    moon: act(28, 3),     // transit only
    mercury: act(38, 2),  // transit only
    venus: act(53, 5),    // completes 42-53 with the natal 42 -> channelSource 'completed'
    mars: act(34, 4),     // waking-only
    jupiter: act(64, 1)   // waking-only
  }
} = {}) {
  const longitudeAt = syntheticMoonLongitude({ birthUtc: BIRTH_UTC, natalLongitude, phaseTurns });
  const trace = [];
  const snapshotAt = async instant => {
    const activations = instant === TRANSIT_INSTANT ? transit : design;
    const longitude = instant === TRANSIT_INSTANT ? 123.456 : longitudeAt(instant);
    trace.push(longitude);
    return activationSnapshot(activations, longitude);
  };
  const chart = {
    contractVersion: 'adapter-v2',
    raw: { birthUtc: BIRTH_ISO, designUtc: '2001-01-21T04:11:00.000Z', channels: [], centers: {} },
    calculation: { type: { id: 'manifesting-generator' } },
    type: { name: 'Manifesting Generator' },
    gates: { personality, design: {}, all: [] },
    positions: {
      personality: { date: BIRTH_ISO.slice(0, 10), moon: { longitude: natalLongitude, sign: 'Sagittarius', degree: "17°00'00\"" } },
      design: { date: '2001-01-21' }
    },
    centers: { definedNames: ['g', 'sacral', 'throat'] },
    meta: { designSolarArc: 88, ephemeris: 'synthetic-test' }
  };
  return { chart, snapshotAt, trace, longitudeAt, natalLongitude };
}

/* ------------------------------------------------- solveLunarArcInstant: solve */

test('the lunar arc solver converges on the instant 88 degrees before birth', async () => {
  const fixture = makeFixture();
  const natal = fixture.natalLongitude;
  const target = wrap360(natal - DREAM_LUNAR_ARC);
  let calls = 0;
  const counting = async instant => { ++calls; return fixture.snapshotAt(instant); };

  const solved = await solveLunarArcInstant({
    birthUtc: BIRTH_UTC, natalMoonLongitude: natal, snapshotAt: counting
  });

  assert.equal(DREAM_LUNAR_ARC, 88);
  // The design moment precedes birth by roughly a lunar quarter-turn.
  assert.ok(solved.instant < BIRTH_UTC, 'design instant must be before birth');
  const days = (BIRTH_UTC - solved.instant) / MS_PER_DAY;
  assert.ok(days >= 6.0 && days <= 7.5, `arc took ${days.toFixed(4)} days, expected 6.0-7.5`);
  assert.ok(Math.abs(solved.residualDegrees) < 1e-6, `residual ${solved.residualDegrees}`);
  assert.ok(solved.steps >= 2, 'a single pass cannot locate the arc');
  assert.ok(solved.steps <= 12, `solver needed ${solved.steps} steps`);
  // One ephemeris pass per step: no extra round trips, no wasted snapshots.
  assert.equal(calls, solved.steps);
  // The snapshot handed back is the one taken at the solved instant.
  assert.ok(angularDelta(solved.snapshot.moon.longitude, target) < 1e-6,
    `returned snapshot at ${solved.snapshot.moon.longitude}, target ${target}`);
  assert.ok(
    angularDelta(fixture.longitudeAt(solved.instant), target) < 1e-6,
    'solved instant does not reproduce the target longitude'
  );
  assert.ok(angularDelta(fixture.longitudeAt(BIRTH_UTC), natal) < 1e-9, 'fixture Moon is not at the natal longitude');
  assert.ok(Number.isFinite(solved.instant));
});

test('the arc solve survives the 0 degree seam, as target and as iteration path', async () => {
  // The task's boundary case: natal 40 -> target 312.
  const forty = makeFixture({ natalLongitude: 40 });
  const solvedForty = await solveLunarArcInstant({
    birthUtc: BIRTH_UTC, natalMoonLongitude: 40, snapshotAt: forty.snapshotAt
  });
  assert.equal(wrap360(40 - DREAM_LUNAR_ARC), 312);
  assert.ok(angularDelta(solvedForty.snapshot.moon.longitude, 312) < 1e-6,
    `solved ${solvedForty.snapshot.moon.longitude}, expected 312`);
  const daysForty = (BIRTH_UTC - solvedForty.instant) / MS_PER_DAY;
  assert.ok(daysForty >= 6.0 && daysForty <= 7.5, `arc took ${daysForty.toFixed(4)} days`);
  assert.ok(solvedForty.steps <= 12, `steps ${solvedForty.steps}`);

  // Harder seam: natal 88 puts the target exactly on 0, and the mean-rate seed
  // lands the first guess at ~352, i.e. on the other side of the boundary. The
  // iteration then oscillates across 0/360 until it settles.
  const seam = makeFixture({ natalLongitude: 88 });
  const solvedSeam = await solveLunarArcInstant({
    birthUtc: BIRTH_UTC, natalMoonLongitude: 88, snapshotAt: seam.snapshotAt
  });
  assert.equal(wrap360(88 - DREAM_LUNAR_ARC), 0);
  assert.ok(seam.trace.length >= 2, 'seam fixture never iterated');
  assert.ok(seam.trace[0] > 350, `first guess ${seam.trace[0].toFixed(3)} does not straddle 0`);
  assert.ok(
    seam.trace.some(longitude => longitude > 350) && seam.trace.some(longitude => longitude < 10),
    'the iteration never actually crossed the seam'
  );
  assert.ok(angularDelta(solvedSeam.snapshot.moon.longitude, 0) < 1e-6,
    `solved ${solvedSeam.snapshot.moon.longitude}, expected 0`);
  assert.ok(Math.abs(solvedSeam.residualDegrees) < 1e-6, `residual ${solvedSeam.residualDegrees}`);
  const daysSeam = (BIRTH_UTC - solvedSeam.instant) / MS_PER_DAY;
  assert.ok(daysSeam >= 6.0 && daysSeam <= 7.5, `arc took ${daysSeam.toFixed(4)} days`);
});

test('a custom arc is honoured and the arc length is reported', async () => {
  const fixture = makeFixture();
  const solved = await solveLunarArcInstant({
    birthUtc: BIRTH_UTC, natalMoonLongitude: fixture.natalLongitude, arc: 30, snapshotAt: fixture.snapshotAt
  });
  assert.ok(angularDelta(solved.snapshot.moon.longitude, wrap360(fixture.natalLongitude - 30)) < 1e-6);
  const days = (BIRTH_UTC - solved.instant) / MS_PER_DAY;
  assert.ok(days > 1.8 && days < 3.0, `a 30 degree arc took ${days.toFixed(4)} days`);
});

/* --------------------------------------------- solveLunarArcInstant: failures */

test('the solver rejects unresolved birth data before touching the ephemeris', async () => {
  let calls = 0;
  const unused = async () => { ++calls; return activationSnapshot({}, 0); };
  for (const birthUtc of [NaN, Infinity, -Infinity, undefined, null, '2001-05-20']) {
    await assert.rejects(
      solveLunarArcInstant({ birthUtc, natalMoonLongitude: 287, snapshotAt: unused }),
      RangeError, `birthUtc ${String(birthUtc)}`
    );
  }
  for (const natalMoonLongitude of [NaN, Infinity, -Infinity, undefined, null, '287']) {
    await assert.rejects(
      solveLunarArcInstant({ birthUtc: BIRTH_UTC, natalMoonLongitude, snapshotAt: unused }),
      RangeError, `natalMoonLongitude ${String(natalMoonLongitude)}`
    );
  }
  assert.equal(calls, 0, 'validation must not cost an ephemeris pass');
});

test('the solver refuses a snapshot without a Moon longitude', async () => {
  for (const snapshot of [{}, { sun: act(20, 1) }, { moon: {} }, { moon: { longitude: NaN } }, null, undefined]) {
    await assert.rejects(
      solveLunarArcInstant({ birthUtc: BIRTH_UTC, natalMoonLongitude: 287, snapshotAt: async () => snapshot }),
      /Moon longitude/, `snapshot ${JSON.stringify(snapshot)}`
    );
  }
});

test('a Moon that never moves cannot satisfy the arc and reports non-convergence', async () => {
  let calls = 0;
  // Frozen at the natal longitude, 88 degrees away from the target.
  const frozen = async () => { ++calls; return activationSnapshot({ moon: act(57, 1) }, 287); };
  await assert.rejects(
    solveLunarArcInstant({ birthUtc: BIRTH_UTC, natalMoonLongitude: 287, snapshotAt: frozen }),
    /did not converge/
  );
  // Bounded work: the iteration cap stops the loop instead of spinning forever.
  assert.ok(calls >= 2, 'a frozen Moon should still be retried');
  assert.ok(calls <= 40, `iteration cap exceeded: ${calls} passes`);
});

/* ------------------------------------------------------------ sleep typing */

test('dreamTypeOf maps centre definitions onto exactly three sleep types', () => {
  assert.equal(dreamTypeOf([]), 'reflector');
  assert.equal(dreamTypeOf(new Set()), 'reflector');
  assert.deepEqual(dreamTypeOf(['throat', 'g']), 'projector');
  assert.deepEqual(dreamTypeOf(['sacral', 'throat']), 'generator');
  assert.deepEqual(dreamTypeOf(['root', 'spleen']), 'projector');
  // Set and array inputs agree.
  for (const defined of [[], ['throat'], ['g', 'spleen'], ['sacral'], ['sacral', 'root', 'throat']]) {
    assert.equal(dreamTypeOf(defined), dreamTypeOf(new Set(defined)), JSON.stringify(defined));
  }
  // Sacral wins over every other centre, including a defined Throat.
  assert.equal(dreamTypeOf(['throat', 'g', 'spleen', 'root', 'sacral']), 'generator');
  for (const [id, name] of [['generator', 'Generator'], ['projector', 'Projector'], ['reflector', 'Reflector']]) {
    assert.equal(dreamTypeName(id), name);
  }
  assert.equal(dreamTypeName('unknown-type'), 'unknown-type');
});

/* ------------------------------------------------------- computeDreamChart */

test('computeDreamChart keeps only dream gates and derives the sleep definition', async () => {
  const fixture = makeFixture();
  const dream = await computeDreamChart(fixture.chart, {
    transitInstant: TRANSIT_INSTANT, snapshotAt: fixture.snapshotAt
  });

  assert.equal(dream.contractVersion, 'dream-v1');
  assert.equal(dream.lunarArc, DREAM_LUNAR_ARC);
  assert.equal(dream.natalMoonLongitude, fixture.natalLongitude);

  // The waking-only gates seeded into every side must be gone.
  const dropped = [30, 44, 64, 14, 34];
  for (const side of ['personality', 'design', 'transit']) {
    const activations = dream.gates[side];
    for (const [planet, value] of Object.entries(activations)) {
      assert.ok(value, `${side}.${planet} is empty`);
      assert.equal(isDreamGate(value.gate), true, `${side}.${planet} kept gate ${value.gate}`);
      assert.ok(DREAM_GATES.includes(value.gate), `${side}.${planet} kept gate ${value.gate}`);
    }
    for (const gate of dropped) {
      assert.equal(
        Object.values(activations).some(value => value.gate === gate), false,
        `${side} still carries waking gate ${gate}`
      );
    }
  }
  // Input filtering, proven against the fixture that was handed in.
  assert.equal(Object.keys(fixture.chart.gates.personality).length, 9);
  assert.equal(Object.keys(dream.gates.personality).length, 6);
  assert.deepEqual(Object.keys(dream.gates.personality).sort(),
    ['jupiter', 'mars', 'mercury', 'moon', 'sun', 'venus']);
  assert.deepEqual(Object.keys(dream.gates.design).sort(),
    ['mars', 'mercury', 'moon', 'sun', 'venus']);
  assert.deepEqual(Object.keys(dream.gates.transit).sort(),
    ['mercury', 'moon', 'sun', 'venus']);

  // gates.all is sorted and duplicate-free.
  const all = dream.gates.all;
  assert.deepEqual([...all], [...new Set(all)], 'gates.all repeats a gate');
  for (let i = 1; i < all.length; ++i) assert.ok(all[i] > all[i - 1], `gates.all not ascending at ${i}`);
  assert.deepEqual([...all], [1, 5, 8, 12, 15, 20, 27, 42, 50, 57, 62]);
  for (const gate of all) assert.equal(isDreamGate(gate), true, `gates.all holds ${gate}`);

  // Channels only ever join two activated dream gates.
  assert.deepEqual(keys(dream.channels), ['1-8', '20-57', '27-50', '5-15'].sort());
  for (const channel of dream.channels) {
    assert.ok(DREAM_CHANNELS.includes(channel), `${dreamChannelKey(channel)} is not a dream channel`);
    for (const gate of channel.gates) assert.ok(all.includes(gate), `${dreamChannelKey(channel)} needs ${gate}`);
  }

  // Defined centres are exactly the centres the completed channels span.
  const fromChannels = [...new Set(dream.channels.flatMap(channel => channel.centers))].sort();
  assert.deepEqual(dream.centers.definedNames, fromChannels);
  assert.deepEqual(dream.centers.definedNames, ['g', 'sacral', 'spleen', 'throat']);
  assert.ok(dream.centers.defined instanceof Set);

  // Type follows the definition, and never becomes a waking Manifestor.
  assert.equal(dream.type.id, dreamTypeOf(dream.centers.definedNames));
  assert.equal(dream.type.id, 'generator');
  assert.equal(dream.type.name, 'Generator');
  assert.ok(['generator', 'projector', 'reflector'].includes(dream.type.id));
  // The waking chart stays visible as context and is not overwritten.
  assert.deepEqual(dream.wakingType, { id: 'manifesting-generator', name: 'Manifesting Generator' });

  // Design moment: the solver's own answer, and inside the lunar window.
  const independent = await solveLunarArcInstant({
    birthUtc: BIRTH_UTC, natalMoonLongitude: fixture.natalLongitude, snapshotAt: fixture.snapshotAt
  });
  assert.equal(dream.designMoment.utc, independent.instant);
  assert.equal(dream.designMoment.iso, new Date(independent.instant).toISOString());
  assert.ok(dream.designMoment.daysBeforeBirth >= 6.0 && dream.designMoment.daysBeforeBirth <= 7.5,
    `daysBeforeBirth ${dream.designMoment.daysBeforeBirth}`);
  assert.ok(Math.abs(dream.designMoment.residualDegrees) < 1e-6);
  assert.equal(dream.designMoment.solveSteps, independent.steps);
  assert.equal(dream.source.designSolarArc, 88);
  assert.equal(dream.source.personalityDate, '2001-05-20');

  // Transit overlay: a Set of dream gates, channels inside the dream set only.
  assert.ok(dream.transit.gates instanceof Set, 'transit.gates must be a Set');
  assert.deepEqual([...dream.transit.gates].sort((a, b) => a - b), [20, 28, 38, 53]);
  assert.equal(dream.transit.instant, TRANSIT_INSTANT);
  assert.equal(dream.transit.iso, new Date(TRANSIT_INSTANT).toISOString());
  assert.equal(dream.transit.mode, 'overlay');
  for (const gate of dream.transit.gates) assert.equal(isDreamGate(gate), true, `transit gate ${gate}`);
  assert.deepEqual(keys(dream.transit.channels), keys(DREAM_CHANNELS));
  for (const channel of dream.transit.channels) assert.ok(isDreamChannelKey(dreamChannelKey(channel)));
  assert.deepEqual([...dream.transit.definedCenters].sort(), ['g', 'root', 'sacral', 'spleen', 'throat']);

  // Three night fields, in reveal order, each row inside its own field.
  assert.equal(dream.realms.length, 3);
  assert.deepEqual(dream.realms.map(realm => realm.id), [...DREAM_REALM_ORDER]);
  assert.deepEqual(dream.realms.map(realm => realm.id), ['light', 'earth', 'demon']);
  for (const realm of dream.realms) {
    assert.equal(realm.portal, DREAM_REALMS[realm.id].portal);
    assert.deepEqual([...realm.gates], [...DREAM_REALMS[realm.id].gates]);
    assert.ok(realm.rows.length >= 1, `${realm.id} has no rows`);
    for (const row of realm.rows) {
      assert.equal(dreamRealmOf(row.gate), realm.id, `row ${row.gate} listed under ${realm.id}`);
      assert.ok(DREAM_REALMS[realm.id].gates.includes(row.gate), `row ${row.gate} is not a ${realm.id} gate`);
      assert.equal(row.realm, realm.id);
      assert.equal(row.portal, row.gate === realm.portal);
      assert.equal(row.activated, all.includes(row.gate), `row ${row.gate} activation flag`);
      assert.equal(row.transitActivated, dream.transit.gates.has(row.gate), `row ${row.gate} transit flag`);
      for (const entry of [...row.personality, ...row.design, ...row.transit]) {
        assert.ok(entry.planet, 'row entry lost its planet');
        assert.ok(Number.isInteger(entry.line) && entry.line >= 1 && entry.line <= 6, `bad line ${entry.line}`);
      }
    }
    // Every activated gate of the field is listed, portals included.
    const expected = DREAM_REALMS[realm.id].gates
      .filter(gate => all.includes(gate) || dream.transit.gates.has(gate) || gate === realm.portal);
    assert.deepEqual(realm.rows.map(row => row.gate), expected, `${realm.id} rows`);
  }
  assert.deepEqual(dream.realms[0].rows.map(row => row.gate), [62, 20, 57, 8, 1]);
  assert.deepEqual(dream.realms[1].rows.map(row => row.gate), [12, 27, 50, 5, 15]);
  assert.deepEqual(dream.realms[2].rows.map(row => row.gate), [19, 53, 42, 38, 28]);

  // byNumber groups the same activations per gate, keyed by planet.
  assert.deepEqual([...dream.gates.byNumber.personality.keys()].sort((a, b) => a - b), [1, 8, 12, 20, 57, 62]);
  assert.deepEqual(dream.gates.byNumber.personality.get(20), [{ planet: 'sun', line: 3, color: 1, tone: 1, base: 1 }]);
  assert.equal(dream.gates.byNumber.design.get(50)[0].planet, 'moon');
  assert.deepEqual([...dream.gates.everyDreamGate], [...DREAM_GATES]);
});

test('a chart with almost nothing active falls back to the sleep Reflector', async () => {
  const fixture = makeFixture({
    personality: { sun: act(1, 3) },
    design: { sun: act(64, 1), moon: act(30, 2) },     // waking-only, dropped
    transit: { sun: act(2, 4), moon: act(44, 1) }       // waking-only, dropped
  });
  const dream = await computeDreamChart(fixture.chart, {
    transitInstant: TRANSIT_INSTANT, snapshotAt: fixture.snapshotAt
  });
  assert.deepEqual(dream.gates.all, [1]);
  assert.deepEqual(dream.channels, []);
  assert.deepEqual(dream.centers.definedNames, []);
  assert.equal(dream.type.id, 'reflector');
  assert.equal(dream.type.name, 'Reflector');
  assert.equal(dream.transit.gates.size, 0);
  assert.deepEqual(dream.transit.channels, []);
  // Only portals and the single activated gate survive the row filter.
  assert.deepEqual(dream.realms.map(realm => realm.rows.map(row => row.gate)), [[62, 1], [12], [19]]);
  assert.ok(dream.designMoment.daysBeforeBirth >= 6.0 && dream.designMoment.daysBeforeBirth <= 7.5);
});

test('computeDreamChart refuses a chart without a natal Moon or birth instant', async () => {
  const fixture = makeFixture();
  const withoutMoon = structuredClone(fixture.chart);
  delete withoutMoon.positions.personality.moon;
  await assert.rejects(
    computeDreamChart(withoutMoon, { transitInstant: TRANSIT_INSTANT, snapshotAt: fixture.snapshotAt }),
    /needs a computed birth chart/
  );
  const withoutBirth = structuredClone(fixture.chart);
  delete withoutBirth.raw.birthUtc;
  await assert.rejects(
    computeDreamChart(withoutBirth, { transitInstant: TRANSIT_INSTANT, snapshotAt: fixture.snapshotAt }),
    /needs a computed birth chart/
  );
  for (const broken of [null, undefined, {}, { positions: {} }, { positions: { personality: {} }, raw: {} }]) {
    await assert.rejects(
      computeDreamChart(broken, { snapshotAt: fixture.snapshotAt }),
      /needs a computed birth chart/, JSON.stringify(broken)
    );
  }
});

/* ------------------------------------------------------- dreamGraphChart */

test('a solved arc is reusable and the night sky can be skipped', async () => {
  const fixture = makeFixture();
  const first = await computeDreamChart(fixture.chart, {
    transitInstant: TRANSIT_INSTANT, snapshotAt: fixture.snapshotAt
  });
  assert.ok(first.solve && Number.isFinite(first.solve.instant), 'model keeps the solve for reuse');
  assert.equal(first.hasTransit, true);

  // Reusing the solve must not walk the lunar arc again: exactly one sky pass.
  let calls = 0;
  const counting = async instant => { ++calls; return fixture.snapshotAt(instant); };
  const reused = await computeDreamChart(fixture.chart, {
    transitInstant: TRANSIT_INSTANT, design: first.solve, snapshotAt: counting
  });
  assert.equal(reused.designMoment.utc, first.designMoment.utc);
  assert.deepEqual(reused.gates.all, first.gates.all);
  assert.deepEqual(reused.channels, first.channels);
  assert.equal(calls, 1, `reusing the solve cost ${calls} passes, expected 1`);

  // Comparison mode: no sky at all, and the transit fields degrade, not crash.
  let skyCalls = 0;
  const bare = await computeDreamChart(fixture.chart, {
    transit: false, design: first.solve,
    snapshotAt: async instant => { ++skyCalls; return fixture.snapshotAt(instant); }
  });
  assert.equal(skyCalls, 0, 'comparison mode must not touch the ephemeris');
  assert.equal(bare.hasTransit, false);
  assert.equal(bare.transit, null);
  assert.deepEqual(bare.gates.transit, {});
  const model = buildDreamTransitGraph(bare);
  assert.equal(model.transitGates.size, 0);
  assert.deepEqual(keys(model.channels), keys(first.channels));
  assert.equal(model.gateSource(1), 'natal');
  assert.equal(model.gateSource(28), 'inactive');
  for (const channel of model.channels) assert.equal(model.channelSource(channel), 'natal');
});

test('dreamGraphChart keeps the contract renderBodygraph consumes', async () => {
  const fixture = makeFixture();
  const dream = await computeDreamChart(fixture.chart, {
    transitInstant: TRANSIT_INSTANT, snapshotAt: fixture.snapshotAt
  });
  const graph = dreamGraphChart(dream);

  // Shape the shared renderer reads; a missing key would silently break the graph.
  const at = (object, path) => path.split('.').reduce((value, key) => (value == null ? undefined : value[key]), object);
  for (const path of ['gates.personality', 'gates.design', 'gates.all', 'channels',
    'centers.definedNames', 'type.name', 'positions.personality.date', 'positions.design.date']) {
    assert.notEqual(at(graph, path), undefined, `dreamGraphChart lost ${path}`);
  }
  assert.equal(graph.gates.personality, dream.gates.personality);
  assert.equal(graph.gates.design, dream.gates.design);
  assert.deepEqual(graph.gates.all, dream.gates.all);
  assert.equal(graph.channels, dream.channels);
  assert.deepEqual(graph.centers.definedNames, dream.centers.definedNames);
  assert.equal(graph.type.name, dream.type.name);
  assert.equal(graph.positions.personality.date, dream.source.personalityDate);
  assert.equal(graph.positions.design.date, dream.designMoment.iso.slice(0, 10));
  assert.match(graph.positions.design.date, /^\d{4}-\d{2}-\d{2}$/);
  assert.match(graph.positions.personality.date, /^\d{4}-\d{2}-\d{2}$/);
  // The renderer draws a circle per gate: nothing outside the topology may leak.
  for (const gate of graph.gates.all) assert.equal(isDreamGate(gate), true, `graph gate ${gate}`);
  for (const channel of graph.channels) assert.ok(isDreamChannelKey(dreamChannelKey(channel)));
  assert.equal(graph.positions.design.date, '2001-05-13');
});

/* ------------------------------------------------- buildDreamTransitGraph */

test('the dream transit graph can never complete a waking channel', async () => {
  const fixture = makeFixture();
  const dream = await computeDreamChart(fixture.chart, {
    transitInstant: TRANSIT_INSTANT, snapshotAt: fixture.snapshotAt
  });
  const model = buildDreamTransitGraph(dream);

  assert.equal(model.mode, 'overlay');
  assert.ok(model.natalGates instanceof Set);
  assert.ok(model.transitGates instanceof Set);
  // 57 is a dream gate and 34 is transit-adjacent in the waking chart, but
  // 34-57 is not a dream channel, so it can never light up the sleeping graph.
  assert.equal(model.natalGates.has(57), true);
  assert.equal(keys(model.channels).includes('34-57'), false);
  for (const channel of model.channels) {
    assert.ok(DREAM_CHANNELS.includes(channel), `${dreamChannelKey(channel)} is not a dream channel`);
    assert.ok(isDreamChannelKey(dreamChannelKey(channel)));
    for (const gate of channel.gates) {
      assert.equal(isDreamGate(gate), true, `${dreamChannelKey(channel)} uses waking gate ${gate}`);
      assert.equal(model.activeGates.has(gate), true, `${dreamChannelKey(channel)} is not fully active`);
    }
  }
  assert.deepEqual(keys(model.channels), keys(DREAM_CHANNELS));
  // The waking-only transit gates never enter the active set.
  for (const gate of [34, 64, 14, 44, 30]) assert.equal(model.activeGates.has(gate), false, `gate ${gate}`);
  assert.deepEqual([...model.activeGates].sort((a, b) => a - b),
    [1, 5, 8, 12, 15, 20, 27, 28, 38, 42, 50, 53, 57, 62]);
});

test('gateSource distinguishes natal, transit, both and inactive', async () => {
  const fixture = makeFixture();
  const dream = await computeDreamChart(fixture.chart, {
    transitInstant: TRANSIT_INSTANT, snapshotAt: fixture.snapshotAt
  });
  const overlay = buildDreamTransitGraph(dream);
  assert.equal(overlay.gateSource(1), 'natal');     // birth only
  assert.equal(overlay.gateSource(20), 'both');     // birth and sky
  assert.equal(overlay.gateSource(28), 'transit');  // sky only
  assert.equal(overlay.gateSource(19), 'inactive'); // neither, though it is a portal
  assert.equal(overlay.gateSource(34), 'inactive'); // not a dream gate at all
  for (const gate of DREAM_GATES) {
    assert.ok(['natal', 'transit', 'both', 'inactive'].includes(overlay.gateSource(gate)), `gate ${gate}`);
  }

  const only = buildDreamTransitGraph(dream, 'transit-only');
  assert.equal(only.mode, 'transit-only');
  assert.deepEqual([...only.activeGates].sort((a, b) => a - b), [20, 28, 38, 53]);
  for (const gate of only.activeGates) assert.equal(dream.transit.gates.has(gate), true, `gate ${gate}`);
  for (const gate of [1, 5, 8, 12, 15, 27, 42, 50, 57, 62]) {
    assert.equal(only.activeGates.has(gate), false, `transit-only kept birth gate ${gate}`);
    assert.equal(only.gateSource(gate), 'inactive', `gate ${gate}`);
  }
  assert.equal(only.gateSource(20), 'transit');
  assert.equal(only.gateSource(28), 'transit');
  // Only channels that stand on the sky alone survive; 20-57 loses its natal 57.
  assert.deepEqual(keys(only.channels), ['28-38']);
  assert.ok(only.channels.every(channel => only.channelSource(channel) === 'transit'));
  assert.deepEqual([...only.definedCenters].sort(), ['root', 'spleen']);

  // Building either mode must not mutate the model it was given.
  const before = JSON.stringify({ all: dream.gates.all, transit: [...dream.transit.gates], defined: dream.centers.definedNames });
  buildDreamTransitGraph(dream);
  buildDreamTransitGraph(dream, 'transit-only');
  assert.equal(JSON.stringify({ all: dream.gates.all, transit: [...dream.transit.gates], defined: dream.centers.definedNames }), before);
});

test('channelSource reports natal, transit and sky-completed channels', async () => {
  const fixture = makeFixture();
  const dream = await computeDreamChart(fixture.chart, {
    transitInstant: TRANSIT_INSTANT, snapshotAt: fixture.snapshotAt
  });
  const model = buildDreamTransitGraph(dream);
  const byKey = key => model.channels.find(channel => dreamChannelKey(channel) === key);

  // Both ends from birth.
  assert.equal(model.channelSource(byKey('1-8')), 'natal');
  assert.equal(model.channelSource(byKey('20-57')), 'natal');
  // Both ends from the sky.
  assert.equal(model.channelSource(byKey('28-38')), 'transit');
  // 42 is natal, 53 arrives with the sky: the channel is completed by transit.
  assert.equal(model.channelSource(byKey('42-53')), 'completed');
  assert.equal(model.natalGates.has(42), true);
  assert.equal(model.natalGates.has(53), false);
  assert.equal(model.transitGates.has(53), true);
  for (const channel of model.channels) {
    assert.ok(['natal', 'transit', 'completed'].includes(model.channelSource(channel)),
      `${dreamChannelKey(channel)} -> ${model.channelSource(channel)}`);
  }
  // Natal centre set is the birth definition, untouched by the sky.
  assert.deepEqual([...model.natalCenters].sort(), ['g', 'sacral', 'spleen', 'throat']);
  assert.deepEqual([...model.definedCenters].sort(), ['g', 'root', 'sacral', 'spleen', 'throat']);
});

test('the dream realm lookup agrees with the topology', () => {
  for (const gate of DREAM_GATES) {
    assert.ok(['light', 'earth', 'demon'].includes(dreamRealmOf(gate)), `gate ${gate}`);
  }
  assert.equal(dreamRealmOf(62), 'light');
  assert.equal(dreamRealmOf(12), 'earth');
  assert.equal(dreamRealmOf(19), 'demon');
  assert.equal(dreamRealmOf(34), null);
});

/* -------------------------------------------------- buildCompositeRealms */

/** One activation as the dream model stores it in `gates.byNumber`. */
const gateEntry = (planet, line = 1) => ({ planet, line, color: 1, tone: 1, base: 1 });

/**
 * A hand-built sleep model carrying only what `buildCompositeRealms()` reads:
 * the two per-gate Maps. `personality` and `design` are `{ gate: entries[] }`,
 * so a test states exactly which half of which design carries which gate.
 */
function sleepModel({ personality = {}, design = {} } = {}) {
  const byNumber = side => {
    const map = new Map();
    for (const [gate, entries] of Object.entries(side)) map.set(Number(gate), [...entries]);
    return map;
  };
  return { gates: { byNumber: { personality: byNumber(personality), design: byNumber(design) } } };
}

const realmRows = (composite, realmId) => composite.realms.find(realm => realm.id === realmId).rows;
const rowOf = (composite, gate) => {
  for (const realm of composite.realms) {
    const row = realm.rows.find(item => item.gate === gate);
    if (row) return row;
  }
  return null;
};

test('the composite partition the fifteen dream gates across the three fields', () => {
  const composite = buildCompositeRealms(sleepModel({}), sleepModel({}));
  assert.deepEqual(Object.keys(composite), ['realms']);
  assert.equal(composite.realms.length, 3);
  assert.deepEqual(composite.realms.map(realm => realm.id), [...DREAM_REALM_ORDER]);
  assert.deepEqual(composite.realms.map(realm => realm.id), ['light', 'earth', 'demon']);
  // Same order and same portal as `computeDreamChart()` publishes, so
  // `realmPanel()` reads this model without a branch of its own.
  assert.deepEqual(composite.realms.map(realm => realm.portal), [62, 12, 19]);
  for (const realm of composite.realms) {
    assert.equal(realm.portal, DREAM_REALMS[realm.id].portal);
    assert.deepEqual([...realm.gates], [...DREAM_REALMS[realm.id].gates]);
  }
  // Exactly one owner per gate: no gate in two fields, no gate missing.
  const listed = composite.realms.flatMap(realm => realm.gates);
  assert.equal(listed.length, DREAM_GATES.length);
  assert.deepEqual([...listed].sort((a, b) => a - b), [...DREAM_GATES]);
  assert.deepEqual([...new Set(listed)].sort((a, b) => a - b), [...DREAM_GATES]);
  for (const realm of composite.realms) {
    for (const gate of realm.gates) assert.equal(dreamRealmOf(gate), realm.id, `gate ${gate} in ${realm.id}`);
  }
  // 15 / 5 / 5 = 3: each field holds five gates and one portal among them.
  for (const realm of composite.realms) {
    assert.equal(realm.gates.length, 5, `${realm.id} gates`);
    assert.ok(realm.gates.includes(realm.portal), `${realm.id} portal is not one of its gates`);
  }
});

test('a portal row survives with nobody activating it, and reports no owner', () => {
  // Both people carry gate 20 and 57 only: the light portal 62 is untouched,
  // 12 has nothing at all, and 19 is untouched while 28/38 are carried.
  const a = sleepModel({ personality: { 20: [gateEntry('sun', 3)] }, design: { 57: [gateEntry('moon', 1)] } });
  const b = sleepModel({ personality: { 28: [gateEntry('venus', 5)] } });
  const composite = buildCompositeRealms(a, b);

  for (const [realmId, portal] of [['light', 62], ['earth', 12], ['demon', 19]]) {
    const row = rowOf(composite, portal);
    assert.ok(row, `portal ${portal} has no row`);
    assert.equal(row.portal, true, `row ${portal} is not flagged as a portal`);
    assert.equal(row.realm, realmId);
    assert.equal(row.activated, false, `portal ${portal} claims an activation`);
    assert.equal(row.owner, null, `portal ${portal} claims an owner`);
    assert.deepEqual(row.sources, [], `portal ${portal} invented a source`);
  }
  // The earth field holds nothing but its portal: rows are [12] and nothing else.
  assert.deepEqual(realmRows(composite, 'earth').map(row => row.gate), [12]);
  assert.deepEqual(realmRows(composite, 'light').map(row => row.gate), [62, 20, 57]);
  assert.deepEqual(realmRows(composite, 'demon').map(row => row.gate), [19, 28]);
});

test('ownership resolves to a, b or both, and an unactivated non-portal row is dropped', () => {
  const a = sleepModel({ personality: { 1: [gateEntry('sun', 5)], 20: [gateEntry('moon', 3)] } });
  const b = sleepModel({ design: { 1: [gateEntry('saturn', 2)], 8: [gateEntry('jupiter', 4)] } });
  const composite = buildCompositeRealms(a, b);

  const onlyA = rowOf(composite, 20);
  assert.equal(onlyA.owner, 'a');
  assert.equal(onlyA.activated, true);

  const onlyB = rowOf(composite, 8);
  assert.equal(onlyB.owner, 'b');
  assert.equal(onlyB.activated, true);

  const shared = rowOf(composite, 1);
  assert.equal(shared.owner, 'both');
  assert.equal(shared.activated, true);

  // Gate 57 is a dream gate nobody carries, and it is not a portal: no row.
  assert.equal(isDreamGate(57), true);
  for (const realm of composite.realms) {
    assert.equal(realm.rows.some(row => row.gate === 57), false, `${realm.id} lists the unactivated gate 57`);
    for (const row of realm.rows) {
      assert.equal(row.portal || row.activated, true, `gate ${row.gate} slipped past the filter`);
      // No owner is only ever an unopened portal; a carried gate always has one.
      if (row.owner === null) assert.equal(row.activated, false, `gate ${row.gate} is activated but owned by nobody`);
      if (row.activated) assert.ok(['a', 'b', 'both'].includes(row.owner), `gate ${row.gate} owner ${row.owner}`);
    }
  }
  // Ownership is derived from the two designs, never from a single one.
  assert.equal(rowOf(composite, 1).sources.length, 2);
});

test('sources appear only for a half the person actually carries, keyed person-side', () => {
  const a = sleepModel({
    personality: { 1: [gateEntry('sun', 5), gateEntry('mercury', 3)] },
    design: { 1: [gateEntry('moon', 2)] }
  });
  const b = sleepModel({ design: { 1: [gateEntry('saturn', 6)] } });
  const composite = buildCompositeRealms(a, b);
  const row = rowOf(composite, 1);

  // Person A carries both halves, B one: three groups, in a-personality,
  // a-design, b-personality, b-design order.
  assert.deepEqual(row.sources.map(source => source.key), ['a-personality', 'a-design', 'b-design']);
  assert.deepEqual(row.sources.map(source => source.person), ['a', 'a', 'b']);
  assert.deepEqual(row.sources.map(source => source.side), ['personality', 'design', 'design']);
  // The label is the i18n key the view translates, never a rendered string.
  assert.deepEqual(row.sources.map(source => source.label), ['Sleep personality', 'Sleep design', 'Sleep design']);
  for (const source of row.sources) {
    assert.match(source.key, /^[ab]-(?:personality|design)$/);
    assert.deepEqual(Object.keys(source).sort(), ['entries', 'key', 'label', 'person', 'side']);
  }
  // Entries are planet + line only; the model's leftover fields are not copied.
  assert.deepEqual(row.sources[0].entries, [{ planet: 'sun', line: 5 }, { planet: 'mercury', line: 3 }]);
  assert.deepEqual(row.sources[1].entries, [{ planet: 'moon', line: 2 }]);
  assert.deepEqual(row.sources[2].entries, [{ planet: 'saturn', line: 6 }]);
  // A half on neither side stays out; a half each side stays in.
  const oneSided = buildCompositeRealms(sleepModel({}), sleepModel({ personality: { 57: [gateEntry('moon', 1)] } }));
  assert.deepEqual(rowOf(oneSided, 57).sources.map(source => source.key), ['b-personality']);
  assert.equal(rowOf(oneSided, 57).owner, 'b');
});

test('activated means either person, and the composite never claims the night sky', () => {
  const cases = [
    [sleepModel({ personality: { 38: [gateEntry('sun', 1)] } }), sleepModel({}), 'a'],
    [sleepModel({}), sleepModel({ design: { 38: [gateEntry('sun', 1)] } }), 'b'],
    [sleepModel({ personality: { 38: [gateEntry('sun', 1)] } }), sleepModel({ personality: { 38: [gateEntry('moon', 2)] } }), 'both']
  ];
  for (const [a, b, owner] of cases) {
    const row = rowOf(buildCompositeRealms(a, b), 38);
    assert.equal(row.owner, owner);
    // The portal highlight and the row filter both read `activated`, so one
    // person is enough for either.
    assert.equal(row.activated, true, `owner ${owner} is not activated`);
    // A composite carries no overlay at all: a night sky can never leak in.
    assert.equal(row.transitActivated, false, `owner ${owner} claims a transit activation`);
  }
  for (const realm of buildCompositeRealms(cases[2][0], cases[2][1]).realms) {
    for (const row of realm.rows) assert.equal(row.transitActivated, false, `gate ${row.gate}`);
  }
  // A real `computeDreamChart({ transit: false })` model carries an empty sky;
  // feeding two of those in still yields no transit rows.
  assert.equal(rowOf(buildCompositeRealms(sleepModel({}), sleepModel({})), 62).transitActivated, false);
});

test('buildCompositeRealms is pure: no clock, no mutation of either model', () => {
  const a = sleepModel({ personality: { 1: [gateEntry('sun', 5)], 62: [gateEntry('moon', 1)] } });
  const b = sleepModel({ design: { 8: [gateEntry('saturn', 2)] }, personality: { 1: [gateEntry('mars', 3)] } });
  const snapshot = () => JSON.stringify([
    [...a.gates.byNumber.personality], [...a.gates.byNumber.design],
    [...b.gates.byNumber.personality], [...b.gates.byNumber.design]
  ]);
  const before = snapshot();
  const originalNow = Date.now;
  // A clock read would either throw here or change the answer between calls.
  Date.now = () => { throw new Error('buildCompositeRealms read the clock'); };
  let first, second;
  try {
    first = buildCompositeRealms(a, b);
    second = buildCompositeRealms(a, b);
  } finally {
    Date.now = originalNow;
  }
  assert.equal(snapshot(), before, 'the inputs were mutated');
  assert.deepEqual(first, second, 'two calls on the same models disagree');
  // Editing the result must not reach back into the inputs either.
  first.realms[0].rows[0].sources.push({ person: 'a', side: 'design', key: 'a-design', label: 'x', entries: [] });
  assert.equal(snapshot(), before, 'the result aliases the input');
  assert.notDeepEqual(first, buildCompositeRealms(a, b));
});

test('an empty pair degrades to one portal row per field instead of throwing', () => {
  for (const [a, b] of [[{}, {}], [undefined, undefined], [null, null], [undefined, sleepModel({})]]) {
    const composite = buildCompositeRealms(a, b);
    assert.equal(composite.realms.length, 3, `realms for ${JSON.stringify(a)} / ${JSON.stringify(b)}`);
    assert.deepEqual(composite.realms.map(realm => realm.rows.map(row => row.gate)), [[62], [12], [19]]);
    for (const realm of composite.realms) {
      const [row] = realm.rows;
      assert.equal(row.portal, true);
      assert.equal(row.activated, false);
      assert.equal(row.owner, null);
      assert.equal(row.transitActivated, false);
      assert.deepEqual(row.sources, []);
    }
  }
});
