import { GATES, CHANNELS, CENTERS } from 'natalengine';
import { knowledgeEntry, searchKnowledge, knowledgeCounts } from '../lib/knowledge-catalog.js';
import { GATE_DESCRIPTIONS, LINE_DESCRIPTIONS, CHANNEL_DESCRIPTIONS, HEXAGRAM_DESCRIPTIONS,
  GENE_KEY_DESCRIPTIONS, contentText, geneKeyTerm } from '../lib/content.js';
import { centerName, channelName, circuitName, gateName, hexagramName, lineName } from '../lib/vocabulary.js';
import { t } from '../lib/i18n.js';
import { esc } from '../lib/format.js';

const SOURCE = 'https://jovianarchive.com/pages/human-design-dictionary';
const CIRCUIT_SOURCE = 'https://jovianarchive.com/pages/what-is-circuitry-in-human-design';
const concepts = {
  activation: 'A gate activated by a planet in a birth chart or transit.',
  type: 'A chart category derived from the pattern of defined centers and channels.',
  strategy: 'The approach to decisions associated with a type.',
  authority: 'The decision process associated with defined centers.',
  profile: 'The pairing of personality and design Sun/Earth line numbers.',
  definition: 'The connected regions formed by completed channels.',
  transit: 'A celestial body crossing a gate, line or finer division at a specific time.',
  penta: 'The upstream team view combines individual charts; it does not calculate the specialist Penta bodygraph.'
};
const typeNames = ['center', 'channel', 'gate', 'line', 'circuit-group', 'circuit', 'network', 'concept'];
let selectedType = 'all';
let query = '';
let selectedLens = 'hd';
let initialized = false;
let visibleCount = 60;

function route() {
  const [path, search = ''] = location.hash.slice(1).split('?');
  const parts = path.split('/');
  if (parts[0] !== 'library') return null;
  const params = new URLSearchParams(search);
  return { type: parts[1] || null, id: parts.slice(2).join('/') || null,
    filter: typeNames.includes(params.get('type')) ? params.get('type') : 'all',
    query: params.get('q') || '' };
}

function address(type = null, id = null) {
  const params = new URLSearchParams();
  if (selectedType !== 'all') params.set('type', selectedType);
  if (query) params.set('q', query);
  const suffix = `${type ? `/${type}/${encodeURIComponent(id)}` : ''}${params.size ? '?' + params : ''}`;
  return `${location.pathname}#library${suffix}`;
}

export function openKnowledge(type = null, id = null, { replace = false } = {}) {
  const target = address(type, id);
  history[replace ? 'replaceState' : 'pushState'](null, '', target);
  window.dispatchEvent(new Event('ohd-knowledge-navigation'));
}

const entityButton = (type, id, label) => `<button type="button" class="knowledge-link" data-entity="${esc(type)}" data-id="${esc(String(id))}">${esc(label)}</button>`;
const sourceLink = (url = SOURCE) => `<a href="${url}" target="_blank" rel="noopener noreferrer">${t('Source and terminology')}</a>`;
const upstreamReading = (file) => `<span class="knowledge-source">${t('Upstream synthesized reading')} · ${t('not an original Ra Uru Hu text')} · <a href="https://github.com/Unforced-Dev/natalengine/blob/main/src/data/${file}" target="_blank" rel="noopener noreferrer">${t('Source code')}</a></span>`;

