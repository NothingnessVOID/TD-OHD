import { getKnowledgeSummary } from './registry.js';
import { TYPES } from '../human-design/catalog.js';
import { contentText } from '../content.js';
import { typeDescription } from '../vocabulary.js';

/** Home facade only accepts a summary reader; it cannot obtain a Detail slot. */
export function createFoundationSummary(readSummary = getKnowledgeSummary) {
  return (chart, objectType, surface = 'foundation') => {
    const objectId = chart.calculation?.[objectType]?.id ?? chart[objectType]?.id ??
      (objectType === 'profile' ? chart.profile?.numbers : objectType === 'type'
        ? Object.keys(TYPES).find(id => TYPES[id].name === chart.type?.name) : null);
    const slot = objectId ? readSummary({ domain: 'human-design', objectType, objectId, surface }) : null;
    if (slot) return slot.content;
    // Explicit legacy short-copy compatibility, never a Detail fallback.
    if (objectType === 'type') return surface === 'hero' ? typeDescription(chart.type?.name) : contentText(chart.type?.description);
    if (objectType === 'authority') return contentText(chart.authority?.description);
    if (objectType === 'profile') return contentText(chart.profile?.theme);
    return '';
  };
}
export const foundationSummary = createFoundationSummary();
