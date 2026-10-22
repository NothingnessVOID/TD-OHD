/**
 * Centre key → 24px Shape. The silhouette comes from CENTER_SHAPES, which the
 * bodygraph, the SVG renderer and the detail renderer already draw, so the
 * right column shows the same nine shapes the graph does.
 *
 * Three states, encoded twice (fill + stroke style) because a fill difference
 * alone washes out in dark and high-contrast skins:
 *   defined   solid centre colour, solid 1.5px stroke
 *   undefined centre colour at 18%, dashed stroke
 *   open      no fill, dotted stroke at .55
 */
import { CENTER_SHAPES } from '../human-design/bodygraph-geometry.js';
import { silhouette } from './primitives.js';

/** The bodygraph's own name for each centre's silhouette. */
export const CENTER_SHAPE_KEYS = Object.freeze({
  head: 'Head', ajna: 'Ajna', throat: 'Throat', g: 'G',
  heart: 'Ego', spleen: 'Spleen', solar: 'SolarPlexus', sacral: 'Sacral', root: 'Root'
});

/** Circled group numbers for the definition components (1-based). */
export const GROUP_BADGES = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨'];

/**
 * @param {string} centerKey one of CENTER_KEYS
 * @param {{ state: 'defined'|'undefined'|'open', group?: number, size?: number }} options
 */
export function centerGlyph(centerKey, { state = 'open', group = 0, size = 24 } = {}) {
  const shapeKey = CENTER_SHAPE_KEYS[centerKey];
  const shape = shapeKey && CENTER_SHAPES[shapeKey];
  if (!shape) return '';
  const glyph = silhouette(shape.path, { size });
  const badge = group > 0 && GROUP_BADGES[group - 1]
    ? `<span class="pg-group-badge" aria-hidden="true">${GROUP_BADGES[group - 1]}</span>`
    : '';
  return `<span class="pg-center-glyph" data-center-glyph="${centerKey}" data-state="${state}" aria-hidden="true">${glyph}${badge}</span>`;
}

/** Group index (1-based) for every defined centre, from the definition components. */
export function componentIndexByCenter(components = []) {
  const index = new Map();
  components.forEach((component, position) => {
    for (const center of component) if (!index.has(center)) index.set(center, position + 1);
  });
  return index;
}
