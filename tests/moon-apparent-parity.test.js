import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
const read = name => JSON.parse(readFileSync(new URL(`../docs/moon-apparent-parity/${name}`, import.meta.url)));
const before = read('trace-before.json'), after = read('trace-after.json'), result = read('results.json'), api = read('api-results.json');

test('read-only baseline traces locate the lunar epoch error before aberration/bias/precession', () => {
  assert.equal(before.baseline, '4054166c5284a729f093e160daafdab01cbf52f3');
  assert.ok(before.stageVectorMaxAbsDifference.rawMoon < 1e-16);
  assert.ok(before.stageVectorMaxAbsDifference.earth < 1e-16);
  assert.ok(before.stageVectorMaxAbsDifference.refetchedMoon < 1e-12);
  assert.ok(before.stageVectorMaxAbsDifference.lifted > 1e-7);
  assert.ok(Math.abs(before.projectedEarthDisplacementArcsec - before.finalLongitudeResidualArcsec) < .001);
  assert.ok(Math.abs(after.finalLongitudeResidualArcsec) < 1e-6);
  assert.ok(after.stageVectorMaxAbsDifference.lifted < 1e-15);
  assert.ok(Math.abs(after.sharp.lightTime[0] - after.swissC.lightTime[0]) * 86400 < 1e-12);
});

test('independent Swiss C all26 activations/mechanics match 9/9; non-Moon outputs and node remain unchanged', () => {
  assert.equal(result.summary.nineFullChartMatches, 9);
  assert.equal(result.summary.nineMechanicsMatches, 9);
  assert.deepEqual(result.summary.nonMoonNativeOutputsChanged, []);
  assert.ok(result.summary.moonMaxSameEpochResidualMas < .001);
  assert.ok(result.summary.moonMaxResidualArcsec < .0001);
  assert.equal(result.summary.trueNodeMaxResidualMas, 9.41854384564067);
  for (const row of result.cases) {
    assert.deepEqual(row.SWISS_PARITY.activationMismatches, []);
    assert.deepEqual(row.SWISS_PARITY.mechanicsMismatches, []);
  }
});

test('native Moon uses center(t-dt), observer(t), single delay and unchanged output-speed flags against C fixtures', () => {
  const dotnet = process.env.DOTNET || 'dotnet';
  const project = 'docs/moon-apparent-parity/scripts/moon-harness/MoonHarness.csproj';
  execFileSync(dotnet, ['build', project, '-c', 'Release', '-v', 'quiet', '-m:1'], { stdio: 'pipe' });
  // JPL also verified in audit with the 2.8 GB local file; never require or
  // publish that binary for regular regression. Production uses locked SE1.
  const rows = api.comparisons.filter(row => (row.flags & 7) === 2);
  assert.equal(rows.length, 144);
  const input = rows.map(row => JSON.stringify(row)).join('\n') + '\n';
  const output = execFileSync(dotnet, ['docs/moon-apparent-parity/scripts/moon-harness/bin/Release/net10.0/SharpAstrology.SwissEphemerides.IntegrationTests.dll', 'public/engine/ephe'], { input, encoding: 'utf8' });
  const actual = output.trim().split('\n').map(line => JSON.parse(line));
  assert.equal(actual.length, rows.length);
  for (let index = 0; index < rows.length; index++) {
    const value = actual[index], fixture = rows[index];
    assert.ok(!value.error, value.error);
    assert.equal(value.guardsPassed, true);
    const residual = ((value.longitude - fixture.swissC.longitude + 540) % 360 - 180) * 3600000;
    assert.ok(Math.abs(residual) < .001, `${fixture.case} ${fixture.side} ${fixture.mode}: ${residual} mas`);
    for (let axis = 0; axis < 3; axis++) assert.ok(Math.abs(value.vector[axis] - fixture.swissC.vector[axis]) < 1e-14);
    if (fixture.mode === 'no-speed') {
      assert.ok(value.speed === 0);
      assert.deepEqual(value.vector.slice(3), [0, 0, 0]);
    }
    // Position parity is asserted against C above. Retain the observed
    // topocentric speed result; existing observer-speed residual is deferred.
    assert.ok(Math.abs(value.speed - fixture.sharp.speed) < 1e-10);
  }
});
