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

/** Fixed compact board: six rows, each a single channel "tube" between two gate nodes.
 * State is carried by the tube itself (full / filled from one side / empty) so it reads without a legend. */
export const WA_DIAGRAM_GEOMETRY = Object.freeze({ VIEW_WIDTH: 380, ROW_HEIGHT: 84, LEFT_GATE: 186, RIGHT_GATE: 344, NODE_R: 15, TUBE_H: 8, DOT_R: 4, DOT_STEP: 9.5, MAX_DOTS: 5, PAD_TOP: 4 });
const G = WA_DIAGRAM_GEOMETRY;
const DEFINED = new Set(['selfComplete', 'crossMemberOnly', 'both']);
const fmt = n => Math.round(n * 10) / 10;

/** Contributor strip under a gate: overlapping member-colour dots (or names), pointer-events none. */
function renderGateContributors(gate, records, gateX, y, nameOf, showNames, side) {
  if (!records.length) return '';
  const count = records.length;
  const names = records.map(record => `${nameOf(record.memberId) ?? record.memberId} · ${record.number}`).join(' · ');
  const label = esc(t('Wa UI gate member count', { count }));
  const cy = y + G.NODE_R + 11;
  // Strip starts under the node's outer edge and runs toward the board centre.
  const anchor = side < 0 ? 'start' : 'end';
  let body;
  if (showNames) {
    const shown = records.slice(0, 1).map(record => nameOf(record.memberId) ?? record.memberId);
    const rest = count - shown.length;
    const text = shown.map(name => String(name).length > 6 ? `${String(name).slice(0, 6)}…` : name).join('、') + (rest > 0 ? ` +${rest}` : '');
    body = `<text class="wa-gate-names" x="${fmt(side < 0 ? gateX - G.NODE_R : gateX + G.NODE_R)}" y="${fmt(cy + 3.5)}" text-anchor="${anchor}">${esc(text)}</text>`;
  } else {
    const shown = records.slice(0, G.MAX_DOTS);
    const rest = count - shown.length;
    // Dots laid from the outer edge of the node toward the outside of the board.
    const dir = side < 0 ? 1 : -1;
    const start = side < 0 ? gateX - G.NODE_R + G.DOT_R : gateX + G.NODE_R - G.DOT_R;
    const dots = shown.map((record, index) => `<circle class="wa-gate-dot wa-member-color-${record.colorSlot}" data-wa-marker-member="${esc(record.memberId)}" cx="${fmt(start + dir * index * G.DOT_STEP)}" cy="${fmt(cy)}" r="${G.DOT_R}"/>`).join('');
    const lastX = start + dir * (shown.length - 1) * G.DOT_STEP;
    const more = rest > 0 ? `<text class="wa-gate-more" x="${fmt(lastX + dir * (G.DOT_R + 3))}" y="${fmt(cy + 3.5)}" text-anchor="${dir > 0 ? 'start' : 'end'}">+${rest}</text>` : '';
    body = dots + more;
  }
  return `<g class="wa-gate-count" data-wa-gate-count="${gate}" data-count="${count}" aria-hidden="true">${body}<title>${label}${names ? ` — ${esc(names)}` : ''}</title></g>`;
}

/** Pure presentation: six separate real pairs, no implied links between departments.
 * markers comes from the complete organization reference pool; gateRecords comes
 * exclusively from the current computed scope. No per-scope renumbering. */
