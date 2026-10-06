/** Static reference prose shared by the chart detail sheet and library. */
import { CHANNELS, CENTERS } from './human-design/catalog.js';
import { GATE_DESCRIPTIONS, LINE_DESCRIPTIONS, CHANNEL_DESCRIPTIONS,
  HEXAGRAM_DESCRIPTIONS, GENE_KEY_DESCRIPTIONS, contentText, geneKeyTerm } from './content.js';
import { t } from './i18n.js';
import { esc } from './format.js';
import { hexagramName } from './vocabulary.js';
import { gateMeridianAcupoint } from './gate-meridian-data.js';
import { centerSupplement, channelSupplement, referenceSupplementLabels, gateLineReadingNote } from './reference-supplements.js';

const supplementText = text => esc(text).replaceAll('\n', '<br>');
function renderGateLineNote() {
  const note = gateLineReadingNote();
  return `<div class="lens-note"><strong>${esc(referenceSupplementLabels().lineNote)}</strong>${note.split(/\n\n+/).map(part =>
    part.split('\n').every(line => line.startsWith('- '))
      ? `<ul>${part.split('\n').map(line => `<li>${esc(line.slice(2))}</li>`).join('')}</ul>`
      : `<p>${esc(part)}</p>`).join('')}</div>`;
}

export const channelsForGate = gate => CHANNELS.filter(channel => channel.gates.includes(Number(gate)));
export const channelsForCenter = center => CHANNELS.filter(channel => channel.centers.includes(center));
export const channelById = id => CHANNELS.find(channel => channel.gates.join('-') === id || [...channel.gates].reverse().join('-') === id);

export function gateReading(gate, lens = 'hd', { selectedLine = null, activeLines = [] } = {}) {
  const n = Number(gate);
  if (!Number.isInteger(n) || n < 1 || n > 64) return '';
  const lines = Array.from({ length: 6 }, (_, i) => i + 1)
    .filter(line => selectedLine == null || selectedLine === line);
  const lineClass = line => `gate-detail-line${activeLines.includes(line) || selectedLine === line ? ' current-line' : ''}`;
  if (lens === 'meridian') {
    const record = gateMeridianAcupoint(n);
    if (!record) return '';
    return `<section class="meridian-reading" aria-label="${esc(t('经络穴位'))}">
      <div class="meridian-core">
        <div class="meridian-core-item"><span class="meridian-label">${esc(t('对应经络'))}</span><strong class="meridian-value">${esc(record.meridian)}</strong></div>
        <div class="meridian-core-item meridian-core-item--point"><span class="meridian-label">${esc(t('对应穴位'))}</span><strong class="meridian-value">${esc(record.acupoint)}</strong></div>
        <div class="meridian-core-item meridian-location"><span class="meridian-label">${esc(t('穴位位置'))}</span><p>${esc(record.location_short)}</p></div>
      </div>
      <div class="meridian-relations">
        <div class="meridian-relation"><span class="meridian-label">${esc(t('上卦'))}</span><strong class="meridian-relation-main">${esc(record.upper_trigram)} ${esc(record.upper_symbol)}</strong><span class="meridian-relation-sub">${esc(record.upper_attribute)} · ${esc(record.meridian)}</span></div>
        <div class="meridian-relation"><span class="meridian-label">${esc(t('下卦'))}</span><strong class="meridian-relation-main">${esc(record.lower_trigram)} ${esc(record.lower_symbol)}</strong><span class="meridian-relation-sub">${esc(record.lower_element)}</span></div>
        <div class="meridian-relation"><span class="meridian-label">${esc(t('五输穴'))}</span><strong class="meridian-relation-main">${esc(record.five_shu_type)}</strong></div>
        <div class="meridian-relation"><span class="meridian-label">${esc(t('最终定位'))}</span><strong class="meridian-relation-main">${esc(record.acupoint)}</strong></div>
      </div>
      <div class="meridian-explanation"><span class="meridian-label">${esc(t('说明'))}</span><p>${esc(record.explanation)}</p></div>
    </section>`;
  }
  if (lens === 'iching') {
    const hexagram = HEXAGRAM_DESCRIPTIONS[n];
    if (!hexagram) return `<p class="gate-detail-desc">${t('No I Ching reading available.')}</p>`;
    const lineHtml = lines.map(line => hexagram.lines?.[line]
      ? `<div class="${lineClass(line)}" data-line="${line}"><strong>${t('Line {line}', { line })}</strong><p>${esc(hexagram.lines[line])}</p></div>` : '').join('');
    return `<div class="gate-detail-keynote">${t('Hexagram {gate}', { gate: n })} · ${esc(hexagramName(n))}</div>
      <p class="gate-detail-desc">${esc(hexagram.meaning)}</p>
      <div class="gate-detail-lines">${lineHtml}</div>
      <p class="lens-note">${t('The I Ching hexagram this gate is built on — Ra drew Human Design from this classical source.')}</p>`;
  }
  if (lens === 'gk') {
    const gene = GENE_KEY_DESCRIPTIONS[n];
    if (!gene) return `<p class="gate-detail-desc">${t('No Gene Keys reading available.')}</p>`;
    return `<div class="gk-spectrum"><span class="gk-shadow">${esc(geneKeyTerm(n, 'shadow'))}</span><span class="gk-arrow">→</span><span class="gk-gift">${esc(geneKeyTerm(n, 'gift'))}</span><span class="gk-arrow">→</span><span class="gk-siddhi">${esc(geneKeyTerm(n, 'siddhi'))}</span></div>
      <p class="gate-detail-desc">${esc(gene.description)}</p>
      <p class="lens-note">${t("Gene Key {gate} · the Shadow → Gift → Siddhi spectrum (Richard Rudd's evolution of Human Design).", { gate: n })}</p>`;
  }
  const description = GATE_DESCRIPTIONS[n];
  const lineHtml = lines.map(line => {
    const item = LINE_DESCRIPTIONS[n]?.[line];
    return item ? `<div class="${lineClass(line)}" data-line="${line}"><strong>${t('Line {line}', { line })} · ${esc(item.keynote)}</strong><p>${esc(item.description)}</p></div>` : '';
  }).join('');
  return `${description ? `<div class="gate-detail-keynote">${esc(description.keynote)}</div><p class="gate-detail-desc">${esc(description.description)}</p>` : ''}
    <div class="gate-detail-lines">${lineHtml}</div>${renderGateLineNote()}`;
}

