// Native-ephemeris verification of the DreamRave (sleep chart) calculation.
// Uses the same SharpAstrology core the browser WASM uses, so this checks the
// real Moon arc solve, not a synthetic sky. Run with DOTNET on PATH:
//   DOTNET=~/.dotnet/dotnet node dev/verify-dream-native.mjs
import { calculateNativeBirth, calculateNativeTransit } from '../scripts/lib/sharp-native-client.mjs';
import { solveLunarArcInstant, computeDreamChart, dreamTypeOf } from '../src/lib/dream-chart.js';
import { DREAM_GATES } from '../src/lib/human-design/dream-topology.js';

const snapshotAt = async instant => (await calculateNativeTransit(instant)).gates;
const wrap360 = v => ((v % 360) + 360) % 360;
const DAY = 86_400_000;

const CASES = [
  ['1990-05-20', 6.5, 0],
  ['1975-01-03', 23.25, -5],
  ['1988-11-11', 0.5, 8],
  ['2001-07-30', 14.75, 2],
  ['1963-02-14', 18.0, -8]
];

let failures = 0;
const check = (label, ok, detail) => {
  if (!ok) { failures++; console.log(`  ✗ ${label} — ${detail}`); }
  else console.log(`  ✓ ${label}${detail ? ` — ${detail}` : ''}`);
};

for (const [date, hour, timezone] of CASES) {
  const chart = await calculateNativeBirth(date, hour, timezone);
  const birthUtc = Date.parse(chart.raw.birthUtc);
  const natalMoon = chart.positions.personality.moon.longitude;
  console.log(`\n=== ${date} ${hour}h UTC${timezone >= 0 ? '+' : ''}${timezone} · waking ${chart.type.name} · natal Moon ${natalMoon.toFixed(4)}°`);

  const solved = await solveLunarArcInstant({ birthUtc, natalMoonLongitude: natalMoon, snapshotAt });
  const solvedMoon = wrap360(solved.snapshot.moon.longitude);
  const target = wrap360(natalMoon - 88);
  const daysBefore = (birthUtc - solved.instant) / DAY;
  check('arc solve converged', Math.abs(solved.residualDegrees) < 1e-6, `residual ${solved.residualDegrees.toExponential(2)}°, ${solved.steps} steps`);
  check('Moon sits exactly 88° behind birth', Math.abs(((solvedMoon - target + 540) % 360) - 180) < 1e-6, `${solvedMoon.toFixed(6)}° vs target ${target.toFixed(6)}°`);
  check('design moment is ~6.7 days before birth', daysBefore > 5.5 && daysBefore < 8, `${daysBefore.toFixed(4)} days`);
  check('engine round-trips match', solvedMoon === wrap360((await snapshotAt(solved.instant)).moon.longitude));

  const dream = await computeDreamChart(chart, { snapshotAt });
  const inRange = dream.gates.all.every(g => DREAM_GATES.includes(g));
  check('only the 15 dream gates survive', inRange, `active: ${dream.gates.all.join(',') || 'none'}`);
  check('channels are dream channels only', dream.channels.every(c => c.gates.every(g => DREAM_GATES.includes(g))),
    dream.channels.map(c => c.gates.join('-')).join(',') || 'none');
  // The type is judged by the dream channels that complete, not by the centres
  // they light up (`dreamTypeOf` takes the channel list).
  check('type matches definition', dream.type.id === dreamTypeOf(dream.channels),
    `${dream.type.name} (waking: ${dream.wakingType.name}) via ${dream.channels.map(c => c.gates.join('-')).join(',') || 'no channel'}`);
  // The old "no Manifestor is possible" guard is void: the teacher's material
  // defines five sleep types, Manifestor and Manifesting Generator included, and
  // the Root reaches the Throat through the Spleen (28-38 + 20-57).
  check('type is one of the five the material defines',
    ['reflector', 'generator', 'projector', 'manifestor', 'manifestingGenerator'].includes(dream.type.id),
    dream.type.id);
  check('three night fields present', dream.realms.length === 3 && dream.realms.every(r => r.gates.length === 5),
    dream.realms.map(r => `${r.id}:${r.rows.length} rows`).join(' '));
  check('night sky overlaid', dream.hasTransit && dream.transit.gates.size >= 0,
    `${dream.transit.gates.size} transit gates inside the dream topology`);
  const designDays = (birthUtc - dream.designMoment.utc) / DAY;
  check('model agrees with the solver', Math.abs(designDays - daysBefore) < 1e-9, `${designDays.toFixed(4)} days`);

  console.log(`  design ${dream.designMoment.iso}  ·  defined ${dream.centers.definedNames.join(',') || '—'}  ·  sleep type ${dream.type.name}`);
}

console.log(`\n${failures === 0 ? 'ALL CHECKS PASSED' : `${failures} CHECK(S) FAILED`}`);
process.exit(failures === 0 ? 0 : 1);
