/**
 * Tube: a channel as a rounded capsule with two end caps and a mid diamond.
 *
 * What it encodes, and nothing else:
 *   left cap filled  = gates[0] is activated
 *   right cap filled = gates[1] is activated
 *   mid diamond      = both ends active, i.e. the channel itself is complete
 * A hanging gate deliberately does NOT get a tube: one tube can only point at
 * one partner, and a gate can hang toward three. It gets a hollow ring instead
 * (see .pg-hollow-ring), so the graphic never claims a single partner.
 *
 * The capsule colour is the circuit group's soft token, the caps and diamond use
 * the solid one, so the row still says which circuit it belongs to without a
 * label. The text next to the tube always carries the same facts.
 */
import { esc } from '../format.js';

const CIRCUIT_ATTR = { individual: 'individual', collective: 'collective', tribal: 'tribal' };

/**
 * @param {{ circuit?: string, left: boolean, right: boolean,
 *           empty?: boolean, label?: string }} options
 */
export function tube({ circuit = 'individual', left = false, right = false, empty = false, label = '' }) {
  const group = CIRCUIT_ATTR[circuit] || 'individual';
  const full = left && right && !empty;
  const attributes = [
    `data-circuit="${group}"`,
    `data-left="${left && !empty ? 'on' : 'off'}"`,
    `data-right="${right && !empty ? 'on' : 'off'}"`,
    `data-full="${full ? 'true' : 'false'}"`,
    empty ? 'data-empty="true"' : '',
    'aria-hidden="true"'
  ].filter(Boolean).join(' ');
  return `<span class="pg-tube" ${attributes} title="${esc(label)}">` +
    '<span class="pg-tube-track"></span>' +
    '<span class="pg-tube-end" data-side="left"></span>' +
    '<span class="pg-tube-mid"></span>' +
    '<span class="pg-tube-end" data-side="right"></span>' +
    '</span>';
}

/** A complete-or-partial channel, read from the chart's activated gate set. */
export function channelTube(channel, activeSet, circuit, label = '') {
  const [first, second] = channel.gates;
  return tube({ circuit, left: activeSet.has(first), right: activeSet.has(second), label });
}

/**
 * A hanging gate's open end. No tube and no partner direction: the gate may be
 * waiting on more than one partner, and the partner numbers are printed next to
 * this ring as plain text.
 */
export function hollowRing(circuit = 'individual', label = '') {
  return `<span class="pg-hollow-ring" data-circuit="${circuit}" aria-hidden="true" title="${esc(label)}"></span>`;
}

/** Empty state: a tube with no fill and both ends hollow. */
export function emptyTube(circuit = 'individual', label = '') {
  return tube({ circuit, empty: true, label });
}
