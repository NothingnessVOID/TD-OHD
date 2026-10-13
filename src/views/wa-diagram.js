import { t } from '../lib/i18n.js';
import { esc } from '../lib/format.js';
import { renderPentaStateSymbol } from '../lib/penta-state-symbol.js';

export const WA_PILLAR_LABELS = Object.freeze({60:'structure',50:'safety',6:'interaction',45:'hierarchy'});
export const waStateText = state => t(`Wa UI state ${state || 'unknown'}`);
export function waStateSymbol(state, size = 22) {
  if (state === 'hanging') return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><circle cx="4" cy="12" r="2.5" fill="currentColor"/><path d="M7 12h5M16 12h1"/><circle cx="20" cy="12" r="2.5"/></svg>`;
  return renderPentaStateSymbol(state, {size});
}

const MARKER_COLUMNS = 7;
const MARKER_STEP = 14;

function renderGateMarkers(gate, records, x, y, nameOf) {
  return records.map((record, index) => {
    const column = index % MARKER_COLUMNS;
    const row = Math.floor(index / MARKER_COLUMNS);
    const columns = Math.min(MARKER_COLUMNS, records.length - row * MARKER_COLUMNS);
    const cx = x + (column - (columns - 1) / 2) * MARKER_STEP;
    const cy = y + 36 + row * MARKER_STEP;
    const label = esc(`${nameOf(record.memberId) ?? record.memberId} · ${record.number}`);
    return `<g class="wa-gate-member-marker wa-member-color-${record.colorSlot}" data-wa-gate-marker="${gate}" data-wa-marker-member="${esc(record.memberId)}" data-marker-number="${record.number}"><circle cx="${cx}" cy="${cy}" r="6.5"><title>${label}</title></circle><text x="${cx}" y="${cy + 3}" text-anchor="middle" aria-hidden="true">${record.number}</text></g>`;
  }).join('');
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
    const markerRows = Math.max(1, ...endpointMarkers.map(records => Math.ceil(records.length / MARKER_COLUMNS)));
    // 88 leaves space between the last badge and the next pillar label/hit area.
    const rowHeight = 88 + MARKER_STEP * (markerRows - 1);
    const y = top + 43;
    top += rowHeight;
    const isSelected = selected?.type === 'pair' && selected.id === pair.channelId || selected?.type === 'department' && selected.id === department.id;
    const count = known ? measured?.contributorCount ?? 0 : '—';
    const label = `${t(`OC16 ${department.id}`)} · ${display.join('–')} · ${waStateText(state)}`;
    const endpoints = display.map((gate, side) => {
      const x = side ? 306 : 180, covered = active(gate), pillar = WA_PILLAR_LABELS[gate];
      const focused = selected?.type === 'gate' && selected.id === gate;
      const activationLabel = known ? t(covered ? 'Wa UI gate active' : 'Wa UI gate inactive') : waStateText('unknown');
      return `<g class="wa-diagram-gate ${covered?'is-covered':''} ${pillar?'is-pillar':''} ${focused?'is-selected':''}" data-wa-gate="${gate}" data-covered="${known?covered:'unknown'}" role="button" tabindex="0" aria-pressed="${focused}" aria-label="${esc(`${gate} · ${pillar?t(`OC16 ${pillar}`)+' · ':''}${activationLabel}`)}"><circle class="wa-node-hit" cx="${x}" cy="${y}" r="30"/>${pillar?`<circle class="wa-pillar-ring" cx="${x}" cy="${y}" r="25"/>`:''}<circle class="wa-node-face" cx="${x}" cy="${y}" r="19"/><text class="wa-node-number" x="${x}" y="${y+6}" text-anchor="middle">${gate}</text>${pillar?`<text class="wa-node-pillar" x="${x}" y="${y-32}" text-anchor="middle">${esc(t(`OC16 ${pillar}`))}</text>`:''}${renderGateMarkers(gate, endpointMarkers[side], x, y, nameOf)}</g>`;
    }).join('');
    return `<g class="wa-diagram-row ${isSelected?'is-selected':''}" data-department="${department.id}"><g class="wa-diagram-channel" data-wa-pair="${pair.channelId}" data-state="${state}" role="button" tabindex="0" aria-pressed="${isSelected}" aria-label="${esc(label)}"><rect class="wa-link-hit" x="132" y="${y-30}" width="221" height="60" rx="16"/><path class="wa-link-base" d="M180 ${y}H306"/><path class="wa-link-half ${active(display[0])?'is-covered':''}" d="M180 ${y}H243"/><path class="wa-link-half ${active(display[1])?'is-covered':''}" d="M243 ${y}H306"/>${state==='crossMemberOnly'||state==='both'?`<path class="wa-link-joint" d="M239 ${y-5}l8 10m0-10l-8 10"/>`:''}${state==='both'?`<path class="wa-link-secondary" d="M197 ${y-8}H289"/>`:''}<text class="wa-diagram-name" x="14" y="${y-4}">${esc(t(`OC16 ${department.id}`))}</text><text class="wa-diagram-sub" x="14" y="${y+15}">${esc(t('Wa UI participants count', { count }))}</text></g>${endpoints}</g>`;
  }).join('');
  return `<svg class="wa-core-svg" viewBox="0 0 360 ${top + 8}" role="group" aria-label="${esc(t('OC16 graph title'))}"><title>${esc(t('OC16 graph title'))}</title>${rows}</svg>`;
}

export function renderWaLegend() {
  return `<div class="wa-legend">${['absent','hanging','selfComplete','crossMemberOnly','both'].map(state=>`<span>${waStateSymbol(state)}<span>${esc(waStateText(state))}</span></span>`).join('')}<span><i class="wa-pillar-swatch" aria-hidden="true"></i><span>${esc(t('OC16 pillar'))}</span></span></div>`;
}
