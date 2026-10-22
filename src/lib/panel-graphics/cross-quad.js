/**
 * Incarnation Cross: four palaces on a cross axis, and the Gene Keys ladder.
 *
 * Palaces: Personality Sun on top, Personality Earth below, Design Sun left,
 * Design Earth right. Each palace is a click target (gate detail) and keeps
 * data-gate for the graph highlight.
 *
 * The angle is encoded twice, on purpose. The outer frame's corner radius
 * follows the spec (0 = Juxtaposition, 8px = Right, 2px = Left), but a
 * measurement of the rendered cells showed 0px vs 2px differs by ~5 device
 * pixels in a 24px corner window — not a difference anyone can read. So the
 * angle's primary code is the abbreviation at the axis centre (JX / RA / LA),
 * with the radius kept as a secondary reinforcement. The full wording still
 * sits in the line under the quad, so nothing depends on either graphic.
 */
import { esc } from '../format.js';

/** The four palaces, in the order the chart's gates array uses. */
export const CROSS_SLOTS = Object.freeze([
  { index: 0, label: 'Personality Sun', side: 'personality', place: 'top' },
  { index: 1, label: 'Personality Earth', side: 'personality', place: 'bottom' },
  { index: 2, label: 'Design Sun', side: 'design', place: 'left' },
  { index: 3, label: 'Design Earth', side: 'design', place: 'right' }
]);

const ANGLE_SHORT = { juxtaposition: 'JX', right: 'RA', left: 'LA' };

/**
 * @param {{ gates: number[], angle?: string,
 *           nameFor: (gate: number) => string, labelFor: (label: string) => string,
 *           gateLabel: (gate: number) => string, angleLabel: string }} options
 */
export function crossQuad({ gates = [], angle = '', nameFor, labelFor, gateLabel, angleLabel }) {
  const short = ANGLE_SHORT[angle] || '';
  const cells = CROSS_SLOTS.map(slot => {
    const gate = gates[slot.index];
    if (!Number.isInteger(gate)) {
      return `<div class="pg-cross-palace pg-cross-palace--empty" data-place="${slot.place}" aria-hidden="true"></div>`;
    }
    return `
      <button type="button" class="pg-cross-palace" data-place="${slot.place}" data-side="${slot.side}" data-gate="${gate}">
        <span class="pg-cross-role">${esc(labelFor(slot.label))}</span>
        <span class="pg-cross-gate">${esc(gateLabel(gate))}</span>
        <span class="pg-cross-name" title="${esc(nameFor(gate))}">${esc(nameFor(gate))}</span>
      </button>`;
  }).join('');
  return `
    <div class="pg-cross-quad" data-angle="${esc(angle || '')}">
      ${cells}
      <div class="pg-cross-axis" aria-hidden="true">
        <span class="pg-cross-axis-line"></span>
        <span class="pg-cross-angle">${esc(short)}</span>
      </div>
    </div>
    <p class="pg-cross-angle-full">${esc(angleLabel)}</p>`;
}

/**
 * Gene Keys ladder: one vertical stack per activation-sequence sphere, three
 * equal bands (Shadow → Gift → Siddhi). Equal because Shadow, Gift and Siddhi
 * are three readings of one key, not three quantities — any width difference
 * would invent a ratio that the system does not have. The tier is carried by
 * three lightness steps of the same hue instead.
 *
 * @param {{ spheres: { id: string, key: string, label: string,
 *                      words: { shadow: string, gift: string, siddhi: string } }[],
 *           tierLabel: (tier: string) => string, keyLabel: (key: string) => string }} options
 */
export function geneKeysLadder({ spheres = [], tierLabel, keyLabel }) {
  return `<div class="pg-gk-grid">${spheres.map(sphere => `
    <div class="pg-gk-item">
      <div class="pg-gk-head">
        <span class="pg-gk-sphere">${esc(sphere.label)}</span>
        <span class="pg-gk-key">${esc(keyLabel(sphere.key))}</span>
      </div>
      <div class="pg-gk-ladder">
        ${['shadow', 'gift', 'siddhi'].map(tier => `
          <div class="pg-gk-band" data-tier="${tier}">
            <span class="pg-gk-band-rule" aria-hidden="true"></span>
            <span class="pg-gk-tier">${esc(tierLabel(tier))}</span>
            <span class="pg-gk-word" title="${esc(sphere.words[tier] || '')}">${esc(sphere.words[tier] || '—')}</span>
          </div>`).join('')}
      </div>
    </div>`).join('')}</div>`;
}
