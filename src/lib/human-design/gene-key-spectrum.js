import { GENE_KEY_DESCRIPTIONS } from './english-readings.js';
import { GENE_KEY_SPECTRUM } from './catalog.js';

/** Canonical English keywords match the existing Lens/UI. Legacy catalog is fallback only. */
export function geneKeySpectrum(gate) {
  const reading = GENE_KEY_DESCRIPTIONS[gate];
  const fallback = GENE_KEY_SPECTRUM[gate];
  return ['shadow', 'gift', 'siddhi'].map((field, index) => reading?.[field] || fallback?.[index] || ['Shadow', 'Gift', 'Siddhi'][index]);
}
