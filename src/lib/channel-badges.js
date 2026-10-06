/** Shared two-level circuit presentation; classification remains in topology. */
import { channelCircuit } from './circuit-topology.js';
import { circuitName } from './vocabulary.js';
import { esc } from './format.js';

export function renderChannelCircuitBadges(channel) {
  const { group, circuit } = channelCircuit(channel);
  return `<span class="circuit-badge ${group}">${esc(circuitName(group))}</span>
    <span class="circuit-badge ${group}">${esc(circuitName(circuit))}</span>`;
}
