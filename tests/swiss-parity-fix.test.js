import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { windowsSwissBaseline } from './helpers/windows-swiss-baseline.js';
import { engineIdentity } from '../scripts/lib/engine-identity.mjs';
import { ENGINE_IDENTITY, ENGINE_SIGNATURE } from '../src/lib/chart-engine/engine-identity.js';
import { ANNUAL_SIGNATURE } from '../src/features/transit-timeline/annual-signature.js';
import { sharpProvider } from '../src/lib/chart-engine/sharp-provider.js';
const read = file => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
const evidence = JSON.parse(read('docs/true-node-parity/results.json'));

test('both runtime projects use the same pinned repo-local Swiss source', () => {
  for (const file of ['engine-core/SharpTransitCore.csproj', 'engine-wasm/SharpChartEngine.csproj']) {
    const text = read(file);
    assert.match(text, /ProjectReference Include="\.\.\/third_party\/SharpAstrology.SwissEph\/SharpAstrology.SwissEph.csproj"/);
    assert.doesNotMatch(text, /PackageReference Include="SharpAstrology.SwissEph"/);
    assert.match(text, /SharpAstrology.HumanDesign" Version="1.2.0"/);
  }
  assert.equal(ENGINE_IDENTITY.swissUpstreamCommit, '342a57997c1b987e7949acc98897c8b73d05939a');
});

test('source and cache signature includes patch, time semantics and locked ephemeris hashes', () => {
  const actual = engineIdentity();
  assert.deepEqual(actual.identity, ENGINE_IDENTITY);
  assert.equal(actual.signature, ENGINE_SIGNATURE);
  assert.equal(ANNUAL_SIGNATURE, ENGINE_SIGNATURE);
  const manifest = JSON.parse(read('public/transit-data/manifest.json'));
  assert.equal(ENGINE_SIGNATURE, '59b90e629033cc7faf95');
  assert.equal(manifest.signature, ENGINE_SIGNATURE, 'published annual cache must use the current engine signature');
  assert.deepEqual(Object.keys(manifest.years), Array.from({ length: 16 }, (_, index) => String(2021 + index)));
  for (const entry of Object.values(manifest.years)) {
    const data = JSON.parse(read(`public/transit-data/${entry.path}`));
    assert.equal(data.signature, ENGINE_SIGNATURE);
  }
  const cacheKey = sharpProvider.cacheKey({ birthDate: '2025-01-19', birthTime: '22:57', timezone: 0 });
  assert.ok(cacheKey.includes(ENGINE_SIGNATURE));
  assert.equal(JSON.parse(read('third_party/SharpAstrology.SwissEph/patch-manifest.json')).identity.patchedSourceSha256, actual.identity.patchedSourceSha256);
});

test('frozen external Jovian Golden reference is untouched', () => {
  const sha = createHash('sha256').update(read('docs/golden-reference/golden-cases.json')).digest('hex');
  assert.equal(sha, evidence.goldenSha256);
  assert.equal(sha, '431dbbc6af5d14cade31538177a6677f692ba5001fda3d97d811cb3219b1d8bb');
});

test('proper UTC, fractional ticks, inverse, DE/ICRS/Moshier/J2000 and speed guards regress against Swiss C fixtures', () => {
  const dotnet = process.env.DOTNET || 'dotnet';
  const project = 'docs/sharp-swiss-parity-fix/scripts/parity-harness/ParityHarness.csproj';
  execFileSync(dotnet, ['build', project, '-c', 'Release', '-v', 'quiet', '-m:1'], { stdio: 'pipe' });
  const requests = evidence.cases.map(row => JSON.stringify({ id: row.id, birthUtc: row.oracle.birthUtc, oracle: row.oracle }));
  const output = execFileSync(dotnet, ['docs/sharp-swiss-parity-fix/scripts/parity-harness/bin/Release/net10.0/SharpAstrology.SwissEphemerides.IntegrationTests.dll', 'public/engine/ephe'], { input: `${requests.join('\n')}\n`, encoding: 'utf8' });
  const actual = output.trim().split('\n').map(line => JSON.parse(line));
  assert.equal(actual.length, 9);
  const platformBaseline = process.platform === 'win32' ? windowsSwissBaseline(`${requests.join('\n')}\n`, resolve('public/engine/ephe')) : null;
  if (platformBaseline) assert.equal(platformBaseline.length, 9);
  const dut1 = [];
  for (let index = 0; index < actual.length; index++) {
    const result = actual[index], fixture = evidence.cases[index];
    assert.equal(result.id, fixture.id);
    if (platformBaseline) assert.equal(platformBaseline[index].id, fixture.id);
    assert.ok(!result.error, result.error);
    assert.equal(result.guardsPassed, true);
    assert.equal(result.ut1, fixture.oracle.ut1);
    assert.ok(Math.abs(result.fractionUt1 - fixture.oracle.fractionUt1) * 86400 < .0001);
    assert.ok(Math.abs(Date.parse(result.roundTripUtc) - Date.parse(result.birthUtc)) <= 1);
    for (const side of ['personality', 'design']) {
      // Require all thirteen bodies, not only whichever fields a candidate emits.
      assert.equal(Object.keys(result[side]).length, 13);
      assert.deepEqual(Object.keys(result[side]).sort(), Object.keys(fixture.sharp[side]).sort());
      if (platformBaseline) assert.deepEqual(Object.keys(result[side]).sort(), Object.keys(platformBaseline[index][side]).sort());
      // Current Moon/True Node fixtures; earlier audit evidence stays frozen.
      for (const [body, value] of Object.entries(result[side])) {
        const reference = fixture.sharp[side][body];
        for (const field of ['gate', 'line', 'color', 'tone', 'base']) assert.equal(value[field], reference[field]);
        assert.ok(Math.abs(value.longitude - reference.longitude) < 1e-10);
        // Match the existing independent-C speed bound; finite differences amplify platform rounding.
        assert.ok(Number.isFinite(value.speed));
        const speedReference=platformBaseline ? platformBaseline[index][side][body].speed : reference.speed;
        const speedDelta=Math.abs(value.speed-speedReference);
        assert.ok(speedDelta<1e-8,`${fixture.id}/${side}/${body}: speed delta ${speedDelta}`);
        if (platformBaseline) assert.equal(value.speed,speedReference,`${fixture.id}/${side}/${body}: exact same-platform production speed`);
      }
      const epoch = side === 'personality' ? result.personality : result.sharpAtOracleDesign;
      assert.ok(Math.abs(epoch.sun.longitude - fixture.oracle[side].sun.longitude) * 3600000 < .001);
    }
    for (const field of ['type', 'authority', 'profile', 'definition', 'incarnationCross', 'channels', 'centers']) assert.deepEqual(result.chart[field], fixture.sharp.oracleChart[field], `${fixture.id} ${field}`);
    const naive = Date.parse(fixture.oracle.birthUtc) / 86400000 + 2440587.5;
    dut1.push((result.ut1 - naive) * 86400);
  }
  assert.ok(dut1.some(value => value > 0) && dut1.some(value => value < 0), 'positive and negative DUT1');
  assert.equal(actual.find(row => row.id === 'G2025-tight').personality.sun.line, 5, 'proper UTC crossing is retained');
});
