import { PENTA_GATES, PENTA_CHANNELS } from '../lib/human-design/penta-catalog.js';
import { t } from '../lib/i18n.js';
import { esc } from '../lib/format.js';
export function renderPentaPlaceholder(container, { error = false } = {}) {
 const point = gate => ({ x: 55 + gate.column * 105, y: 57 + gate.row * 98 });
 const gates = new Map(PENTA_GATES.map(gate => [gate.gate, gate]));
 container.innerHTML = `<div class="penta-render penta-placeholder"><div class="penta-figure-space"><div class="penta-canvas"><svg viewBox="0 0 320 410" role="img" aria-label="${esc(t('Penta matrix'))}">${PENTA_CHANNELS.map(ch => { const a = point(gates.get(ch.gates[0])), b = point(gates.get(ch.gates[1])); return `<line x1="${a.x}" y1="${a.y+29}" x2="${b.x}" y2="${b.y-29}" stroke="currentColor" opacity=".25"/>`; }).join('')}${PENTA_GATES.map(gate => { const p = point(gate); return `<g transform="translate(${p.x} ${p.y})"><rect x="-42" y="-32" width="84" height="64" rx="9" fill="none" stroke="currentColor" opacity=".3"/><text text-anchor="middle" y="5" fill="currentColor">${gate.gate}</text></g>`; }).join('')}</svg></div></div><p class="penta-caption">${esc(t(error ? 'Penta matrix' : 'Team structure preview'))}</p></div>`;
}
