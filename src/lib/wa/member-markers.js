import { esc } from '../format.js';

/** Use the complete saved reference pool, never a filtered scope or group order.
 * Retained pool references keep their number when assignments or Alpha change.
 * Presentation only: nothing is added to the saved snapshot. */
export function createWaMemberMarkers(refs = []) {
  return new Map(refs.map(({ memberId }, index) => [memberId, {
    memberId, number: index + 1, colorSlot: (index % 5) + 1
  }]));
}

/** Non-interactive HTML badge; callers can place it inside existing controls.
 * name is plain text, escaped here for both title and accessible label. */
export function renderWaMemberMarker(record, { name = record?.memberId } = {}) {
  if (!record) return '';
  const label = esc(`${name ?? record.memberId} · ${record.number}`);
  return `<span class="wa-member-marker wa-member-color-${record.colorSlot}" data-wa-marker-member="${esc(record.memberId)}" data-marker-number="${record.number}" title="${label}" aria-label="${label}">${record.number}</span>`;
}

/** List only supplied real member IDs, once each, in organization number order. */
export function renderWaMemberLegend(memberIds, markers, nameOf = id => id) {
  const records = [...new Set(memberIds ?? [])].map(id => markers?.get(id))
    .filter(Boolean).sort((a, b) => a.number - b.number);
  if (!records.length) return '';
  return `<ul class="wa-member-legend">${records.map(record => {
    const name = nameOf(record.memberId) ?? record.memberId;
    return `<li>${renderWaMemberMarker(record, { name })}<span class="wa-member-legend-name">${esc(name)}</span></li>`;
  }).join('')}</ul>`;
}
