/**
 * Definition islands: one cluster of dots per connected component, gaps between
 * clusters, island count printed by the caller as text. No topology and no
 * connecting lines — position and adjacency are the bodygraph's job; this only
 * answers "how many islands, and how big is each".
 *
 * Each cluster carries the same circled number the centre rows use, so a reader
 * can map "island ①" to the centres badged ① without counting dots. Same source,
 * same order: `componentIndexByCenter` feeds both.
 *
 * The graphic is aria-hidden: the count and the centre list live in the text
 * next to it, so the shape never carries meaning alone.
 */
import { dotCluster } from './primitives.js';
import { GROUP_BADGES } from './center-glyph.js';
import { centerName } from '../vocabulary.js';

/** @param {string[][]} components `chart.definitionComponents` */
export function definitionIslands(components = []) {
  const islands = components.filter(component => component.length);
  if (!islands.length) {
    return '<span class="pg-islands pg-islands--empty" aria-hidden="true"><span class="pg-island--empty"></span></span>';
  }
  const body = islands.map((component, index) => `
    <span class="pg-island-unit">
      ${dotCluster(component.length, { className: 'pg-island', label: component.map(centerName).join('、') })}
      <span class="pg-island-badge">${GROUP_BADGES[index] || ''}</span>
    </span>`).join('<span class="pg-island-gap" aria-hidden="true"></span>');
  return `<span class="pg-islands" aria-hidden="true">${body}</span>`;
}
