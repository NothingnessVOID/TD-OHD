import { t } from './i18n.js';
import { renderReadingLensSwitch } from './reading-lenses.js';
import './shared-detail-messages.js';

const gateLenses = () => [
  ['hd', t('Detail information')],
  ['iching', t('Six-line reading')],
  ['gk', t('Gene gifts')],
  ['meridian', t('经络穴位')]
];

// The four gate traditions, their `gate-lens-switch` wrapper and the legacy alias
// attributes are a host DOM contract (chart and library e2e selectors depend on them).
export function renderGateLensSwitch(selectedLens, dataAttribute, aliasAttribute = null) {
  const alias = ['data-lens', 'data-reference-lens'].includes(aliasAttribute) ? aliasAttribute : null;
  return renderReadingLensSwitch({
    className: 'gate-lens-switch',
    lenses: gateLenses(),
    selectedLens,
    dataAttribute,
    aliasAttribute: alias
  });
}
