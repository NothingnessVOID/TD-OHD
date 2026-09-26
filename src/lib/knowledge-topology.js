import { CHANNELS } from 'natalengine';

/** Every incomplete channel endpoint, including multi-partner Integration gates. */
export function hangingGatePartners(activeGates) {
  const active = new Set(activeGates);
  const partners = new Map();
  for (const channel of CHANNELS) {
    const [a, b] = channel.gates;
    if (active.has(a) === active.has(b)) continue;
    const gate = active.has(a) ? a : b;
    const partner = gate === a ? b : a;
    if (!partners.has(gate)) partners.set(gate, []);
    partners.get(gate).push(partner);
  }
  return [...partners].map(([gate, missing]) => ({
    gate, partners: missing.sort((a, b) => a - b)
  })).sort((a, b) => a.gate - b.gate);
}
