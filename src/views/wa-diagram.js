import { t } from '../lib/i18n.js';
import { esc } from '../lib/format.js';
import { gateName } from '../lib/vocabulary.js';
import { renderPentaStateSymbol } from '../lib/penta-state-symbol.js';

export const WA_PILLAR_LABELS = Object.freeze({60:'structure',50:'safety',6:'interaction',45:'hierarchy'});
export const waStateText = state => t(`Wa UI state ${state || 'unknown'}`);
/** Detail sheets still use the shared state symbol; the left diagram does not. */
export function waStateSymbol(state, size = 22) {
  if (state === 'hanging') return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><circle cx="4" cy="12" r="2.5" fill="currentColor"/><path d="M7 12h5M16 12h1"/><circle cx="20" cy="12" r="2.5"/></svg>`;
  return renderPentaStateSymbol(state, {size});
}

/** Fixed board: six tube rows; v2 soft chips outside focus rings; dept titles in a wider left column. */
export const WA_DIAGRAM_GEOMETRY = Object.freeze({
  VIEW_WIDTH: 600, ROW_HEIGHT: 94, LEFT_GATE: 272, RIGHT_GATE: 430,
  NODE_R: 15, TUBE_H: 8.5, DOT_R: 4, DOT_STEP: 9.5, MAX_DOTS: 5,
  MID_R: 4.75, PAD_TOP: 6, PAD_BOTTOM: 14,
  /** Middle pillar ring — even gap from NODE_R (≈4.5) and to outer focus (same gap). */
  PILLAR_RING_R: 19.5,
  /** Clearance from node face edge down to contributor-dot centers. */
  DOT_GAP: 28,
  NODE_HALO_EXTRA: 2.5,
  /** Outer focus/hit ring beyond face; matches pillar+gap so channel/gate frames share a size. */
  NODE_HIT_EXTRA: 9.5,
  /** Extra beyond pillar ring so solid → pillar → focus gaps stay even (~4.5 / 5). */
  PILLAR_FOCUS_EXTRA: 5,
  /** First contributor dot sits on the outer face rim, then packs toward the channel. */
  DOT_OUTER_OFFSET: 15,
  LINK_HIT_HALF: 12,
  /** Gap from outer focus ring to the near edge of a gate name chip. */
  CHIP_GAP: 28,
  CHIP_H: 22,
  CHIP_PAD_X: 10,
  /** Left column for department title chips (exclusive of gate chips). */
  TITLE_X: 14,
  TITLE_CHIP_H: 28,
  TITLE_PAD_X: 12
});
const G = WA_DIAGRAM_GEOMETRY;
const DEFINED = new Set(['selfComplete', 'crossMemberOnly', 'both']);
const fmt = n => Math.round(n * 10) / 10;

/** Approximate SVG text width for CJK-heavy labels (no DOM measure in render). */
function estimateTextWidth(label, { cjk = 13, ascii = 7.4, soft = 6 } = {}) {
  let w = 0;
  for (const ch of String(label)) {
    if (/[\u4e00-\u9fff]/.test(ch)) w += cjk;
    else if (ch === '·' || ch === ' ') w += soft;
    else w += ascii;
  }
  return w;
}

/** Midpoint mark: hollow when not fully connected; solid + soft halo when both ends are active.
 * Fill stays luminous on every skin (never --accent-on, which is dark on several dark skins). */
function renderMidMark(fill, mid, y) {
  const r = G.MID_R;
  const filled = fill === 'full';
  const diamond = `<path class="wa-tube-mid ${filled ? 'is-filled' : 'is-hollow'}" d="M${fmt(mid)} ${fmt(y - r)}l${r} ${r}-${r} ${r}-${r}-${r}z" aria-hidden="true"/>`;
  if (!filled) return diamond;
  return `<circle class="wa-mid-halo" cx="${fmt(mid)}" cy="${fmt(y)}" r="${fmt(r + 3.2)}" aria-hidden="true"/>${diamond}`;
}

/** Contributor strip under a gate: coloured dots only. Start on the outer face rim, pack inward. */
function renderGateContributors(gate, records, gateX, y, nameOf, sideIndex) {
  if (!records.length) return '';
  const count = records.length;
  const names = records.map(record => `${nameOf(record.memberId) ?? record.memberId} · ${record.number}`).join(' · ');
  const label = esc(t('Wa UI gate member count', { count }));
  const cy = y + G.NODE_R + G.DOT_GAP;
  const shown = records.slice(0, G.MAX_DOTS);
  const rest = count - shown.length;
  // From the outer face rim inward: left gate grows right, right gate grows left.
  const dir = sideIndex ? -1 : 1;
  const start = gateX - dir * G.DOT_OUTER_OFFSET;
  const dots = shown.map((record, index) =>
    `<circle class="wa-gate-dot wa-member-color-${record.colorSlot}" data-wa-marker-member="${esc(record.memberId)}" cx="${fmt(start + dir * index * G.DOT_STEP)}" cy="${fmt(cy)}" r="${G.DOT_R}"/>`
  ).join('');
  const lastX = start + dir * (shown.length - 1) * G.DOT_STEP;
  const more = rest > 0
    ? `<text class="wa-gate-more" x="${fmt(lastX + dir * (G.DOT_R + 3))}" y="${fmt(cy + 3.5)}" text-anchor="${dir > 0 ? 'start' : 'end'}">+${rest}</text>`
    : '';
  return `<g class="wa-gate-count" data-wa-gate-count="${gate}" data-count="${count}" aria-hidden="true">${dots}${more}<title>${label}${names ? ` — ${esc(names)}` : ''}</title></g>`;
}

/** Soft chip outside the focus ring: `编号 · vocabulary gateName` (shared HD names). */
function renderGateChip(gate, x, y, sideIndex, focusR) {
  const label = `${gate} · ${gateName(gate)}`;
  const textW = estimateTextWidth(label);
  const w = Math.max(52, Math.ceil(textW + G.CHIP_PAD_X * 2));
  const h = G.CHIP_H;
  const near = x + (sideIndex ? 1 : -1) * (focusR + G.CHIP_GAP);
  const chipX = sideIndex ? near : near - w;
  const chipY = y - h / 2;
  const tx = chipX + w / 2;
  return `<g class="wa-gate-chip" data-wa-gate-chip="${gate}" aria-hidden="true"><rect class="wa-gate-chip-bg" x="${fmt(chipX)}" y="${fmt(chipY)}" width="${w}" height="${h}" rx="${h / 2}"/><text class="wa-gate-chip-text" x="${fmt(tx)}" y="${fmt(y + 4.2)}" text-anchor="middle">${esc(label)}</text></g>`;
}

/** Department title as a stronger left title chip + secondary state line (clear of gate chips). */
function renderDeptTitle(departmentId, state, fill, y) {
  const name = t(`OC16 ${departmentId}`);
  const sub = t(`Wa UI line ${state}`);
  const textW = estimateTextWidth(name, { cjk: 15, ascii: 8.2, soft: 6 });
  const w = Math.max(48, Math.ceil(textW + G.TITLE_PAD_X * 2));
  const h = G.TITLE_CHIP_H;
  const x = G.TITLE_X;
  const chipY = y - h / 2 - 2;
  return `<g class="wa-dept-title" data-department-title="${esc(departmentId)}" aria-hidden="true"><rect class="wa-dept-title-bg" x="${x}" y="${fmt(chipY)}" width="${w}" height="${h}" rx="8"/><rect class="wa-dept-title-accent" x="${x}" y="${fmt(chipY + 5)}" width="3" height="${h - 10}" rx="1.5"/><text class="wa-diagram-name" x="${fmt(x + w / 2 + 1)}" y="${fmt(y + 1.5)}" text-anchor="middle">${esc(name)}</text><text class="wa-diagram-sub" data-fill="${fill}" x="${x}" y="${fmt(y + 22)}">${esc(sub)}</text></g>`;
}

/** Pure presentation: six separate real pairs, no implied links between departments.
 * markers comes from the complete organization reference pool; gateRecords comes
 * exclusively from the current computed scope. No per-scope renumbering.
 * showNames is accepted for call-site compatibility but ignored — left diagram is always dots. */
export function renderWaDiagram(departments, result, selected = null, { markers, nameOf = id => id } = {}) {
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
    const y = top + G.ROW_HEIGHT / 2 + 2;
    top += G.ROW_HEIGHT;
    const isSelected = selected?.type === 'pair' && selected.id === pair.channelId || selected?.type === 'department' && selected.id === department.id;
    const count = known ? measured?.contributorCount ?? 0 : '—';
    const fill = !known ? 'none' : DEFINED.has(state) ? 'full' : active(display[0]) ? 'left' : active(display[1]) ? 'right' : 'none';
    const label = `${t(`OC16 ${department.id}`)} · ${display.join('–')} · ${t(`Wa UI line ${state}`)} · ${t('Wa UI participants count', { count })}`;
    const x0 = G.LEFT_GATE + G.NODE_R - 2, x1 = G.RIGHT_GATE - G.NODE_R + 2, w = x1 - x0, h = G.TUBE_H;
    const mid = (x0 + x1) / 2;
    const gid = `wa-tube-${String(pair.channelId).replace(/[^\w-]/g, '')}`;
    let tubeFill = '';
    if (fill === 'full') tubeFill = `<rect class="wa-tube-fill" x="${x0}" y="${fmt(y - h / 2)}" width="${w}" height="${h}" rx="${h / 2}"/>`;
    else if (fill !== 'none') {
      const fromLeft = fill === 'left';
      defs.push(`<linearGradient id="${gid}" x1="${fromLeft ? 0 : 1}" y1="0" x2="${fromLeft ? 1 : 0}" y2="0"><stop offset="0" style="stop-color:var(--accent);stop-opacity:1"/><stop offset=".42" style="stop-color:var(--accent);stop-opacity:.85"/><stop offset=".72" style="stop-color:var(--accent);stop-opacity:0"/></linearGradient>`);
      tubeFill = `<rect class="wa-tube-fill is-partial" x="${x0}" y="${fmt(y - h / 2)}" width="${w}" height="${h}" rx="${h / 2}" fill="url(#${gid})"/>`;
    }
    const endpoints = display.map((gate, sideIndex) => {
      const x = sideIndex ? G.RIGHT_GATE : G.LEFT_GATE;
      const covered = active(gate), pillar = WA_PILLAR_LABELS[gate];
      const focused = selected?.type === 'gate' && selected.id === gate;
      const activationLabel = known ? t(covered ? 'Wa UI gate active' : 'Wa UI gate inactive') : waStateText('unknown');
      const records = endpointMarkers[sideIndex];
      const membersAttr = records.length ? ` data-wa-members="${esc(records.map(record => record.memberId).join(' '))}"` : '';
      const pillarMark = pillar
        ? `<circle class="wa-pillar-ring" cx="${x}" cy="${fmt(y)}" r="${G.PILLAR_RING_R}"/>`
        : '';
      const haloR = G.NODE_R + G.NODE_HALO_EXTRA;
      const hitR = G.NODE_R + G.NODE_HIT_EXTRA;
      const focusR = pillar ? G.PILLAR_RING_R + G.PILLAR_FOCUS_EXTRA : hitR;
      const name = gateName(gate);
      const ariaName = pillar ? `${t(`OC16 ${pillar}`)} · ${name}` : name;
      // Pillars: ring only (no above-node text). Gate chips carry vocabulary names for every gate.
      return `<g class="wa-diagram-gate ${covered?'is-covered':''} ${pillar?'is-pillar':''} ${focused?'is-selected':''}" data-wa-gate="${gate}" data-covered="${known?covered:'unknown'}"${membersAttr} role="button" tabindex="0" aria-pressed="${focused}" aria-label="${esc(`${gate} · ${ariaName} · ${activationLabel}${records.length?` · ${t('Wa UI gate member count',{count:records.length})}`:''}`)}"><circle class="wa-node-hit" cx="${x}" cy="${fmt(y)}" r="${Math.max(hitR, focusR)}"/><circle class="wa-node-focus-ring" cx="${x}" cy="${fmt(y)}" r="${fmt(focusR)}" aria-hidden="true"/>${pillarMark}${covered?`<circle class="wa-node-halo" cx="${x}" cy="${fmt(y)}" r="${haloR}"/>`:''}<circle class="wa-node-face" cx="${x}" cy="${fmt(y)}" r="${G.NODE_R}"/><text class="wa-node-number" x="${x}" y="${fmt(y + 4.5)}" text-anchor="middle">${gate}</text>${renderGateChip(gate, x, y, sideIndex, focusR)}${renderGateContributors(gate, records, x, y, nameOf, sideIndex)}</g>`;
    }).join('');
    // No whole-row wash: only the channel graphic carries hover/selection emphasis. Dept title stays calm.
    const hitHalf = G.LINK_HIT_HALF;
    return `<g class="wa-diagram-row ${isSelected?'is-selected':''}" data-department="${department.id}" data-fill="${fill}">${renderDeptTitle(department.id, state, fill, y)}<g class="wa-diagram-channel ${isSelected?'is-selected':''}" data-wa-pair="${pair.channelId}" data-state="${state}" role="button" tabindex="0" aria-pressed="${isSelected}" aria-label="${esc(label)}"><rect class="wa-link-hit" x="${x0}" y="${fmt(y - hitHalf)}" width="${w}" height="${hitHalf * 2}" rx="9"/><rect class="wa-tube" x="${x0}" y="${fmt(y - h / 2)}" width="${w}" height="${h}" rx="${h / 2}"/>${tubeFill}${renderMidMark(fill, mid, y)}</g>${endpoints}</g>`;
  }).join('');
  const height = top + G.PAD_BOTTOM;
  return `<svg class="wa-core-svg" viewBox="0 0 ${G.VIEW_WIDTH} ${height}" role="group" aria-label="${esc(t('OC16 graph title'))}"><title>${esc(t('OC16 graph title'))}</title>${defs.length?`<defs>${defs.join('')}</defs>`:''}${rows}</svg>`;
}
