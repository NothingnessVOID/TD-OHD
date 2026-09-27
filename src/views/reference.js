import { GATES, CHANNELS } from 'natalengine';
import { referenceEntries, referenceEntry, searchReference, circuitChannels } from '../lib/reference-catalog.js';
import { gateReading, channelReading, centerReading, channelsForGate, channelsForCenter } from '../lib/reference-content.js';
import { gateName, channelName, centerName, circuitName, hexagramName } from '../lib/vocabulary.js';
import { t } from '../lib/i18n.js';
import { esc } from '../lib/format.js';
import '../lib/reference-messages.js';

const categories = ['all', 'center', 'channel', 'gate', 'circuit'];
const labels = { all: 'All entries', center: 'Reference centers', channel: 'Reference channels', gate: 'Reference gates', circuit: 'Reference circuits' };
let category = 'all';
let query = '';
let limit = 60;
let lens = 'hd';
let built = false;

function route() {
  const [path, search = ''] = location.hash.slice(1).split('?');
  const parts = path.split('/');
  if (parts[0] !== 'library') return null;
  let id = null;
  try { id = parts.length === 3 ? decodeURIComponent(parts[2]) : null; } catch { return { invalid: true }; }
  const params = new URLSearchParams(search);
  if (params.has('line') && !/^[1-6]$/.test(params.get('line'))) return { invalid: true };
  const line = params.has('line') && /^[1-6]$/.test(params.get('line')) ? Number(params.get('line')) : null;
  return { kind: parts.length === 3 ? parts[1] : null, id, line,
    invalid: parts.length !== 1 && parts.length !== 3 };
}

function address(kind = null, id = null, line = null) {
  const params = new URLSearchParams();
  if (line) params.set('line', String(line));
  const suffix = kind && id ? `/${kind}/${encodeURIComponent(id)}` : '';
  return `${location.pathname}#library${suffix}${params.size ? `?${params}` : ''}`;
}

export function openReference(kind = null, id = null, { line = null, replace = false } = {}) {
  history[replace ? 'replaceState' : 'pushState'](null, '', address(kind, id, line));
  window.dispatchEvent(new Event('ohd-reference-navigation'));
}

const link = (kind, id, label, line = null) => `<button type="button" class="reference-link" data-reference-kind="${kind}" data-reference-id="${esc(String(id))}"${line ? ` data-reference-line="${line}"` : ''}>${esc(label)}</button>`;
const channelId = channel => channel.gates.join('-');
const lensButtons = () => `<div class="lens-switch">${[['hd', 'Human Design'], ['iching', 'I Ching'], ['gk', 'Gene Keys']]
  .map(([key, label]) => `<button type="button" data-reference-lens="${key}" class="${lens === key ? 'active' : ''}">${t(label)}</button>`).join('')}</div>`;

function gateDetail(entry, line) {
  const gate = Number(entry.id);
  const channels = channelsForGate(gate);
  return `${lensButtons()}<div class="reference-reading">${gateReading(gate, lens, { selectedLine: line })}</div>
    <h3>${t('All six lines')}</h3><div class="reference-links">${Array.from({ length: 6 }, (_, i) => link('gate', gate, `${gate}.${i + 1}`, i + 1)).join('')}</div>
    <h3>${t('Related channels')}</h3><div class="reference-links">${channels.map(ch => link('channel', channelId(ch), `${channelId(ch)} · ${channelName(ch.gates)}`)).join('')}</div>
    <h3>${t('Reference centers')}</h3>${link('center', GATES[gate].center, centerName(GATES[gate].center))}`;
}

function channelDetail(entry) {
  const channel = CHANNELS.find(ch => channelId(ch) === entry.id);
  return `${channelReading(entry.id) || `<p>${t('No text is available in the current source.')}</p>`}
    <h3>${t('Related gates')}</h3><div class="reference-links">${channel.gates.map(gate => link('gate', gate, `${gate} · ${gateName(gate)}`)).join('')}</div>
    <h3>${t('Reference centers')}</h3><div class="reference-links">${channel.centers.map(center => link('center', center, centerName(center))).join('')}</div>
    <h3>${t('Circuits')}</h3>${link('group', channel.circuit === 'integration' ? 'individual' : channel.circuit,
      circuitName(channel.circuit === 'integration' ? 'individual' : channel.circuit))}`;
}

function centerDetail(entry) {
  const gates = Object.keys(GATES).map(Number).filter(gate => GATES[gate].center === entry.id);
  const channels = channelsForCenter(entry.id);
  return `${centerReading(entry.id) || `<p>${t('No text is available in the current source.')}</p>`}
    <h3>${t('Related gates')}</h3><div class="reference-links">${gates.map(gate => link('gate', gate, `${gate} · ${gateName(gate)}`)).join('')}</div>
    <h3>${t('Related channels')}</h3><div class="reference-links">${channels.map(ch => link('channel', channelId(ch), `${channelId(ch)} · ${channelName(ch.gates)}`)).join('')}</div>`;
}

