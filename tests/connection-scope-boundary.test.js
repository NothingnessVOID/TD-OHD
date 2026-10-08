import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { phase1Projection, preservedSource, readCurrentSource, releaseCandidate } from './helpers/knowledge-release-contract.js';

const digest = value => createHash('sha256').update(value).digest('hex');

test('Phase 1 renderer projections authorize only the reviewed composite UI bodies', () => {
  for (const [file, historical] of [
    ['src/bodygraph.js', releaseCandidate],
    ['src/views/connection.js', releaseCandidate]
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
  const baseGraph = preservedSource('src/bodygraph.js', releaseCandidate).toString();
  const projected = phase1Projection(source, 'src/bodygraph.js').toString();
  assert.notEqual(digest(unrelatedEdit), digest(source));
  assert.notEqual(digest(phase1Projection(unrelatedEdit, 'src/bodygraph.js')), digest(baseGraph));

  const connection = readCurrentSource('src/views/connection.js').toString();
  const unrelatedEditConnection = connection.replace('function rerenderConnectionGraphs()', 'function rerenderConnectionGraphs() /* unrelated edit */');
  const baseConnection = preservedSource('src/views/connection.js', releaseCandidate);
  assert.equal(digest(phase1Projection(connection, 'src/views/connection.js')), digest(baseConnection));
  assert.notEqual(digest(unrelatedEditConnection), digest(connection));
  assert.notEqual(digest(phase1Projection(unrelatedEditConnection, 'src/views/connection.js')), digest(baseConnection));
});

test('unapproved modules keep exact historical byte protection', () => {
  for (const file of ['src/features/transit-timeline/core.js', 'src/lib/chart-engine/sharp-contract.js', 'src/lib/human-design/bodygraph-geometry.js', 'src/views/chart.js']) {
    const source = readCurrentSource(file);
    assert.equal(digest(source), digest(preservedSource(file, releaseCandidate)), file);
  }
});
