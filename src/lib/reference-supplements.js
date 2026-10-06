/** User-approved TD-OHD-reference-incremental-restoration.md supplements.
 * Reference prose only; no topology or calculation data is changed.
 * zh-CN source, faithful Traditional conversion and complete English translation.
 */
import data from './reference-supplements.json' with { type: 'json' };
import { getLocale } from './i18n.js';
const localized = () => data[getLocale()];
export const referenceSupplementLabels = () => localized().labels;
export const centerSupplement = id => localized().centers[id] ?? null;
export const channelSupplement = id => localized().channels[id] ?? null;
export const circuitReference = id => localized().circuits[id] ?? '';
export const gateLineReadingNote = () => localized().gateLineNote;
