import { t } from './i18n.js';

const gateLenses = () => [
  ['hd', t('Human Design')],
  ['iching', t('I Ching')],
  ['gk', t('Gene Keys')],
  ['meridian', t('经络穴位')]
];

export function renderGateLensSwitch(selectedLens, dataAttribute) {
  return `<div class="lens-switch gate-lens-switch">${gateLenses()
    .map(([key, label]) => `<button type="button" ${dataAttribute}="${key}" class="${selectedLens === key ? 'active' : ''}">${label}</button>`)
    .join('')}</div>`;
}
