import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
const read = name => JSON.parse(readFileSync(new URL(`../docs/true-node-parity/${name}`, import.meta.url)));

test('pre-edit node trace isolates the missing emission sample; C instrumentation preserves unmodified output', () => {
  const before = read('trace-before.json'), experiment = read('trace-experiment.json'), after = read('trace-after.json');
  assert.equal(before.baseline, 'fb5743b87346e8d16810b7c4e15a3e5d01a0f3a9');
  for (const evidence of [before, experiment, after]) assert.equal(evidence.instrumentedCFinalExactlyEqualsUnmodifiedC, true);
  const b = before.modes[0], a = after.modes[0];
  assert.ok(b.centralStagePositionMaxDifference.rawMoon < 1e-16);
  assert.ok(b.centralStageVelocityMaxDifference.rawMoon < 1e-16);
  assert.ok(b.centralStagePositionMaxDifference.lightTimeMoon > 1e-9);
  assert.ok(Math.abs(b.longitudeResidualMas + 9.41854384564067) < 1e-8);
  assert.ok(Math.abs(experiment.modes[0].longitudeResidualMas) < .001);
  for (const stage of ['lightTimeMoon', 'bias', 'precession', 'nutation', 'meanEcliptic', 'ecliptic', 'nodeDirection', 'correctedNode']) assert.ok(a.centralStagePositionMaxDifference[stage] < 1e-15, stage);
  assert.deepEqual(a.sharp[2].sampleEpoch.slice(2), a.swissC[2].sampleEpoch.slice(2));
  assert.ok(Math.abs(before.modes[1].longitudeResidualMas) < .001, 'TRUEPOS already matched C TRUEPOS');
});

test('native node matches independent C fixtures across epochs/flags and retains source-spy guards', () => {
  const rows = read('api-results.json').comparisons.filter(row => (row.flags & 7) === 2);
  assert.equal(rows.length, 108);
  const dotnet = process.env.DOTNET || 'dotnet';
  const project = 'docs/true-node-parity/scripts/node-harness/NodeHarness.csproj';
  execFileSync(dotnet, ['build', project, '-c', 'Release', '-v', 'quiet', '-m:1'], { stdio: 'pipe' });
  const output = execFileSync(dotnet, ['docs/true-node-parity/scripts/node-harness/bin/Release/net10.0/SharpAstrology.SwissEphemerides.IntegrationTests.dll', 'public/engine/ephe'], { input: rows.map(JSON.stringify).join('\n') + '\n', encoding: 'utf8' });
  const actual = output.trim().split('\n').map(line => JSON.parse(line));
  assert.equal(actual.length, rows.length);
  for (let i = 0; i < actual.length; i++) {
    const value = actual[i], fixture = rows[i];
    assert.equal(value.syntheticGuards, 24);
    assert.equal(value.source, 'SwissEph');
    const residual = ((value.longitude - fixture.swissC.longitude + 540) % 360 - 180) * 3600000;
    assert.ok(Math.abs(residual) < .001, `${fixture.case} ${fixture.side} ${fixture.mode}`);
    if (fixture.mode !== 'speed3') assert.ok(Math.abs(value.speed - fixture.swissC.speed) < 1e-8);
    if (fixture.unchangedControl) value.vector.forEach((axis, j) => assert.ok(Math.abs(axis-fixture.sharp.vector[j])<1e-14,`${fixture.case}/${fixture.mode}/axis${j}: delta ${Math.abs(axis-fixture.sharp.vector[j])}`));
  }
});