function gateBody(id, selectedLine = null) {
  const n = Number(id);
  const desc = GATE_DESCRIPTIONS[n];
  const hex = HEXAGRAM_DESCRIPTIONS[n];
  const gene = GENE_KEY_DESCRIPTIONS[n];
  const connected = CHANNELS.filter(channel => channel.gates.includes(n));
  const tabs = ['hd','iching','gk'].map((lens) => `<button type="button" class="${selectedLens === lens ? 'active' : ''}" data-knowledge-lens="${lens}">${t(lens === 'hd' ? 'Human Design' : lens === 'iching' ? 'I Ching' : 'Gene Keys')}</button>`).join('');
  const lineButtons = Array.from({length:6}, (_,i) => entityButton('line', `${n}.${i+1}`, `${n}.${i+1} · ${lineName(i+1)}`));
  const lineDetails = Array.from({length:6}, (_,i) => {
    const line = i+1;
    if (selectedLine && line !== selectedLine) return '';
    const data = selectedLens === 'iching' ? hex?.lines?.[line] : LINE_DESCRIPTIONS[n]?.[line];
    if (!data) return `<section class="knowledge-line"><h4>${t('Line {line}', {line})}</h4><p>${t('No reading in the current source.')}</p></section>`;
    return `<section class="knowledge-line" id="library-line-${line}"><h4>${t('Line {line}', {line})}${data.keynote ? ` · ${esc(data.keynote)}` : ''}</h4>
      <p>${esc(contentText(data.description || data.meaning || data))}</p></section>`;
  }).join('');
  let reading = '';
  if (selectedLens === 'hd') reading = `<h3>${esc(desc?.keynote || GATES[n].name)}</h3><p>${esc(desc?.description || '')}</p>${upstreamReading(selectedLine ? 'gate-lines.js' : 'gate-descriptions.js')}${lineDetails}`;
  else if (selectedLens === 'iching') reading = `<h3>${esc(hexagramName(n))}</h3><p>${esc(hex?.meaning || '')}</p>${lineDetails}`;
  else reading = `<div class="gk-spectrum"><span class="gk-shadow">${esc(geneKeyTerm(n, 'shadow'))}</span><span class="gk-arrow">→</span><span class="gk-gift">${esc(geneKeyTerm(n, 'gift'))}</span><span class="gk-arrow">→</span><span class="gk-siddhi">${esc(geneKeyTerm(n, 'siddhi'))}</span></div>
    <p>${esc(gene?.description || '')}</p>${upstreamReading('gene-key-descriptions.js')}`;
  return `<div class="knowledge-tabs lens-switch">${tabs}</div><div class="knowledge-reading">${reading}</div>
    <h3>${t('All six lines')}</h3><div class="knowledge-chip-list">${lineButtons.join('')}</div>
    <h3>${t('Connected channels')}</h3><div class="knowledge-chip-list">${connected.map(channel => entityButton('channel', channel.gates.join('-'), `${channel.gates.join('–')} · ${channelName(channel.gates)}`)).join('')}</div>
    <p>${t('Center')}: ${entityButton('center', GATES[n].center, centerName(GATES[n].center))}</p>`;
}

function channelBody(id) {
  const channel = CHANNELS.find(item => item.gates.join('-') === id);
  const description = CHANNEL_DESCRIPTIONS[id];
  return `<p>${esc(contentText(description?.description || channel.theme))}</p>${upstreamReading('channel-descriptions.js')}
    ${description?.whenDefined ? `<p>${esc(contentText(description.whenDefined))}</p>` : ''}
    <p>${t('A complete channel joins both gates; this entry is available whether or not it is active in a chart.')}</p>
    <h3>${t('Gates')}</h3><div class="knowledge-chip-list">${channel.gates.map(gate => entityButton('gate', gate, `${gate} · ${gateName(gate)}`)).join('')}</div>
    ${channel.circuit === 'integration'
      ? `<p>${t('Integration network')}: ${entityButton('network', 'integration', circuitName('integration'))}</p>`
      : `<p>${t('Circuit group')}: ${entityButton('circuit-group', channel.circuit, circuitName(channel.circuit))}</p>
         <p>${t('Circuit')}: ${entityButton('circuit', channel.subcircuit, circuitName(channel.subcircuit))}</p>`}`;
}

function centerBody(id) {
  const center = CENTERS[id];
  const gates = Object.keys(GATES).map(Number).filter(gate => GATES[gate].center === id);
  const channels = CHANNELS.filter(channel => channel.centers.includes(id));
  return `<p>${esc(contentText(center.theme))} · ${esc(contentText(center.biological))}</p>
    <p>${esc(contentText(center.definedMeaning))}</p><p>${esc(contentText(center.undefinedMeaning))}</p>
    <h3>${t('Gates')}</h3><div class="knowledge-chip-list">${gates.map(gate => entityButton('gate', gate, `${gate} · ${gateName(gate)}`)).join('')}</div>
    <h3>${t('Channels')}</h3><div class="knowledge-chip-list">${channels.map(channel => entityButton('channel', channel.gates.join('-'), `${channel.gates.join('–')} · ${channelName(channel.gates)}`)).join('')}</div>`;
}

function circuitBody(type, id) {
  const channels = CHANNELS.filter(channel => type === 'circuit-group' ? channel.circuit === id : channel.subcircuit === id);
  return `<p>${t('Circuitry groups channels by their structural paths and themes.')}</p>
    <p class="knowledge-source">${sourceLink(CIRCUIT_SOURCE)}</p>
    <h3>${t('Channels')}</h3><div class="knowledge-chip-list">${channels.map(channel => entityButton('channel', channel.gates.join('-'), `${channel.gates.join('–')} · ${channelName(channel.gates)}`)).join('')}</div>`;
}

