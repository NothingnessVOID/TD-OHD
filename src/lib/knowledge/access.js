/** Stable chart-to-knowledge mapping. This module never reads Summary or Detail. */
import { TYPES } from '../human-design/catalog.js';
export function chartKnowledgeQuery(chart, objectType, variableKind = null) {
  if (!chart) return null;
  const domain = 'human-design';
  if (objectType === 'variable') {
    const slot = chart.variable?.[variableKind];
    return slot?.valueId ? { domain, objectType, objectId: `${variableKind}:${slot.valueId}` } : null;
  }
  if (objectType === 'cross') {
    const cross = chart.incarnationCross;
    return cross?.rawId ? { domain, objectType, objectId: cross.rawId, cross } : null;
  }
  if (!['type', 'authority', 'profile', 'definition'].includes(objectType)) return null;
  const objectId = chart.calculation?.[objectType]?.id ?? chart[objectType]?.id ??
    (objectType === 'profile' ? chart.profile?.numbers : objectType === 'type'
      ? Object.keys(TYPES).find(id => TYPES[id].name === chart.type?.name) : null);
  return objectId ? { domain, objectType, objectId } : null;
}
