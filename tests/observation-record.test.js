import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeObservation, observationBackup, previewObservationRestore, restoreObservationRecords } from '../src/lib/observation-record.js';

const note = (id = 'note-one') => ({ id, observedAt: '2026-09-27T01:00:00.000Z', displayZone: 'Asia/Shanghai',
  personId: 'person-one', alias: 'A', raw: 'I felt restless.', interpretation: '', event: '', tags: ['work'],
  snapshot: { instantUtc: '2026-09-27T01:00:00.000Z', displayZone: 'Asia/Shanghai', mode: 'overlay', planetFilter: 'all',
    activations: { sun: { gate: 46, line: 4 } }, activeGates: ['46'], activeChannels: ['29-46'],
    definedCenters: ['G', 'Sacral'], engineVersion: 'natalengine-1.6.0', ruleVersion: 'timeline-rules-1' },
  createdAt: '2026-09-27T01:00:00.000Z', updatedAt: '2026-09-27T01:00:00.000Z', restoredFrom: null });

test('observation format keeps raw experience apart from later interpretation and chart snapshot', () => {
  const clean = normalizeObservation(note());
  assert.equal(clean.raw, 'I felt restless.');
  assert.equal(clean.interpretation, '');
  assert.equal(clean.snapshot.activations.sun.gate, 46);
  assert.equal(clean.displayZone, 'Asia/Shanghai');
  assert.throws(() => normalizeObservation({ ...note(), observedAt: '2026-02-30T00:00:00.000Z' }));
  assert.throws(() => normalizeObservation({ ...note(), snapshot: { ...note().snapshot, activations: { sun: { gate: 100, line: 1 } } } }));
});

test('deidentified export removes explicit person linkage without rewriting prose', () => {
  const backup = observationBackup([note()], { anonymous: true });
  assert.equal(backup.records[0].personId, null);
  assert.equal(backup.records[0].alias, '');
  assert.equal(backup.records[0].snapshot, null);
  assert.equal(backup.records[0].raw, note().raw);
});

test('restore preview and commit preserve conflicting versions and skip unchanged', () => {
  const old = note();
  const changed = { ...note(), raw: 'A later version.' };
  const backup = observationBackup([changed, note('new-note')]);
  const preview = previewObservationRestore([old], backup);
  assert.deepEqual(preview.counts, { add: 1, conflict: 1, unchanged: 0 });
  const restored = restoreObservationRecords([old], backup, () => 'conflict-copy');
  assert.equal(restored.records.length, 2);
  assert.equal(restored.records.find(record => record.id === 'conflict-copy').restoredFrom, 'note-one');
  assert.equal(old.raw, 'I felt restless.');
  assert.equal(previewObservationRestore([old], observationBackup([old])).counts.unchanged, 1);
});
