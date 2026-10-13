import { t } from '../lib/i18n.js';
import { esc } from '../lib/format.js';
import { renderPentaStateSymbol } from '../lib/penta-state-symbol.js';

export const WA_PILLAR_LABELS = Object.freeze({60:'structure',50:'safety',6:'interaction',45:'hierarchy'});
export const waStateText = state => t(`OC16 ${state || 'unknown'}`);
export function waStateSymbol(state, size = 22) {
  if (state === 'hanging') return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><circle cx="4" cy="12" r="2.5" fill="currentColor"/><path d="M7 12h5M16 12h1"/><circle cx="20" cy="12" r="2.5"/></svg>`;
  return renderPentaStateSymbol(state, {size});
}

/** Pure presentation: six separate real pairs, no implied links between departments.
 * Callers supply normalized catalog entries and the current computed scope only. */
export function renderWaDiagram(departments, result, selected = null) {
  const known = ['ready', 'empty'].includes(result?.status);
  const rows = departments.map((department, index) => {
    const pair = department.pairs.find(pair => pair.role === 'core');
    const measured = result?.pairs?.find(row => row.channelId === pair.channelId);
    const state = known ? measured?.status || 'absent' : 'unknown';
    const display = pair.displayGates || pair.gates;
    const y = 43 + index * 74;
    const isSelected = selected?.type === 'pair' && selected.id === pair.channelId || selected?.type === 'department' && selected.id === department.id;
    const active = gate => known && Boolean(result.gateRecords?.find(row => row.gate === gate)?.memberIds.length);
    const count = known ? display.filter(active).length : '—';
    const label = `${t(`OC16 ${department.id}`)} · ${display.join('–')} · ${waStateText(state)}`;
    const endpoints = display.map((gate, side) => {
      const x = side ? 306 : 180, covered = active(gate), pillar = WA_PILLAR_LABELS[gate];
      const focused = selected?.type === 'gate' && selected.id === gate;
      return `<g class="wa-diagram-gate ${covered?'is-covered':''} ${pillar?'is-pillar':''} ${focused?'is-selected':''}" data-wa-gate="${gate}" data-covered="${known?covered:'unknown'}" role="button" tabindex="0" aria-pressed="${focused}" aria-label="${esc(`${gate} · ${pillar?t(`OC16 ${pillar}`)+' · ':''}${t(known?covered?'OC16 active':'OC16 inactive':'OC16 unknown')}`)}"><circle class="wa-node-hit" cx="${x}" cy="${y}" r="30"/>${pillar?`<circle class="wa-pillar-ring" cx="${x}" cy="${y}" r="25"/>`:''}<circle class="wa-node-face" cx="${x}" cy="${y}" r="19"/><text class="wa-node-number" x="${x}" y="${y+6}" text-anchor="middle">${gate}</text>${pillar?`<text class="wa-node-pillar" x="${x}" y="${y+38}" text-anchor="middle">${esc(t(`OC16 ${pillar}`))}</text>`:''}</g>`;
    }).join('');
    return `<g class="wa-diagram-row ${isSelected?'is-selected':''}" data-department="${department.id}"><g class="wa-diagram-channel" data-wa-pair="${pair.channelId}" data-state="${state}" role="button" tabindex="0" aria-pressed="${isSelected}" aria-label="${esc(label)}"><rect class="wa-link-hit" x="132" y="${y-30}" width="221" height="60" rx="16"/><path class="wa-link-base" d="M180 ${y}H306"/><path class="wa-link-half ${active(display[0])?'is-covered':''}" d="M180 ${y}H243"/><path class="wa-link-half ${active(display[1])?'is-covered':''}" d="M243 ${y}H306"/>${state==='crossMemberOnly'||state==='both'?`<path class="wa-link-joint" d="M239 ${y-5}l8 10m0-10l-8 10"/>`:''}${state==='both'?`<path class="wa-link-secondary" d="M197 ${y-8}H289"/>`:''}<text class="wa-diagram-name" x="14" y="${y-4}">${esc(t(`OC16 ${department.id}`))}</text><text class="wa-diagram-sub" x="14" y="${y+15}">${count} / 2</text></g>${endpoints}</g>`;
  }).join('');
  return `<svg class="wa-core-svg" viewBox="0 0 360 454" role="group" aria-label="${esc(t('OC16 graph title'))}"><title>${esc(t('OC16 graph title'))}</title>${rows}</svg>`;
}

export function renderWaLegend() {
  return `<div class="wa-legend">${['absent','hanging','selfComplete','crossMemberOnly','both'].map(state=>`<span>${waStateSymbol(state)}<span>${esc(waStateText(state))}</span></span>`).join('')}<span><i class="wa-pillar-swatch" aria-hidden="true"></i><span>${esc(t('OC16 pillar'))}</span></span></div>`;
}
