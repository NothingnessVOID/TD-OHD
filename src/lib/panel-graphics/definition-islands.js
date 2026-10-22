/**
 * Definition islands: one cluster of dots per connected component, gaps between
 * clusters, island count printed by the caller as text. No topology and no
 * connecting lines — position and adjacency are the bodygraph's job; this only
 * answers "how many islands, and how big is each".
 *
 * The graphic is aria-hidden: the count and the centre list live in the text
 * next to it, so the shape never carries meaning alone.
 */
import { dotCluster } from './primitives.js';
import { centerName } from '../vocabulary.js';

/** @param {string[][]} components `chart.definitionComponents` */
export function definitionIslands(components = []) {
  const islands = components.filter(component => component.length);
  if (!islands.length) {
    return '<span class="pg-islands pg-islands--empty" aria-hidden="true"><span class="pg-island--empty"></span></span>';
  }
  const body = islands.map(component => dotCluster(component.length, {
    className: 'pg-island',
    label: component.map(centerName).join('、')
  })).join('<span class="pg-island-gap" aria-hidden="true"></span>');
  return `<span class="pg-islands" aria-hidden="true">${body}</span>`;
}
