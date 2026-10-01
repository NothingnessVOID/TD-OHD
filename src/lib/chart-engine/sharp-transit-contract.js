import { GATES } from '../human-design/catalog.js';

/** Convert official Sharp activations to the existing transit presentation contract. */
export function adaptSharpTransit(raw) {
  const gates = Object.fromEntries(Object.entries(raw.activations).map(([point, value]) => {
    for (const [field, minimum, maximum] of [['gate', 1, 64], ['line', 1, 6], ['color', 1, 6], ['tone', 1, 6], ['base', 1, 5]]) {
      if (!Number.isInteger(value[field]) || value[field] < minimum || value[field] > maximum) throw new Error(`Invalid Sharp transit ${point}.${field}`);
    }
    if (!Number.isFinite(value.longitude) || value.longitude < 0 || value.longitude >= 360) throw new Error(`Invalid Sharp transit ${point}.longitude`);
    return [point, { ...value, gateName: GATES[value.gate].name, center: GATES[value.gate].center }];
  }));
  if (Object.keys(gates).length !== 13) throw new Error('Sharp transit requires all 13 points');
  const activeGates = [...new Set(Object.values(gates).map(value => value.gate))];
  return { date: raw.utc.slice(0, 10), gates, activeGates, activeGateCount: activeGates.length };
}
