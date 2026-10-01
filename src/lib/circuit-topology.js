/** Display taxonomy for the 36 channels. The engine's calculation data stays untouched. */
import { CHANNELS } from './human-design/catalog.js';

export const CIRCUIT_GROUPS = Object.freeze({
  individual: ['knowing', 'centering', 'integration'],
  collective: ['logic', 'sensing'],
  tribal: ['ego', 'defense']
});

const correction = Object.freeze({
  '10-34': 'centering',
  '20-57': 'knowing'
});
const sourceById = new Map(CHANNELS.map(channel => [channel.gates.join('-'), channel]));

export function channelCircuit(channel) {
  const id = channel.gates.join('-');
  const circuit = correction[id] || sourceById.get(id)?.subcircuit;
  const group = Object.entries(CIRCUIT_GROUPS).find(([, members]) => members.includes(circuit))?.[0];
  if (!group) throw new Error(`Unknown channel circuit: ${id}`);
  return { group, circuit };
}
