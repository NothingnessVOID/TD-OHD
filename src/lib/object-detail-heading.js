/** Stateless headings shared by birth/transit charts and contextual readers.
 * Returns heading fragments; the host owns activation data, layout and navigation.
 */
import { GATES } from './human-design/catalog.js';
import { channelById } from './reference-content.js';
import { gateName, hexagramName, channelName } from './vocabulary.js';
import { renderChannelCircuitBadges } from './channel-badges.js';
import { t, getLocale } from './i18n.js';
import { esc } from './format.js';

export function renderGateDetailHeading(gate) {
  const id = Number(gate);
  if (!GATES[id]) return '';
  const zh = getLocale().startsWith('zh');
  return `<div class="detail-label">${esc(t('Gate {gate}', { gate: id }))}</div>
    <div class="detail-name">${esc(gateName(id))} <span class="detail-hexagram">${zh ? '（' : '('}${esc(hexagramName(id))}${zh ? '）' : ')'}</span></div>`;
}

export function renderChannelDetailHeading(id) {
  const channel = channelById(id);
  if (!channel) return '';
  return `<div class="detail-label">${esc(t('Channel {channel}', { channel: channel.gates.join('-') }))}</div>
    <div class="channel-detail-heading"><div class="detail-name">${esc(channelName(channel.gates))}</div>
      ${renderChannelCircuitBadges(channel)}</div>`;
}

/** Inner markup for .gate-detail-nav. Bind Back in the host or shared adapter. */
export function renderDetailNavigation({ canGoBack = false } = {}) {
  return `<span class="gate-detail-handle" aria-hidden="true"></span>
    <div class="gate-detail-nav-buttons">
      ${canGoBack ? `<button type="button" class="gate-detail-back" data-shared-back>← ${esc(t('Back'))}</button>` : '<span></span>'}
      <button type="button" class="gate-detail-close" title="${esc(t('Close'))}" aria-label="${esc(t('Close'))}">&times;</button>
    </div>`;
}
