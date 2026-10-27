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
import { GROUP_BADGES, centerGlyph } from './center-glyph.js';
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

/**
 * Island cards: one bordered cluster per definition island, holding that
 * island's real centre shapes, a rule under it and the island's circled number
 * centred below. The number sits under the cluster, never on the shapes — at
 * this size a badge on every centre blurs the glyph it is supposed to label.
 * The cluster's centre names stay available as its tooltip.
 *
 * Like `definitionIslands`, it is aria-hidden: the island and centre counts are
 * already spelled out in the card's note beside it.
 *
 * @param {string[][]} components `chart.definitionComponents`
 */
export function definitionIslandCards(components = []) {
  const islands = components.filter(component => component.length);
  if (!islands.length) {
    return '<span class="pg-island-set pg-island-set--empty" aria-hidden="true"><span class="pg-island--empty"></span></span>';
  }
  // The graphic lives in a fixed 46px slot beside the authority icon, and four
  // islands of several centres each have to fit the narrowest sheet column too,
  // so the shapes step down instead of overflowing the card.
  const total = islands.reduce((sum, island) => sum + island.length, 0);
  const size = total <= 5 ? 17 : total <= 7 ? 15 : 13;
  const body = islands.map((island, index) => `
    <span class="pg-island-card" data-island="${index + 1}" title="${GROUP_BADGES[index] || ''} ${island.map(centerName).join('、')}">
      <span class="pg-island-cells">${island.map(center => centerGlyph(center, { state: 'defined', size })).join('')}</span>
      <span class="pg-island-rule" aria-hidden="true"></span>
      <span class="pg-island-index" aria-hidden="true">${GROUP_BADGES[index] || ''}</span>
    </span>`).join('');
  return `<span class="pg-island-set" aria-hidden="true">${body}</span>`;
}
