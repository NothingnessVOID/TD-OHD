/** Development audit against frozen independent Swiss Ephemeris longitudes. */
import { readFileSync } from 'node:fs';
import { nativeClient } from './lib/sharp-native-client.mjs';

const fixture = JSON.parse(readFileSync(new URL('../tests/fixtures/true-node-swiss-reference.json', import.meta.url)));
const angleDifference = (a, b) => Math.abs(((a - b + 540) % 360) - 180);
const snapshots = await nativeClient().batch(fixture.samples.map(sample => sample.instant));
console.log(JSON.stringify({ reference: fixture.reference,
  engine: 'SharpAstrology.HumanDesign 1.2.0 + SharpAstrology.SwissEph 0.5.1 / file-based Swiss',
  comparisons: fixture.samples.map((sample, index) => {
    const activation = snapshots[index].activations.northNode;
    return {
      instant: sample.instant, purpose: sample.purpose,
      differenceDegrees: angleDifference(activation.longitude, sample.trueLongitude),
      engine: { ...activation, arrow: activation.tone <= 3 ? 'left' : 'right' },
      swissTrueLongitude: sample.trueLongitude,
      swissMeanLongitude: sample.meanLongitude,
    };
  })
}, null, 2));
