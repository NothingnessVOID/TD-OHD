/** Shared graph window used by the timeline and the transit summary page. */
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const setText = (node, value) => { if (node.textContent !== value) node.textContent = value; };

export function graphPanelMarkup({ labels, locale = 'en-GB', graphId = '' }) {
  return `<div class="tl-graph-panel">
    <div class="tl-selected"><output class="tl-moment" aria-label="${esc(labels.selected)}"><span class="tl-moment-date"></span><span class="tl-moment-time"></span></output></div>
    <details class="tl-legend-disclosure"><summary>${esc(labels.legend)}</summary><div class="tl-legend">${['natal', 'transit', 'completed', 'both'].map(source => `<span data-source="${source}"><i></i>${esc(labels[source])}</span>`).join('')}</div></details>
    <div ${graphId ? `id="${esc(graphId)}" ` : ''}class="tl-graph bodygraph-container"></div>
    <div class="tl-planet-column tl-transit-column bg-planets"><div class="bg-planets-head">${esc(labels.transit)}</div><div class="tl-planets" data-planets="transit"></div></div>
    <div class="tl-planet-column tl-birth-column"><div class="tl-birth-head${locale.startsWith('en') ? ' tl-birth-head-en' : ''}"><span class="bg-planets-design"><span class="bg-planets-head">${esc(labels.design)}</span></span><span aria-hidden="true"></span><span class="bg-planets-personality"><span class="bg-planets-head">${esc(labels.personality)}</span></span></div><div class="tl-birth-planets"></div></div>
  </div>`;
}

export function renderGraphColumns({ root, chart, activations, mode, planets, fixings, translate }) {
  const $ = selector => root.querySelector(selector);
  if (!$('.tl-planets').children.length) {
    $('.tl-planets').innerHTML = planets.map(planet => `<button type="button" class="tl-planet bg-planet-row" data-planet="${esc(planet.id)}" title="${esc(planet.name)}"><span class="bg-planet-glyph" aria-hidden="true">${esc(planet.glyph)}</span><strong class="bg-planet-act"></strong><span class="tl-fixing-mark" aria-hidden="true"></span></button>`).join('');
    $('.tl-birth-planets').innerHTML = planets.map(planet => `<div class="tl-birth-row"><button type="button" class="tl-birth-value bg-planet-row bg-planets-design" data-birth-planet="${esc(planet.id)}" data-side="design"><span class="tl-fixing-mark" aria-hidden="true"></span><span class="bg-planet-act"></span></button><span class="bg-planet-glyph tl-birth-glyph" aria-hidden="true">${esc(planet.glyph)}</span><button type="button" class="tl-birth-value bg-planet-row bg-planets-personality" data-birth-planet="${esc(planet.id)}" data-side="personality"><span class="bg-planet-act"></span><span class="tl-fixing-mark" aria-hidden="true"></span></button></div>`).join('');
  }
  const planetName = id => planets.find(planet => planet.id === id)?.name || id;
  const mark = (node, state, title, scope) => {
    const symbol = node.querySelector('.tl-fixing-mark');
    symbol.dataset.state = state || '';
    setText(symbol, ({ exalted: '▲', detriment: '▼', juxtaposed: '▲▼', unknown: '?' })[state] || '');
    node.title = state ? `${title} · ${scope} · ${translate(`fixing_${state}`)}` : title;
    node.setAttribute('aria-label', node.title);
  };
  root.querySelectorAll('.tl-planet[data-planet]').forEach(node => {
    const value = activations[node.dataset.planet];
    node.dataset.gate = value?.gate ?? '';
    setText(node.querySelector('strong'), value ? `${value.gate}.${value.line}` : '—');
    const fixing = fixings?.transit[node.dataset.planet];
    const state = mode === 'transit-only' ? fixing?.transitOnlyState : fixing?.combinedState;
    const scope = mode === 'transit-only' ? translate('transitFixing') : translate('combinedFixing');
    mark(node, state, `${translate('transit')} · ${planetName(node.dataset.planet)} · ${node.querySelector('strong').textContent}`, scope);
  });
  $('.tl-birth-column').hidden = mode === 'transit-only';
  root.querySelectorAll('.tl-birth-value[data-birth-planet]').forEach(node => {
    const value = chart.gates[node.dataset.side]?.[node.dataset.birthPlanet];
    node.dataset.gate = value?.gate ?? '';
    const text = value ? `${value.gate}.${value.line}` : '—';
    setText(node.querySelector('.bg-planet-act'), text);
    const fixing = fixings?.birth[node.dataset.side]?.[node.dataset.birthPlanet];
    const scope = fixing?.temporaryChange
      ? `${translate('temporaryFixing')} · ${translate('natalFixing')}: ${translate(`fixing_${fixing.natalState}`)}`
      : translate('natalFixing');
    mark(node, fixing?.transitAdjustedState, `${translate(node.dataset.side)} · ${planetName(node.dataset.birthPlanet)} · ${text}`, scope);
  });
  root.querySelectorAll('.tl-legend [data-source]').forEach(node => {
    node.hidden = mode === 'transit-only' && node.dataset.source !== 'transit';
  });
}
