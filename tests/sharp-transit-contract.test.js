import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { SharpNativeClient, nativeClient } from '../scripts/lib/sharp-native-client.mjs';
import { adaptSharpTransit } from '../src/lib/chart-engine/sharp-transit-contract.js';

const points = ['sun', 'earth', 'northNode', 'southNode', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto'];
const synthetic = () => ({ utc: '2026-01-01T00:00:00.000Z', activations: Object.fromEntries(points.map(point => [point,
  { gate: 1, line: 1, color: 1, tone: 1, base: 1, longitude: 224 }])) });

test('Sharp transit contract requires all 13 official subdivision fields and bounds', () => {
  const raw = synthetic();
  const before = JSON.stringify(raw);
  const adapted = adaptSharpTransit(raw);
  assert.equal(adapted.date, '2026-01-01');
  assert.deepEqual(adapted.activeGates, [1]);
  assert.equal(adapted.activeGateCount, 1);
  assert.equal(JSON.stringify(raw), before);
  for (const [field, value] of [['gate', 0], ['gate', 65], ['line', 0], ['line', 7], ['color', 7], ['tone', 0], ['base', 6], ['longitude', -1], ['longitude', 360], ['longitude', NaN]]) {
    const invalid = synthetic(); invalid.activations.sun[field] = value;
    assert.throws(() => adaptSharpTransit(invalid), /Invalid Sharp transit/);
  }
  const missing = synthetic(); delete missing.activations.pluto;
  assert.throws(() => adaptSharpTransit(missing), /all 13/);
});

test('native Sharp single and batch transit responses agree including exact seconds and subdivisions', async () => {
  const instants = ['2026-01-01T00:00:01Z', '2026-09-23T06:10:48Z', '2026-09-23T06:10:49Z', '2026-12-31T23:59:59Z'];
  const values = await nativeClient().batch(instants);
  for (const [index, instant] of instants.entries()) {
    assert.deepEqual(values[index], await nativeClient().snapshot(instant));
    const adapted = adaptSharpTransit(values[index]);
    assert.deepEqual(Object.keys(adapted.gates).sort(), [...points].sort());
    for (const [point, activation] of Object.entries(values[index].activations)) {
      for (const field of ['gate', 'line', 'color', 'tone', 'base', 'longitude'])
        assert.equal(adapted.gates[point][field], activation[field], `${point}.${field}`);
    }
  }
  assert.deepEqual(values.slice(1, 3).map(value => `${value.activations.moon.gate}.${value.activations.moon.line}`), ['13.6', '49.1']);
  assert.notEqual(values[1].activations.moon.longitude, values[2].activations.moon.longitude);
});

test('native protocol rejects non-UTC input then remains usable', async () => {
  await assert.rejects(nativeClient().request({ utcInstants: ['2026-01-01T00:00:00'] }), /UTC timezone suffix/);
  assert.equal(Object.keys((await nativeClient().snapshot('2026-01-01T00:00:00Z')).activations).length, 13);
});

test('file-based Swiss absence is a hard failure with no Moshier fallback', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'td-ohd-missing-swiss-'));
  const client = new SharpNativeClient({ epheRoot: directory });
  try {
    await assert.rejects(client.snapshot('2026-01-01T00:00:00Z'), /(?:ephemeris|Swiss|sepl_18|semo_18|not find)/i);
  } finally { await client.close(); await rm(directory, { recursive: true, force: true }); }
});
