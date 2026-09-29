/** Development audit against frozen Swiss Ephemeris data. No production dependency. */
import { readFileSync } from 'node:fs';
import { calculateBirthPositions } from 'natalengine';
import { longitudeToGate, longitudeToLine, longitudeToColor,
  longitudeToTone, longitudeToBase } from 'natalengine/humandesign';

const fixture = JSON.parse(readFileSync(new URL('../tests/fixtures/true-node-swiss-reference.json', import.meta.url)));
const subdivision = longitude => ({
  gate: longitudeToGate(longitude), line: longitudeToLine(longitude),
  color: longitudeToColor(longitude), tone: longitudeToTone(longitude),
  base: longitudeToBase(longitude),
  arrow: longitudeToTone(longitude) <= 3 ? 'left' : 'right',
});
const angleDifference = (a, b) => Math.abs(((a - b + 540) % 360) - 180);

console.log(JSON.stringify({ reference: fixture.reference,
  comparisons: fixture.samples.map(sample => {
    const date = new Date(sample.instant);
    const engine = calculateBirthPositions(date.getUTCFullYear(), date.getUTCMonth() + 1,
      date.getUTCDate(), date.getUTCHours() + date.getUTCMinutes() / 60, 0,
      null, null, { preserveSeconds: true }).northNode.longitude;
    return {
      instant: sample.instant, purpose: sample.purpose,
      differenceDegrees: angleDifference(engine, sample.trueLongitude),
      engine: { longitude: engine, ...subdivision(engine) },
      swissTrue: { longitude: sample.trueLongitude, ...subdivision(sample.trueLongitude) },
      swissMeanLongitude: sample.meanLongitude,
    };
  })
}, null, 2));