function circuitDetail(entry) {
  const channels = circuitChannels(entry.kind, entry.id);
  const subcircuits = entry.kind === 'group' ? [...new Set(channels.map(ch => ch.subcircuit))].filter(id => id && id !== 'integration') : [];
  return `${subcircuits.length ? `<h3>${t('Circuits')}</h3><div class="reference-links">${subcircuits.map(id => link('circuit', id, circuitName(id))).join('')}</div>` : ''}
    ${entry.kind === 'group' && entry.id === 'individual' ? `<p class="reference-note">${t('Integration')}</p>` : ''}
    <h3>${t('Reference channels')}</h3><div class="reference-links">${channels.map(ch => link('channel', channelId(ch), `${channelId(ch)} · ${channelName(ch.gates)}`)).join('')}</div>`;
}

function renderDetail() {
  const selected = route();
  const article = document.getElementById('reference-detail');
  if (!selected?.kind && !selected?.invalid) {
    article.innerHTML = `<p class="reference-empty">${t('Select an entry to read.')}</p>`;
    return;
  }
  const entry = selected.invalid ? null : referenceEntry(selected.kind, selected.id);
  if (!entry || (selected.kind !== 'gate' && selected.line)) {
    article.innerHTML = `<p class="reference-empty">${t('Invalid reference address.')}</p>`;
    return;
  }
  const body = entry.kind === 'gate' ? gateDetail(entry, selected.line)
    : entry.kind === 'channel' ? channelDetail(entry)
      : entry.kind === 'center' ? centerDetail(entry) : circuitDetail(entry);
  article.innerHTML = `<button type="button" class="reference-back" data-reference-back>← ${t('Back to results')}</button>
    <div class="detail-label">${t(labels[entry.kind] || 'Reference circuits')} · ${esc(entry.id)}${selected.line ? `.${selected.line}` : ''}</div>
    <h2>${esc(entry.name)}${selected.line ? ` · ${selected.line}` : ''}</h2>
    ${entry.kind === 'gate' ? `<p class="label-soft">${esc(hexagramName(Number(entry.id)))}</p>` : ''}
    <div class="reference-detail-body">${body}</div>`;
  article.scrollTop = 0;
}

function renderResults() {
  const results = document.getElementById('reference-results');
  const matches = searchReference(query, category);
  results.innerHTML = matches.slice(0, limit).map(entry => `<button type="button" class="reference-result" data-reference-kind="${entry.kind}" data-reference-id="${esc(entry.id)}"${entry.line ? ` data-reference-line="${entry.line}"` : ''}>
    <small>${t(labels[entry.kind] || 'Reference circuits')} · ${esc(entry.line ? `${entry.id}.${entry.line}` : entry.id)}</small><strong>${esc(entry.name)}</strong></button>`).join('')
    + (matches.length > limit ? `<button type="button" class="reference-more" data-reference-more>${t('Show more')}</button>` : '')
    || `<p>${t('No matching reference.')}</p>`;
  document.getElementById('reference-count').textContent = t('{count} results', { count: matches.length });
}

function build() {
  const mount = document.getElementById('library-view');
  mount.innerHTML = `<div class="view-container-wide"><header class="reference-heading"><h1>${t('Reference Library')}</h1>
    <p>${t('Browse the original chart reference without a birth chart.')}</p></header>
    <div class="reference-layout"><aside class="reference-sidebar"><label for="reference-search">${t('Search reference')}</label>
      <input id="reference-search" type="search" autocomplete="off" placeholder="${t('Search by number or name')}" value="${esc(query)}">
      <div class="reference-filters">${categories.map(id => `<button type="button" data-reference-filter="${id}" class="${category === id ? 'active' : ''}">${t(labels[id])}</button>`).join('')}</div>
      <p id="reference-count"></p><div id="reference-results" class="reference-results"></div></aside>
      <article id="reference-detail" class="reference-detail"></article></div></div>`;
  built = true;
}

export function renderReferenceView({ languageChange = false } = {}) {
  const previousScroll = built ? document.querySelector('.reference-results')?.scrollTop || 0 : 0;
  const focused = document.activeElement?.id === 'reference-search';
  if (!built || languageChange) build();
  renderResults();
  renderDetail();
  document.querySelectorAll('[data-reference-filter]').forEach(button => button.classList.toggle('active', button.dataset.referenceFilter === category));
  if (previousScroll) document.querySelector('.reference-results').scrollTop = previousScroll;
  if (focused) document.getElementById('reference-search').focus({ preventScroll: true });
}

export function setupReferenceView() {
  const mount = document.getElementById('library-view');
  mount.addEventListener('input', event => {
    if (event.target.id !== 'reference-search') return;
    query = event.target.value;
    limit = 60;
    renderResults();
  });
  mount.addEventListener('click', event => {
    const target = event.target.closest('[data-reference-kind]');
    if (target) { openReference(target.dataset.referenceKind, target.dataset.referenceId, { line: Number(target.dataset.referenceLine) || null }); return; }
    const filter = event.target.closest('[data-reference-filter]');
    if (filter) { category = filter.dataset.referenceFilter; limit = 60; renderReferenceView(); return; }
    const selectedLens = event.target.closest('[data-reference-lens]');
    if (selectedLens) { lens = selectedLens.dataset.referenceLens; renderDetail(); return; }
    if (event.target.closest('[data-reference-more]')) { limit += 60; renderResults(); }
    if (event.target.closest('[data-reference-back]')) openReference();
  });
}
