/**
 * Center-symmetric birth-activation column: Design | planet glyph | Personality.
 *
 * Shared by the transit timeline, the transit page and the relationship
 * composite so all three show the same fields, colours and interaction instead
 * of maintaining parallel copies. The component renders only the chart it is
 * given: it never reads transit or composite state.
 */
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const setText = (node, value) => { if (node.textContent !== value) node.textContent = value; };

/** Head plus an empty body; the caller owns the outer positioning element. */
export function birthActivationsMarkup({ labels, locale = 'en-GB' }) {
  return `<div class="tl-birth-head${locale.startsWith('en') ? ' tl-birth-head-en' : ''}"><span class="bg-planets-design"><span class="bg-planets-head">${esc(labels.design)}</span></span><span aria-hidden="true"></span><span class="bg-planets-personality"><span class="bg-planets-head">${esc(labels.personality)}</span></span></div><div class="tl-birth-planets"></div>`;
}

/**
 * Render one chart's Design and Personality activations into a mounted column.
 * `fixings` is optional: without it the column reports activations only, which
 * is what a relationship chart needs.
 */
export function renderBirthActivations({ root, chart, planets, fixings = null, translate, interactive = true, onSelect }) {
  const rows = root.querySelector('.tl-birth-planets');
  if (!rows) return;
  if (!rows.children.length) {
    const cell = (side, planet) => {
      const design = side === 'design';
      const mark = '<span class="tl-fixing-mark" aria-hidden="true"></span>';
      const act = '<span class="bg-planet-act"></span>';
      const inner = design ? `${mark}${act}` : `${act}${mark}`;
      const attrs = `class="tl-birth-value bg-planet-row bg-planets-${side}" data-birth-planet="${esc(planet.id)}" data-side="${side}"`;
      return interactive
        ? `<button type="button" ${attrs}>${inner}</button>`
        : `<span ${attrs}>${inner}</span>`;
    };
    rows.innerHTML = planets.map(planet => `<div class="tl-birth-row">${cell('design', planet)}<span class="bg-planet-glyph tl-birth-glyph" aria-hidden="true">${esc(planet.glyph)}</span>${cell('personality', planet)}</div>`).join('');
  }
  const planetName = id => planets.find(planet => planet.id === id)?.name || id;
  root.querySelectorAll('.tl-birth-value[data-birth-planet]').forEach(node => {
    const value = chart.gates?.[node.dataset.side]?.[node.dataset.birthPlanet];
    node.dataset.gate = value?.gate ?? '';
    const text = value ? `${value.gate}.${value.line}` : '—';
    setText(node.querySelector('.bg-planet-act'), text);
    const fixing = fixings?.birth?.[node.dataset.side]?.[node.dataset.birthPlanet];
    const symbol = node.querySelector('.tl-fixing-mark');
    const state = fixing?.transitAdjustedState;
    symbol.dataset.temporary = String(fixing?.temporaryChange === true);
    symbol.dataset.state = state || '';
    setText(symbol, ({ exalted: '▲', detriment: '▼', juxtaposed: '▲▼', unknown: '?' })[state] || '');
    const parts = [translate(node.dataset.side), planetName(node.dataset.birthPlanet), text];
    if (fixing) {
      parts.push(fixing.temporaryChange
        ? `${translate('temporaryFixing')} · ${translate('natalFixing')}: ${translate(`fixing_${fixing.natalState}`)}`
        : translate('natalFixing'));
      if (state) parts.push(translate(`fixing_${state}`));
    }
    node.title = parts.join(' · ');
    node.setAttribute('aria-label', node.title);
    if (interactive && onSelect && value) {
      node.addEventListener('click', () => onSelect(value.gate, node.dataset.side, node.dataset.birthPlanet));
    }
  });
}
