/** Static reference prose shared by the chart detail sheet and library. */
import { CHANNELS, CENTERS } from 'natalengine';
import { GATE_DESCRIPTIONS, LINE_DESCRIPTIONS, CHANNEL_DESCRIPTIONS,
  HEXAGRAM_DESCRIPTIONS, GENE_KEY_DESCRIPTIONS, contentText, geneKeyTerm } from './content.js';
import { t } from './i18n.js';
import { esc } from './format.js';
import { hexagramName } from './vocabulary.js';

export const channelsForGate = gate => CHANNELS.filter(channel => channel.gates.includes(Number(gate)));
export const channelsForCenter = center => CHANNELS.filter(channel => channel.centers.includes(center));
export const channelById = id => CHANNELS.find(channel => channel.gates.join('-') === id || [...channel.gates].reverse().join('-') === id);

export function gateReading(gate, lens = 'hd', { selectedLine = null, activeLines = [] } = {}) {
  const n = Number(gate);
  if (!Number.isInteger(n) || n < 1 || n > 64) return '';
  const lines = Array.from({ length: 6 }, (_, i) => i + 1)
    .filter(line => selectedLine == null || selectedLine === line);
  const lineClass = line => `gate-detail-line${activeLines.includes(line) || selectedLine === line ? ' current-line' : ''}`;
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
    <div class="gate-detail-lines">${lineHtml}</div>`;
}

export function channelReading(id) {
  const channel = channelById(id);
  if (!channel) return '';
  const description = CHANNEL_DESCRIPTIONS[channel.gates.join('-')];
  return `${description?.description ? `<p class="gate-detail-desc transit-channel-description">${esc(contentText(description.description))}</p>` : ''}
    ${description?.whenDefined ? `<p class="gate-detail-desc">${esc(contentText(description.whenDefined))}</p>` : ''}`;
}

export function centerReading(id, { status = null, includeTheme = true } = {}) {
  const center = CENTERS[id];
  if (!center) return '';
  const readings = status ? [[status, center[`${status}Meaning`] || (status === 'defined' ? center.pressure : '')]]
    : [['defined', center.definedMeaning || center.pressure], ['undefined', center.undefinedMeaning], ['open', center.openMeaning]];
  return `${includeTheme ? `<p class="gate-detail-desc">${esc(contentText(center.theme || ''))}${center.biological ? ` · ${esc(contentText(center.biological))}` : ''}</p>` : ''}
    ${readings.map(([, text]) => text ? `<p class="gate-detail-desc">${esc(contentText(text))}</p>` : '').join('')}`;
}
