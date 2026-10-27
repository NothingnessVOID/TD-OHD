/**
 * DreamRave (sleep chart) display vocabulary accessor.
 *
 * Mirrors lib/vocabulary.js: views ask for a stable ID and the active locale
 * provider owns the wording. The sleep design shares gate, channel and centre
 * IDs with the waking chart, so only the dream-specific names live here; centre,
 * planet and channel names keep coming from the shared vocabulary.
 */
import { getLocaleResources } from './i18n.js';
import { localeResources } from '../locales/index.js';

const dream = field => (...args) =>
  (getLocaleResources().vocabulary[field] || localeResources.en.vocabulary[field])(...args);

/** Sleep-design name of one of the fifteen dream gates. */
export const dreamGateName = dream('dreamGateName');
/** Sleep-design theme of a line (1-6); applies to every dream gate. */
export const dreamLineTheme = dream('dreamLineTheme');
/** Name of one of the three night fields: light, earth, demon. */
export const dreamRealmName = dream('dreamRealmName');
/** Sleep type: generator, projector or reflector. */
export const dreamTypeName = dream('dreamTypeName');