export function renderWaDiagram(departments, result, selected = null, { markers, nameOf = id => id, showNames = false } = {}) {
  const known = ['ready', 'empty'].includes(result?.status);
  const gateRecords = new Map((known ? result.gateRecords ?? [] : []).map(row => [row.gate, row]));
  const active = gate => Boolean(gateRecords.get(gate)?.memberIds?.length);
  let top = G.PAD_TOP;
  const defs = [];
  const rows = departments.map(department => {
    const pair = department.pairs.find(pair => pair.role === 'core');
    const measured = result?.pairs?.find(row => row.channelId === pair.channelId);
    const state = known ? measured?.status || 'absent' : 'unknown';
    const display = pair.displayGates || pair.gates;
    const endpointMarkers = display.map(gate => [...new Set(gateRecords.get(gate)?.memberIds ?? [])]
      .map(id => markers?.get(id)).filter(Boolean).sort((a, b) => a.number - b.number));
    const y = top + G.ROW_HEIGHT / 2 + 4;
    top += G.ROW_HEIGHT;
    const isSelected = selected?.type === 'pair' && selected.id === pair.channelId || selected?.type === 'department' && selected.id === department.id;
    const count = known ? measured?.contributorCount ?? 0 : '—';
    const fill = !known ? 'none' : DEFINED.has(state) ? 'full' : active(display[0]) ? 'left' : active(display[1]) ? 'right' : 'none';
    const label = `${t(`OC16 ${department.id}`)} · ${display.join('–')} · ${waStateText(state)} · ${t('Wa UI participants count', { count })}`;
    const x0 = G.LEFT_GATE + G.NODE_R - 2, x1 = G.RIGHT_GATE - G.NODE_R + 2, w = x1 - x0, h = G.TUBE_H;
    const gid = `wa-tube-${String(pair.channelId).replace(/[^\w-]/g, '')}`;
    let tubeFill = '';
    if (fill === 'full') tubeFill = `<rect class="wa-tube-fill" x="${x0}" y="${fmt(y - h / 2)}" width="${w}" height="${h}" rx="${h / 2}"/>`;
    else if (fill !== 'none') {
      const fromLeft = fill === 'left';
      defs.push(`<linearGradient id="${gid}" x1="${fromLeft ? 0 : 1}" y1="0" x2="${fromLeft ? 1 : 0}" y2="0"><stop offset="0" style="stop-color:var(--accent);stop-opacity:1"/><stop offset=".42" style="stop-color:var(--accent);stop-opacity:.85"/><stop offset=".72" style="stop-color:var(--accent);stop-opacity:0"/></linearGradient>`);
      tubeFill = `<rect class="wa-tube-fill is-partial" x="${x0}" y="${fmt(y - h / 2)}" width="${w}" height="${h}" rx="${h / 2}" fill="url(#${gid})"/>`;
    }
    const endpoints = display.map((gate, sideIndex) => {
      const side = sideIndex ? 1 : -1; // -1 = left gate, contributors grow leftwards.
      const x = sideIndex ? G.RIGHT_GATE : G.LEFT_GATE;
      const covered = active(gate), pillar = WA_PILLAR_LABELS[gate];
      const focused = selected?.type === 'gate' && selected.id === gate;
      const activationLabel = known ? t(covered ? 'Wa UI gate active' : 'Wa UI gate inactive') : waStateText('unknown');
      const records = endpointMarkers[sideIndex];
      const membersAttr = records.length ? ` data-wa-members="${esc(records.map(record => record.memberId).join(' '))}"` : '';
      return `<g class="wa-diagram-gate ${covered?'is-covered':''} ${pillar?'is-pillar':''} ${focused?'is-selected':''}" data-wa-gate="${gate}" data-covered="${known?covered:'unknown'}"${membersAttr} role="button" tabindex="0" aria-pressed="${focused}" aria-label="${esc(`${gate} · ${pillar?t(`OC16 ${pillar}`)+' · ':''}${activationLabel}${records.length?` · ${t('Wa UI gate member count',{count:records.length})}`:''}`)}"><circle class="wa-node-hit" cx="${x}" cy="${fmt(y)}" r="${G.NODE_R + 6}"/>${covered?`<circle class="wa-node-halo" cx="${x}" cy="${fmt(y)}" r="${G.NODE_R + 4}"/>`:''}<circle class="wa-node-face" cx="${x}" cy="${fmt(y)}" r="${G.NODE_R}"/><text class="wa-node-number" x="${x}" y="${fmt(y + 4.5)}" text-anchor="middle">${gate}</text>${pillar?`<text class="wa-node-pillar" x="${x}" y="${fmt(y - G.NODE_R - 7)}" text-anchor="middle">${esc(t(`OC16 ${pillar}`))}</text>`:''}${renderGateContributors(gate, records, x, y, nameOf, showNames, side)}</g>`;
    }).join('');
    // Department name sits outside the channel hit target so clicking「管理」does not open the pair sheet.
    return `<g class="wa-diagram-row ${isSelected?'is-selected':''}" data-department="${department.id}" data-fill="${fill}"><rect class="wa-row-bg" x="2" y="${fmt(y - G.ROW_HEIGHT / 2 + 3)}" width="${G.VIEW_WIDTH - 4}" height="${G.ROW_HEIGHT - 6}" rx="12"/><text class="wa-diagram-name" x="14" y="${fmt(y - 3)}">${esc(t(`OC16 ${department.id}`))}</text><text class="wa-diagram-sub" data-fill="${fill}" x="14" y="${fmt(y + 14)}">${esc(t(`Wa UI line ${state}`))}</text><g class="wa-diagram-channel" data-wa-pair="${pair.channelId}" data-state="${state}" role="button" tabindex="0" aria-pressed="${isSelected}" aria-label="${esc(label)}"><rect class="wa-link-hit" x="${x0}" y="${fmt(y - 16)}" width="${w}" height="32" rx="10"/><rect class="wa-tube" x="${x0}" y="${fmt(y - h / 2)}" width="${w}" height="${h}" rx="${h / 2}"/>${tubeFill}</g>${endpoints}</g>`;
  }).join('');
  const height = top + G.PAD_TOP;
  return `<svg class="wa-core-svg" viewBox="0 0 ${G.VIEW_WIDTH} ${height}" role="group" aria-label="${esc(t('OC16 graph title'))}"><title>${esc(t('OC16 graph title'))}</title>${defs.length?`<defs>${defs.join('')}</defs>`:''}${rows}</svg>`;
}