function detailMarkup(type, id) {
  const base = type === 'line' ? knowledgeEntry('gate', id.split('.')[0]) : knowledgeEntry(type, id);
  if (!base) return `<p>${t('No matching entry.')}</p>`;
  const line = type === 'line' ? Number(id.split('.')[1]) : null;
  const body = type === 'gate' || type === 'line' ? gateBody(base.id, line) : type === 'channel' ? channelBody(base.id)
    : type === 'center' ? centerBody(base.id) : ['circuit', 'circuit-group', 'network'].includes(type) ? circuitBody(type, id)
    : `<p>${t(concepts[id])}</p><p class="knowledge-source">${sourceLink()}</p>`;
  return `<header class="knowledge-detail-header"><span class="detail-label">${t(`kind:${type}`)} ${esc(type === 'line' ? id : base.id)}</span>
    <h2>${esc(type === 'line' ? `${gateName(Number(base.id))} · ${lineName(line)}` : base.name)}</h2>
    <span class="label-soft">${esc(base.english)}</span></header>${body}`;
}

export function setupKnowledgeView() {
  if (initialized) return;
  initialized = true;
  const mount = document.getElementById('library-view');
  mount.addEventListener('input', event => {
    if (event.target.id !== 'knowledge-search') return;
    query = event.target.value;
    visibleCount = 60;
    history.replaceState(null, '', address(route()?.type, route()?.id));
    renderResults();
  });
  mount.addEventListener('click', event => {
    const link = event.target.closest('[data-entity]');
    if (link) { openKnowledge(link.dataset.entity, link.dataset.id); return; }
    const lens = event.target.closest('[data-knowledge-lens]');
    if (lens) { selectedLens = lens.dataset.knowledgeLens; renderDetail(); return; }
    const filter = event.target.closest('[data-knowledge-filter]');
    if (filter) { selectedType = filter.dataset.knowledgeFilter; visibleCount = 60; openKnowledge(null, null, {replace:true}); return; }
    if (event.target.closest('[data-knowledge-more]')) { visibleCount += 60; renderResults(); }
  });
}

function renderResults() {
  const mount = document.getElementById('library-view');
  const results = mount.querySelector('#knowledge-results');
  if (!results) return;
  const matches = searchKnowledge(query, { type: selectedType });
  results.innerHTML = matches.slice(0, visibleCount).map(entry => `<button type="button" class="knowledge-result" data-entity="${entry.type}" data-id="${esc(entry.id)}">
    <span class="knowledge-kind">${esc(t(`kind:${entry.type}`))}</span><strong>${esc(entry.name)}</strong>
    <small>${esc(entry.english)} · ${esc(entry.id)}</small></button>`).join('') +
    (matches.length > visibleCount ? `<button type="button" class="knowledge-more" data-knowledge-more>${t('Show more')}</button>` : '') || `<p>${t('No matching entry.')}</p>`;
  mount.querySelector('#knowledge-count').textContent = t('{count} entries', {count: matches.length});
}

function renderDetail() {
  const selected = route();
  const mount = document.getElementById('library-view');
  const detail = mount.querySelector('#knowledge-detail');
  detail.innerHTML = selected?.type && selected?.id
    ? detailMarkup(selected.type, selected.id)
    : `<div class="knowledge-empty"><h2>${t('Explore the knowledge library')}</h2><p>${t('Choose a center, channel, gate, line or circuit. No birth chart is required.')}</p></div>`;
}

export function renderKnowledgeView() {
  setupKnowledgeView();
  const state = route() || { type: null, id: null, filter: selectedType, query };
  selectedType = state.filter;
  query = state.query;
  const mount = document.getElementById('library-view');
  const previousFocus = document.activeElement?.id === 'knowledge-search';
  const counts = knowledgeCounts();
  mount.innerHTML = `<div class="knowledge-heading"><div><h1>${t('Knowledge Library')}</h1><p>${t('Browse the full reference, including inactive entries.')}</p></div></div>
    <div class="knowledge-layout"><aside class="knowledge-sidebar"><label for="knowledge-search">${t('Search by number, name or alias')}</label>
      <input id="knowledge-search" type="search" value="${esc(query)}" autocomplete="off" placeholder="${esc(t('Search the library'))}">
      <div class="knowledge-filters">${['all', ...typeNames].map(type => `<button type="button" data-knowledge-filter="${type}" class="${selectedType === type ? 'active' : ''}">${t(`kind:${type}`)}${type !== 'all' ? ` ${counts[type]}` : ''}</button>`).join('')}</div>
      <p id="knowledge-count" class="knowledge-count"></p><div id="knowledge-results" class="knowledge-results"></div></aside>
      <article id="knowledge-detail" class="knowledge-detail"></article></div>`;
  renderResults(); renderDetail();
  if (previousFocus) mount.querySelector('#knowledge-search').focus({ preventScroll: true });
}
