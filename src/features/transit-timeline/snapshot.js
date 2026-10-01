/** Browser WASM snapshots. Instant and annual generation share the same engine boundary. */
import { sharpProvider } from '../../lib/chart-engine/sharp-provider.js';

export async function snapshot(instant) {
  return sharpProvider.calculateTransitSnapshot(instant);
}

export async function snapshotBatch(instants) {
  return sharpProvider.calculateTransitSnapshots(instants);
}
