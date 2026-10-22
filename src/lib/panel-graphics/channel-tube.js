/**
 * Tube: a channel as a rounded capsule with two end caps and a mid diamond.
 *
 * What it encodes, and nothing else:
 *   left cap filled  = gates[0] is activated
 *   right cap filled = gates[1] is activated
 *   mid diamond      = both ends active, i.e. the channel itself is complete
 *   hollow cap + short dashed stub = a hanging gate, the open end reaching
 *     toward a partner that is not in this chart
 *
 * The capsule colour is the circuit group's soft token, the caps and diamond use
 * the solid one, so the row still says which circuit it belongs to without a
 * label. The text next to the tube always carries the same facts.
 */
import { esc } from '../format.js';

const CIRCUIT_ATTR = { individual: 'individual', collective: 'collective', tribal: 'tribal' };

/**
 * @param {{ circuit?: string, left: boolean, right: boolean,
 *           hanging?: 'left'|'right'|null, empty?: boolean, label?: string }} options
 */
export function tube({ circuit = 'individual', left = false, right = false, hanging = null, empty = false, label = '' }) {
  const group = CIRCUIT_ATTR[circuit] || 'individual';
  const full = left && right && !empty;
  const attributes = [
    `data-circuit="${group}"`,
    `data-left="${left && !empty ? 'on' : 'off'}"`,
    `data-right="${right && !empty ? 'on' : 'off'}"`,
    `data-full="${full ? 'true' : 'false'}"`,
    hanging ? `data-hanging="${hanging}"` : '',
    empty ? 'data-empty="true"' : '',
    'aria-hidden="true"'
  ].filter(Boolean).join(' ');
  const stub = hanging
    ? `<span class="pg-tube-stub" data-side="${hanging}"></span>`
    : '';
  return `<span class="pg-tube" ${attributes} title="${esc(label)}">` +
    '<span class="pg-tube-track"></span>' +
    '<span class="pg-tube-end" data-side="left"></span>' +
    '<span class="pg-tube-mid"></span>' +
    '<span class="pg-tube-end" data-side="right"></span>' +
    stub +
    '</span>';
}

/** A complete-or-partial channel, read from the chart's activated gate set. */
export function channelTube(channel, activeSet, circuit, label = '') {
  const [first, second] = channel.gates;
  return tube({ circuit, left: activeSet.has(first), right: activeSet.has(second), label });
}

/** A hanging gate: its own end is lit, the partner end is an open ring. */
export function hangingTube(gate, partner, activeSet, circuit, label = '') {
  const first = channelSide(gate, partner);
  return tube({
    circuit,
    left: first === 0 ? activeSet.has(gate) : activeSet.has(partner),
    right: first === 0 ? activeSet.has(partner) : activeSet.has(gate),
    hanging: first === 0 ? 'right' : 'left',
    label
  });
}

/** Which end of the pair sits on the left; the smaller gate does. */
const channelSide = (a, b) => (a <= b ? 0 : 1);

/** Empty state: a tube with no fill and both ends hollow. */
export function emptyTube(circuit = 'individual', label = '') {
  return tube({ circuit, empty: true, label });
}
