/** Stable ephemeris adapter for public annual data and instant calculations. */
import { calculateTransitGates } from 'natalengine';
import { engineTransitArguments } from '../../lib/transit-time.js';

export function snapshot(instant) {
  return calculateTransitGates(...engineTransitArguments(instant)).gates;
}