export function channelReading(id) {
  const channel = channelById(id);
  if (!channel) return '';
  const canonicalId = channel.gates.join('-');
  const description = CHANNEL_DESCRIPTIONS[canonicalId];
  const supplement = channelSupplement(canonicalId), labels = referenceSupplementLabels();
  const archetype = supplement?.designArchetype.match(/^(.*?)（(A Design.*?)）$/);
  const extra = supplement ? `<section class="channel-analysis"><div class="channel-analysis-label">${esc(labels.furtherReading)}</div>
    <div class="channel-archetype"><div class="channel-archetype-label">${esc(labels.designArchetype)}</div><strong>${esc(archetype ? archetype[1] : supplement.designArchetype)}</strong>${archetype ? `<span class="channel-archetype-english">${esc(archetype[2])}</span>` : ''}</div>
    <section class="channel-mechanism"><div class="channel-mechanism-label">${esc(labels.mechanism)}</div><p class="gate-detail-desc">${supplementText(supplement.mechanism)}</p></section>
    <div class="channel-state-grid">${['alignedState','notSelfShadow'].map(field => `<section class="channel-state"><div class="channel-state-label">${esc(labels[field])}</div><p class="gate-detail-desc">${supplementText(supplement[field])}</p></section>`).join('')}</div></section>` : '';
  return `${description?.description ? `<p class="gate-detail-desc transit-channel-description">${esc(contentText(description.description))}</p>` : ''}
    ${description?.whenDefined ? `<p class="gate-detail-desc">${esc(contentText(description.whenDefined))}</p>` : ''}${extra}`;
}

export function centerReading(id, { status = null, includeTheme = true } = {}) {
  const center = CENTERS[id];
  if (!center) return '';
  const supplement = centerSupplement(id);
  const readings = status ? [[status, center[`${status}Meaning`] || (status === 'defined' ? center.pressure : '')]]
    : [['defined', center.definedMeaning || center.pressure], ['undefined', center.undefinedMeaning], ['open', center.openMeaning]];
  return `${includeTheme ? `<p class="gate-detail-desc">${esc(contentText(center.theme || ''))}${center.biological ? ` · ${esc(contentText(center.biological))}` : ''}</p>` : ''}
    ${readings.map(([state, text]) => text ? `<div class="center-reading-state">${status ? '' : `<strong>${esc(t(({ defined: 'Defined', undefined: 'Undefined', open: 'Open' })[state]))}</strong>`}<p class="gate-detail-desc">${esc(contentText(text))}</p>${state === 'open' && supplement ? `<p class="gate-detail-desc">${esc(supplement.openSupplement)}</p>` : ''}</div>` : '').join('')}`;
}

// Shared insights stay outside the Center state-reading container.
export function centerInsights(id) {
  const supplement = centerSupplement(id), labels = referenceSupplementLabels();
  return supplement ? `<div class="center-insights">${['notSelf','wisdom'].map(field => `<section class="center-insight"><div class="center-insight-label">${esc(labels[field])}</div><p class="gate-detail-desc">${esc(supplement[field])}</p></section>`).join('')}</div>` : '';
}
