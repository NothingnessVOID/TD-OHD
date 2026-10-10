import {incrementHistoricalSource} from './helpers/release-increment-projection.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { phase1Projection, preservedSource, readCurrentSource, releaseCandidate } from './helpers/knowledge-release-contract.js';

const digest = value => createHash('sha256').update(value).digest('hex');

test('Phase 1 renderer projections authorize only the reviewed composite UI bodies', () => {
  for (const [file, historical] of [
    ['src/bodygraph.js', 'f6e8232664ecbabc12544d1e99a131fd5261c6e8'],
    ['src/views/connection.js', 'f6e8232664ecbabc12544d1e99a131fd5261c6e8']
  ]) {
    const current = readCurrentSource(file);
    const expectedHistorical = preservedSource(file, historical);
    const projected = phase1Projection(current, file);
    assert.deepEqual(projected, expectedHistorical, `${file} projected outside Phase 1 must match baseline`);
    assert.notDeepEqual(current, projected, `${file} must contain only an explicit Phase 1 delta`);
  }
});

test('unrelated protected-function edits survive the composite projection and therefore fail byte comparison', () => {
  const source = readCurrentSource('src/bodygraph.js').toString();
  const unrelatedEdit = source.replace('function litFor(', 'function litFor( /* unrelated edit */');
  const baseGraph = preservedSource('src/bodygraph.js', 'f6e8232664ecbabc12544d1e99a131fd5261c6e8').toString();
  const projected = phase1Projection(source, 'src/bodygraph.js').toString();
  assert.notEqual(digest(unrelatedEdit), digest(source));
  assert.throws(() => phase1Projection(unrelatedEdit, 'src/bodygraph.js'), /unreviewed gate ink delta/, 'unrelated changes must fail the exact contrast scope');

  const connection = readCurrentSource('src/views/connection.js').toString();
  const unrelatedEditConnection = connection.replace('function rerenderConnectionGraphs()', 'function rerenderConnectionGraphs() /* unrelated edit */');
  const baseConnection = preservedSource('src/views/connection.js', 'f6e8232664ecbabc12544d1e99a131fd5261c6e8');
  assert.equal(digest(phase1Projection(connection, 'src/views/connection.js')), digest(baseConnection));
  assert.notEqual(digest(unrelatedEditConnection), digest(connection));
  assert.throws(() => phase1Projection(unrelatedEditConnection, 'src/views/connection.js'), /Unreviewed increment source/);
});

test('unapproved modules keep exact historical byte protection', () => {
  for (const file of ['src/features/transit-timeline/core.js', 'src/lib/chart-engine/sharp-contract.js', 'src/lib/human-design/bodygraph-geometry.js', 'src/views/chart.js']) {
    const source = readCurrentSource(file);
    assert.equal(digest(incrementHistoricalSource(file)), digest(preservedSource(file, releaseCandidate)), file);
  }
});
