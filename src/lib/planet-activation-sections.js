/**
 * Activation rows for the planet detail card.
 *
 * A natal point has two real activations for the same planet: the Design side comes
 * from the design instant — the moment the Sun stood 88° of solar arc behind its
 * birth position (roughly 88 days earlier, but not a fixed calendar offset) — and the
 * Personality side from the birth moment. The detail shows both as separate rows,
 * each jumping to its own source-tagged gate record. A transit point is only the
 * temporary activation of that moment and never borrows the natal pair.
 *
 * Pure rendering only: entries are read from the chart (or the transit snapshot)
 * as-is, so gate/line/color/tone/base and source identity stay with the
 * existing calculation.
 */
import { t, formatDisplay } from './i18n.js';
import { esc } from './format.js';
import { hexagramName } from './vocabulary.js';

const NATAL_SIDES = ['design', 'personality'];
const SOURCE_LABELS = { design: 'Design', personality: 'Personality', transit: 'Transit' };

const hasGate = value => Boolean(value && value.gate && value.line);

/**
 * Which activations one planet detail must show.
 * @param {{source?: string, planet?: string, activation?: object|null, chart?: object|null, transitGates?: object|null}} options
 * @returns {Array<{source: string, planet: string, activation: object}>}
 */
export function planetActivationEntries({ source, planet, activation = null, chart = null, transitGates = null } = {}) {
  if (!planet) return [];
  if (source === 'transit') {
    const value = transitGates?.[planet] || activation;
    return hasGate(value) ? [{ source: 'transit', planet, activation: value }] : [];
  }
  if (!NATAL_SIDES.includes(source)) return [];
  // Design first, Personality second: the same stable order as the natal columns.
  return NATAL_SIDES.flatMap(side => {
    const value = chart?.gates?.[side]?.[planet];
    return hasGate(value) ? [{ source: side, planet, activation: value }] : [];
  });
}

function gateLine(activation) {
  return formatDisplay('planetGateLine', activation.gate, hexagramName(activation.gate), activation.line);
}

/** The color/tone/base substructure (6/6/5 layers), only when all three exist as numbers. */
function substructure(activation) {
  if (!['color', 'tone', 'base'].every(key => Number.isFinite(activation[key]))) return '';
  const values = [activation.color, activation.tone, activation.base];
  const labels = t('Color {color} · Tone {tone} · Base {base}', { color: '', tone: '', base: '' }).split('·');
  return `<dl class="planet-detail-substructure">${labels.map((label, index) => `<div class="planet-detail-substructure-item"><dt>${esc(label.trim())}</dt><dd>${esc(values[index])}</dd></div>`).join('')}</dl>`;
}

/** One `.planet-activation` section per entry, reusing the existing row/nav markup. */
export function renderPlanetActivationSections(entries = []) {
  return entries.map(({ source, activation }) => {
    const sourceLabel = t(SOURCE_LABELS[source]);
    const label = source === 'transit' ? t('Current activation') : sourceLabel;
    const line = gateLine(activation);
    return `<section class="planet-activation" data-planet-activation data-planet-source="${esc(source)}">
      <div class="planet-activation-label">${esc(label)}</div>
      <button type="button" class="transit-detail-link planet-detail-gate" data-planet-gate="${esc(activation.gate)}" data-planet-source="${esc(source)}"
        aria-label="${esc(`${sourceLabel} · ${line}`)}">
        <strong>${esc(line)}</strong>
        <span class="transit-detail-action">${esc(t('View gate details'))}<span aria-hidden="true"> ↗</span></span>
      </button>${substructure(activation)}</section>`;
  }).join('');
}
