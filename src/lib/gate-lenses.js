import { t } from './i18n.js';
import './shared-detail-messages.js';

const gateLenses = () => [
  ['hd', t('Detail information')],
  ['iching', t('Six-line reading')],
  ['gk', t('Gene gifts')],
  ['meridian', t('经络穴位')]
];

export function renderGateLensSwitch(selectedLens, dataAttribute, aliasAttribute = null) {
  const alias = ['data-lens', 'data-reference-lens'].includes(aliasAttribute) ? aliasAttribute : null;
  return `<div class="lens-switch gate-lens-switch">${gateLenses()
    .map(([key, label]) => `<button type="button" ${dataAttribute}="${key}"${alias ? ` ${alias}="${key}"` : ''} aria-pressed="${selectedLens === key}" class="${selectedLens === key ? 'active' : ''}">${label}</button>`)
    .join('')}</div>`;
}
