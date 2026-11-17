/** One personal fact model for the quarter of a chart.
 * The only input is the selected person's own Personality Sun activation; design, other
 * planets, channels, transits and organization composites are never consulted, and no
 * calculation is started here. A missing or invalid Sun gate yields an explicit
 * insufficient status instead of a default quarter.
 */
import { quarterIdForGate } from './quarter.js';

const validGate = value => Number.isInteger(value) && value >= 1 && value <= 64;
const validLine = value => Number.isInteger(value) && value >= 1 && value <= 6;

export function personalQuarterFacts({ chart = null, timeUnknown = false, birthTimeConfidence = null } = {}) {
  const sun = chart?.gates?.personality?.sun;
  const gate = sun?.gate;
  const estimated = timeUnknown === true || birthTimeConfidence === 'estimated';
  if (!validGate(gate)) return { status: 'insufficient', id: null, gate: null, line: null, estimated };
  const id = quarterIdForGate(gate);
  if (!id) return { status: 'insufficient', id: null, gate: null, line: null, estimated };
  return { status: 'ready', id, gate, line: validLine(sun?.line) ? sun.line : null, estimated };
}
