import { t } from '../lib/i18n.js';
import { esc } from '../lib/format.js';
import { orgGateName } from '../lib/wa/org-role-readings.js';
import { renderPentaStateSymbol } from '../lib/penta-state-symbol.js';

export const waStateText = state => t(`Wa UI state ${state || 'unknown'}`);
/** Detail sheets still use the shared state symbol; the left diagram does not. */
export function waStateSymbol(state, size = 22) {
  if (state === 'hanging') return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><circle cx="4" cy="12" r="2.5" fill="currentColor"/><path d="M7 12h5M16 12h1"/><circle cx="20" cy="12" r="2.5"/></svg>`;
  return renderPentaStateSymbol(state, {size});
}

/** Fixed board: six tube rows; v2 soft chips outside focus rings; dept titles as strong type (no frame). */
export const WA_DIAGRAM_GEOMETRY = Object.freeze({
  /** Layout v3+: ~50% column via CSS; taller rows + enlarged marks fill the viewport. */
  VIEW_WIDTH: 590, ROW_HEIGHT: 122, LEFT_GATE: 236, RIGHT_GATE: 446,
  NODE_R: 21, TUBE_H: 13.5, DOT_R: 4.5, DOT_STEP: 10.5, MAX_DOTS: 5,
  MID_RX: 10.5, MID_RY: 10.5, MID_CR: 3.2, MID_IRX: 4.1, MID_IRY: 4.1, MID_ICR: 1.45,
  PAD_TOP: 8, PAD_BOTTOM: 16,
  DOT_GAP: 26,
  NODE_HALO_EXTRA: 3,
  NODE_HIT_EXTRA: 10,
  DOT_OUTER_OFFSET: 21,
  LINK_HIT_HALF: 16,
  CHIP_GAP: 22,
  CHIP_H: 28,
  CHIP_PAD_X: 13,
  TITLE_X: 4
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

/** Rounded rhombus path (N-E-S-W) with corner radius along each edge. */
function roundedRhombusPath(cx, cy, rx, ry, cr) {
  const N = { x: cx, y: cy - ry };
  const E = { x: cx + rx, y: cy };
  const S = { x: cx, y: cy + ry };
  const W = { x: cx - rx, y: cy };
  const verts = [N, E, S, W];
  const edgeLen = Math.hypot(rx, ry);
  const t = Math.min(cr / edgeLen, 0.48);
  const parts = [];
  for (let i = 0; i < 4; i++) {
    const prev = verts[(i + 3) % 4];
    const cur = verts[i];
    const next = verts[(i + 1) % 4];
    const ax = cur.x + (prev.x - cur.x) * t;
    const ay = cur.y + (prev.y - cur.y) * t;
    const bx = cur.x + (next.x - cur.x) * t;
    const by = cur.y + (next.y - cur.y) * t;
    if (i === 0) parts.push(`M${fmt(ax)} ${fmt(ay)}`);
    else parts.push(`L${fmt(ax)} ${fmt(ay)}`);
    parts.push(`Q${fmt(cur.x)} ${fmt(cur.y)} ${fmt(bx)} ${fmt(by)}`);
  }
  parts.push('Z');
  return parts.join('');
}

/** Midpoint mark: warm hollow lozenge (refine-3). No glow.
 * Short horizontal spine only inside the hollow. Fill stays luminous on every skin. */
function renderMidMark(fill, mid, y) {
  const filled = fill === 'full';
  const scale = filled ? 1 : 0.92;
  const rx = G.MID_RX * scale;
  const ry = G.MID_RY * scale;
  const cr = G.MID_CR * scale;
  const irx = G.MID_IRX * scale;
  const iry = G.MID_IRY * scale;
  const icr = G.MID_ICR * scale;
  const cls = filled ? 'is-filled' : 'is-hollow';
  const outer = roundedRhombusPath(mid, y, rx, ry, cr);
  const inner = roundedRhombusPath(mid, y, irx, iry, icr);
  const spineHalf = irx * 0.72;
  const spine = `<line class="wa-mid-spine ${cls}" x1="${fmt(mid - spineHalf)}" y1="${fmt(y)}" x2="${fmt(mid + spineHalf)}" y2="${fmt(y)}" aria-hidden="true"/>`;
  return `<path class="wa-tube-mid ${cls} wa-mid-lozenge wa-mid-warm" fill-rule="evenodd" d="${outer}${inner}" aria-hidden="true"/>${spine}`;
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

/** Soft chip outside the focus ring: org role name only (circle still shows the number). */
function renderGateChip(gate, x, y, sideIndex, focusR) {
  const label = `${orgGateName(gate)}`;
  const textW = estimateTextWidth(label, { cjk: 14, ascii: 7.8, soft: 4.5 });
  const w = Math.max(56, Math.ceil(textW + G.CHIP_PAD_X * 2));
  const h = G.CHIP_H;
  const near = x + (sideIndex ? 1 : -1) * (focusR + G.CHIP_GAP);
  const chipX = sideIndex ? near : near - w;
  const chipY = y - h / 2;
  const tx = chipX + w / 2;
  return `<g class="wa-gate-chip" data-wa-gate-chip="${gate}" aria-hidden="true"><rect class="wa-gate-chip-bg" x="${fmt(chipX)}" y="${fmt(chipY)}" width="${w}" height="${h}" rx="${h / 2}"/><text class="wa-gate-chip-text" x="${fmt(tx)}" y="${fmt(y + 5)}" text-anchor="middle">${esc(label)}</text></g>`;
}

/** Department lockup: name + status as one block, optically centered on tube midline y.
 * A leading status dot carries state; there is no underline and no framed chip. */
function renderDeptTitle(departmentId, state, fill, y) {
  const name = t(`OC16 ${departmentId}`);
  const sub = t(`Wa UI line ${state}`);
  const x = G.TITLE_X;
  // 19px name sits above the line, 14.5px status below; weighted glyph centers land on y.
  const nameY = y - 5;
  const subY = y + 18;
  const dotR = 3.6;
  const dotCx = x + dotR;
  const dotCy = subY - 5;
  const subX = x + dotR * 2 + 6.5;
  const nameW = estimateTextWidth(name, { cjk: 18.2, ascii: 9.4, soft: 5 });
  const subW = dotR * 2 + 6.5 + estimateTextWidth(sub, { cjk: 14.5, ascii: 7.6, soft: 4 });
  const blockW = Math.max(nameW, subW);
  const hitW = Math.max(72, Math.ceil(blockW + 14));
  const hitH = 52;
  const hitY = y - 26;
  const aria = `${name} · ${sub}`;
  return `<g class="wa-dept-title" data-department-title="${esc(departmentId)}" data-wa-department="${esc(departmentId)}" data-line="${esc(state)}" role="button" tabindex="0" aria-label="${esc(aria)}"><rect class="wa-dept-title-hit" x="${fmt(x - 6)}" y="${fmt(hitY)}" width="${hitW}" height="${hitH}" rx="10"/><text class="wa-diagram-name" x="${x}" y="${fmt(nameY)}">${esc(name)}</text><circle class="wa-diagram-status-dot" data-fill="${fill}" data-line="${esc(state)}" cx="${fmt(dotCx)}" cy="${fmt(dotCy)}" r="${dotR}" aria-hidden="true"/><text class="wa-diagram-sub" data-fill="${fill}" data-line="${esc(state)}" x="${fmt(subX)}" y="${fmt(subY)}">${esc(sub)}</text></g>`;
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
      const covered = active(gate);
      const focused = selected?.type === 'gate' && selected.id === gate;
      const activationLabel = known ? t(covered ? 'Wa UI gate active' : 'Wa UI gate inactive') : waStateText('unknown');
      const records = endpointMarkers[sideIndex];
      const membersAttr = records.length ? ` data-wa-members="${esc(records.map(record => record.memberId).join(' '))}"` : '';
      const haloR = G.NODE_R + G.NODE_HALO_EXTRA;
      const hitR = G.NODE_R + G.NODE_HIT_EXTRA;
      const focusR = hitR;
      const name = orgGateName(gate);
      // Gate chips carry organization role names. No pillar accent rings.
      return `<g class="wa-diagram-gate ${covered?'is-covered':''} ${focused?'is-selected':''}" data-wa-gate="${gate}" data-covered="${known?covered:'unknown'}"${membersAttr} role="button" tabindex="0" aria-pressed="${focused}" aria-label="${esc(`${gate} · ${name} · ${activationLabel}${records.length?` · ${t('Wa UI gate member count',{count:records.length})}`:''}`)}"><circle class="wa-node-hit" cx="${x}" cy="${fmt(y)}" r="${hitR}"/><circle class="wa-node-focus-ring" cx="${x}" cy="${fmt(y)}" r="${fmt(focusR)}" aria-hidden="true"/>${covered?`<circle class="wa-node-halo" cx="${x}" cy="${fmt(y)}" r="${haloR}"/>`:''}<circle class="wa-node-face" cx="${x}" cy="${fmt(y)}" r="${G.NODE_R}"/><text class="wa-node-number" x="${x}" y="${fmt(y + 6)}" text-anchor="middle">${gate}</text>${renderGateChip(gate, x, y, sideIndex, focusR)}${renderGateContributors(gate, records, x, y, nameOf, sideIndex)}</g>`;
    }).join('');
    // No whole-row wash: only the channel graphic carries hover/selection emphasis. Dept title stays calm.
    const hitHalf = G.LINK_HIT_HALF;
    return `<g class="wa-diagram-row ${isSelected?'is-selected':''}" data-department="${department.id}" data-fill="${fill}">${renderDeptTitle(department.id, state, fill, y)}<g class="wa-diagram-channel ${isSelected?'is-selected':''}" data-wa-pair="${pair.channelId}" data-state="${state}" role="button" tabindex="0" aria-pressed="${isSelected}" aria-label="${esc(label)}"><rect class="wa-link-hit" x="${x0}" y="${fmt(y - hitHalf)}" width="${w}" height="${hitHalf * 2}" rx="9"/><rect class="wa-tube" x="${x0}" y="${fmt(y - h / 2)}" width="${w}" height="${h}" rx="${h / 2}"/>${tubeFill}${renderMidMark(fill, mid, y)}</g>${endpoints}</g>`;
  }).join('');
  const height = top + G.PAD_BOTTOM;
  return `<svg class="wa-core-svg" viewBox="0 0 ${G.VIEW_WIDTH} ${height}" role="group" aria-label="${esc(t('OC16 graph title'))}"><title>${esc(t('OC16 graph title'))}</title>${defs.length?`<defs>${defs.join('')}</defs>`:''}${rows}</svg>`;
}
