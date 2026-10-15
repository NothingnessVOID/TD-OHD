import { t } from '../lib/i18n.js';
import { esc } from '../lib/format.js';
import { renderPentaStateSymbol } from '../lib/penta-state-symbol.js';

export const WA_PILLAR_LABELS = Object.freeze({60:'structure',50:'safety',6:'interaction',45:'hierarchy'});
export const waStateText = state => t(`Wa UI state ${state || 'unknown'}`);
/** Detail sheets still use the shared state symbol; the left diagram does not. */
export function waStateSymbol(state, size = 22) {
  if (state === 'hanging') return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><circle cx="4" cy="12" r="2.5" fill="currentColor"/><path d="M7 12h5M16 12h1"/><circle cx="20" cy="12" r="2.5"/></svg>`;
  return renderPentaStateSymbol(state, {size});
}

/** Near-original single-line board: gate nodes + half-line coverage. No midpoint glyphs.
 * Contributor markers are coloured dots (never names / never numbered badges). */
export const WA_DIAGRAM_GEOMETRY = Object.freeze({
  VIEW_WIDTH: 380, ROW_HEIGHT: 98, LEFT_GATE: 186, RIGHT_GATE: 318,
  NODE_R: 20, HIT_R: 30, DOT_R: 4, DOT_STEP: 9.5, MAX_DOTS: 5, PAD_BOTTOM: 6
});
const G = WA_DIAGRAM_GEOMETRY;
const fmt = n => Math.round(n * 10) / 10;

/** Contributor strip under a gate: overlapping member-colour dots only (never names). Hover title carries full names. */
function renderGateContributors(gate, records, gateX, gateY, nameOf, side) {
  if (!records.length) return '';
  const count = records.length;
  const names = records.map(record => `${nameOf(record.memberId) ?? record.memberId} · ${record.number}`).join(' · ');
  const label = esc(t('Wa UI gate member count', { count }));
  const cy = gateY + G.NODE_R + 11;
  const shown = records.slice(0, G.MAX_DOTS);
  const rest = count - shown.length;
  // side: 1 = left gate (grow outward left), -1 = right gate (grow outward right).
  const dir = -side;
  const start = gateX - side * (G.NODE_R - G.DOT_R);
  const dots = shown.map((record, index) =>
    `<circle class="wa-gate-dot wa-member-color-${record.colorSlot}" data-wa-marker-member="${esc(record.memberId)}" cx="${fmt(start + dir * index * G.DOT_STEP)}" cy="${fmt(cy)}" r="${G.DOT_R}"/>`
  ).join('');
  const lastX = start + dir * (shown.length - 1) * G.DOT_STEP;
  const more = rest > 0
    ? `<text class="wa-gate-more" x="${fmt(lastX + dir * (G.DOT_R + 3))}" y="${fmt(cy + 3.5)}" text-anchor="${dir > 0 ? 'start' : 'end'}">+${rest}</text>`
    : '';
  return `<g class="wa-gate-count" data-wa-gate-count="${gate}" data-count="${count}" aria-hidden="true">${dots}${more}<title>${label}${names ? ` — ${esc(names)}` : ''}</title></g>`;
}

/** Pure presentation: six separate real pairs, no implied links between departments.
 * markers comes from the complete organization reference pool; gateRecords comes
 * exclusively from the current computed scope. No per-scope renumbering.
 * showNames is accepted for call-site compatibility but ignored — left diagram is always dots. */
export function renderWaDiagram(departments, result, selected = null, { markers, nameOf = id => id } = {}) {
  const known = ['ready', 'empty'].includes(result?.status);
  const gateRecords = new Map((known ? result.gateRecords ?? [] : []).map(row => [row.gate, row]));
  const active = gate => Boolean(gateRecords.get(gate)?.memberIds?.length);
  let top = 0;
  const rows = departments.map(department => {
    const pair = department.pairs.find(pair => pair.role === 'core');
    const measured = result?.pairs?.find(row => row.channelId === pair.channelId);
    const state = known ? measured?.status || 'absent' : 'unknown';
    const display = pair.displayGates || pair.gates;
    const endpointMarkers = display.map(gate => [...new Set(gateRecords.get(gate)?.memberIds ?? [])]
      .map(id => markers?.get(id)).filter(Boolean).sort((a, b) => a.number - b.number));
    const y = top + G.ROW_HEIGHT / 2;
    top += G.ROW_HEIGHT;
    const isSelected = selected?.type === 'pair' && selected.id === pair.channelId || selected?.type === 'department' && selected.id === department.id;
    const count = known ? measured?.contributorCount ?? 0 : '—';
    const label = `${t(`OC16 ${department.id}`)} · ${display.join('–')} · ${waStateText(state)} · ${t('Wa UI participants count', { count })}`;
    const mid = (G.LEFT_GATE + G.RIGHT_GATE) / 2;
    const endpoints = display.map((gate, sideIndex) => {
      const side = sideIndex ? -1 : 1; // Outer contributors sit opposite the channel interior.
      const x = sideIndex ? G.RIGHT_GATE : G.LEFT_GATE;
      const covered = active(gate), pillar = WA_PILLAR_LABELS[gate];
      const focused = selected?.type === 'gate' && selected.id === gate;
      const activationLabel = known ? t(covered ? 'Wa UI gate active' : 'Wa UI gate inactive') : waStateText('unknown');
      const records = endpointMarkers[sideIndex];
      const membersAttr = records.length
        ? ` data-wa-members="${esc(records.map(record => record.memberId).join(' '))}"`
        : '';
      return `<g class="wa-diagram-gate ${covered?'is-covered':''} ${pillar?'is-pillar':''} ${focused?'is-selected':''}" data-wa-gate="${gate}" data-covered="${known?covered:'unknown'}"${membersAttr} role="button" tabindex="0" aria-pressed="${focused}" aria-label="${esc(`${gate} · ${pillar?t(`OC16 ${pillar}`)+' · ':''}${activationLabel}${records.length?` · ${t('Wa UI gate member count',{count:records.length})}`:''}`)}"><circle class="wa-node-hit" cx="${x}" cy="${y}" r="${G.HIT_R}"/>${pillar?`<circle class="wa-pillar-ring" cx="${x}" cy="${y}" r="${G.NODE_R + 5}"/>`:''}<circle class="wa-node-face" cx="${x}" cy="${y}" r="${G.NODE_R}"/><text class="wa-node-number" x="${x}" y="${y + 6}" text-anchor="middle">${gate}</text>${pillar?`<text class="wa-node-pillar" x="${x}" y="${y - G.NODE_R - 11}" text-anchor="middle">${esc(t(`OC16 ${pillar}`))}</text>`:''}${renderGateContributors(gate, records, x, y, nameOf, side)}</g>`;
    }).join('');
    // Department name sits outside the channel hit target so clicking「管理」does not open the pair sheet.
    // Line only: base + two halves. No midpoint diamond/X — state is readable from half coverage + data-state.
    return `<g class="wa-diagram-row ${isSelected?'is-selected':''}" data-department="${department.id}"><text class="wa-diagram-name" x="12" y="${y - 4}">${esc(t(`OC16 ${department.id}`))}</text><text class="wa-diagram-sub" x="12" y="${y + 13}">${esc(t('Wa UI participants count', { count }))}</text><g class="wa-diagram-channel" data-wa-pair="${pair.channelId}" data-state="${state}" role="button" tabindex="0" aria-pressed="${isSelected}" aria-label="${esc(label)}"><rect class="wa-link-hit" x="${G.LEFT_GATE - 30}" y="${y - 31}" width="${G.RIGHT_GATE - G.LEFT_GATE + 60}" height="62" rx="16"/><path class="wa-link-base" d="M${G.LEFT_GATE} ${y}H${G.RIGHT_GATE}"/><path class="wa-link-half ${active(display[0])?'is-covered':''}" d="M${G.LEFT_GATE} ${y}H${mid}"/><path class="wa-link-half ${active(display[1])?'is-covered':''}" d="M${mid} ${y}H${G.RIGHT_GATE}"/></g>${endpoints}</g>`;
  }).join('');
  return `<svg class="wa-core-svg" viewBox="0 0 ${G.VIEW_WIDTH} ${top + G.PAD_BOTTOM}" role="group" aria-label="${esc(t('OC16 graph title'))}"><title>${esc(t('OC16 graph title'))}</title>${rows}</svg>`;
}
