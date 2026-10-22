/**
 * Variable: the four arrows as a compass around one centre mark.
 *
 * Every field comes from the existing contract — `variableArrows()` for the
 * direction symbol and the slot position, `variableDirection()` for the
 * direction, `VARIABLE_POSITIONS` for the keys. No second mapping table.
 *
 * A slot with no direction is drawn as a dashed empty box rather than hidden:
 * "this arrow is not computable" is information, and a missing corner would
 * read as "this position does not exist".
 */
import { esc } from '../format.js';
import { VARIABLE_POSITIONS, variableArrows, variableDirection } from '../variable-arrows.js';

/**
 * @param {{ variable: object,
 *           slotName: (slot: object) => string,
 *           caption: (key: string) => string,
 *           directionLabel: (direction: 'left'|'right'|null) => string }} options
 */
export function variableQuad({ variable, slotName, caption, shortLabel, directionLabel }) {
  const arrows = new Map(variableArrows(variable).map(arrow => [arrow.key, arrow]));
  const corners = VARIABLE_POSITIONS.map(slot => {
    const arrow = arrows.get(slot.key);
    const direction = variableDirection(variable?.[slot.key]);
    const value = variable?.[slot.key];
    const name = value ? slotName(value) : '';
    const place = slot.position;
    if (!direction) {
      return `
        <div class="pg-var-corner pg-var-corner--empty" data-position="${place}" data-direction="none" title="${esc(caption(slot.key))}">
          <span class="pg-var-shape" aria-hidden="true"></span>
          <span class="pg-var-tag">${esc(shortLabel(slot.key))}</span>
          <span class="pg-var-name">${esc(caption(slot.key))}</span>
        </div>`;
    }
    return `
      <button type="button" class="pg-var-corner" data-position="${place}" data-direction="${direction}"
        data-variable="${slot.key}" data-knowledge-variable="${slot.key}"
        title="${esc(`${caption(slot.key)} · ${directionLabel(direction)} · ${name}`)}">
        <span class="pg-var-arrow" aria-hidden="true">${esc(arrow?.symbol || (direction === 'left' ? '←' : '→'))}</span>
        <span class="pg-var-tag">${esc(shortLabel(slot.key))}</span>
        <span class="pg-var-name">${esc(name)}</span>
        <span class="pg-var-meta">${esc(directionLabel(direction))}</span>
      </button>`;
  }).join('');
  return `
    <div class="pg-var-quad">
      ${corners}
      <div class="pg-var-centre" aria-hidden="true"><span></span></div>
    </div>`;
}
