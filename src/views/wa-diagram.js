import { t } from '../lib/i18n.js';
import { esc } from '../lib/format.js';
import { renderPentaStateSymbol } from '../lib/penta-state-symbol.js';

export const WA_PILLAR_LABELS = Object.freeze({60:'structure',50:'safety',6:'interaction',45:'hierarchy'});
export const waStateText = state => t(`Wa UI state ${state || 'unknown'}`);
export function waStateSymbol(state, size = 22) {
  if (state === 'hanging') return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><circle cx="4" cy="12" r="2.5" fill="currentColor"/><path d="M7 12h5M16 12h1"/><circle cx="20" cy="12" r="2.5"/></svg>`;
  return renderPentaStateSymbol(state, {size});
}

/** Near-original board size; member identity sits on gate count badges, not on the channel line. */
const VIEW_WIDTH = 360;
const ROW_HEIGHT = 86;
const LEFT_GATE = 176;
const RIGHT_GATE = 298;
const NODE_R = 18;
const HIT_R = 28;
const COUNT_R = 9;

/** Compact count at the outer-upper corner of a covered gate. pointer-events none so the gate hit stays. */
function renderGateCountBadge(gate, records, gateX, gateY, nameOf, side) {
  if (!records.length) return '';
  const count = records.length;
  // Outer-lower corner keeps clear of pillar labels above the node.
  const cx = gateX - side * (NODE_R + 1);
  const cy = gateY + NODE_R + 1;
  const names = records.map(record => `${nameOf(record.memberId) ?? record.memberId} · ${record.number}`).join(' · ');
  const label = esc(t('Wa UI gate member count', { count }));
  return `<g class="wa-gate-count" data-wa-gate-count="${gate}" data-count="${count}" aria-hidden="true"><circle cx="${cx}" cy="${cy}" r="${COUNT_R}"/><text x="${cx}" y="${cy + 3.5}" text-anchor="middle">${count}</text><title>${label}${names ? ` — ${esc(names)}` : ''}</title></g>`;
}

/** Midpoint glyphs: topology only. No parallel secondary stroke for `both`. */
function renderMidpointGlyph(state, mid, y) {
  if (state === 'selfComplete') {
    return `<path class="wa-link-diamond" d="M${mid} ${y - 6}l5 6-5 6-5-6z"/>`;
  }
  if (state === 'crossMemberOnly') {
    return `<path class="wa-link-joint" d="M${mid - 4} ${y - 5}l8 10m0-10l-8 10"/>`;
  }
  if (state === 'both') {
    // Diamond (self-complete) + small X (cross) side by side — not a second parallel line.
    return `<path class="wa-link-diamond" d="M${mid - 7} ${y - 6}l5 6-5 6-5-6z"/><path class="wa-link-joint" d="M${mid + 1} ${y - 5}l8 10m0-10l-8 10"/>`;
  }
  return '';
}

/** Pure presentation: six separate real pairs, no implied links between departments.
 * markers comes from the complete organization reference pool; gateRecords comes
 * exclusively from the current computed scope. No per-scope renumbering. */
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
    const y = top + ROW_HEIGHT / 2;
    top += ROW_HEIGHT;
    const isSelected = selected?.type === 'pair' && selected.id === pair.channelId || selected?.type === 'department' && selected.id === department.id;
    const count = known ? measured?.contributorCount ?? 0 : '—';
    const label = `${t(`OC16 ${department.id}`)} · ${display.join('–')} · ${waStateText(state)}`;
    const mid = (LEFT_GATE + RIGHT_GATE) / 2;
    const endpoints = display.map((gate, sideIndex) => {
      const side = sideIndex ? -1 : 1; // Outer badge sits opposite the channel interior.
      const x = sideIndex ? RIGHT_GATE : LEFT_GATE;
      const covered = active(gate), pillar = WA_PILLAR_LABELS[gate];
      const focused = selected?.type === 'gate' && selected.id === gate;
      const activationLabel = known ? t(covered ? 'Wa UI gate active' : 'Wa UI gate inactive') : waStateText('unknown');
      const records = endpointMarkers[sideIndex];
      const membersAttr = records.length
        ? ` data-wa-members="${esc(records.map(record => record.memberId).join(' '))}"`
        : '';
      return `<g class="wa-diagram-gate ${covered?'is-covered':''} ${pillar?'is-pillar':''} ${focused?'is-selected':''}" data-wa-gate="${gate}" data-covered="${known?covered:'unknown'}"${membersAttr} role="button" tabindex="0" aria-pressed="${focused}" aria-label="${esc(`${gate} · ${pillar?t(`OC16 ${pillar}`)+' · ':''}${activationLabel}`)}"><circle class="wa-node-hit" cx="${x}" cy="${y}" r="${HIT_R}"/>${pillar?`<circle class="wa-pillar-ring" cx="${x}" cy="${y}" r="${NODE_R + 5}"/>`:''}<circle class="wa-node-face" cx="${x}" cy="${y}" r="${NODE_R}"/><text class="wa-node-number" x="${x}" y="${y + 5.5}" text-anchor="middle">${gate}</text>${pillar?`<text class="wa-node-pillar" x="${x}" y="${y - NODE_R - 10}" text-anchor="middle">${esc(t(`OC16 ${pillar}`))}</text>`:''}${renderGateCountBadge(gate, records, x, y, nameOf, side)}</g>`;
    }).join('');
    return `<g class="wa-diagram-row ${isSelected?'is-selected':''}" data-department="${department.id}"><g class="wa-diagram-channel" data-wa-pair="${pair.channelId}" data-state="${state}" role="button" tabindex="0" aria-pressed="${isSelected}" aria-label="${esc(label)}"><rect class="wa-link-hit" x="${LEFT_GATE - 28}" y="${y - 28}" width="${RIGHT_GATE - LEFT_GATE + 56}" height="56" rx="14"/><path class="wa-link-base" d="M${LEFT_GATE} ${y}H${RIGHT_GATE}"/><path class="wa-link-half ${active(display[0])?'is-covered':''}" d="M${LEFT_GATE} ${y}H${mid}"/><path class="wa-link-half ${active(display[1])?'is-covered':''}" d="M${mid} ${y}H${RIGHT_GATE}"/>${renderMidpointGlyph(state, mid, y)}<text class="wa-diagram-name" x="12" y="${y - 4}">${esc(t(`OC16 ${department.id}`))}</text><text class="wa-diagram-sub" x="12" y="${y + 13}">${esc(t('Wa UI participants count', { count }))}</text></g>${endpoints}</g>`;
  }).join('');
  return `<svg class="wa-core-svg" viewBox="0 0 ${VIEW_WIDTH} ${top + 6}" role="group" aria-label="${esc(t('OC16 graph title'))}"><title>${esc(t('OC16 graph title'))}</title>${rows}</svg>`;
}
