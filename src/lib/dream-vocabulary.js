/**
 * DreamRave (sleep chart) display vocabulary accessor.
 *
 * Mirrors lib/vocabulary.js: views ask for a stable ID and the active locale
 * provider owns the wording. The sleep design shares gate, channel and centre
 * IDs with the waking chart, so only the dream-specific names and readings live
 * here; centre, planet and channel names keep coming from the shared vocabulary.
 *
 * Two kinds of function live below, and the difference matters:
 *  - `dreamGateName` … `dreamTypeName` always answer, because a name has to be on
 *    screen. They fall back to a generated label.
 *  - The *Reading accessors answer `null` when the source material does not cover
 *    the object. A null is not an error: the consumers render nothing rather than
 *    invent a paragraph (AGENTS.md §5 keeps the source single and honest).
 *
 * `dreamChannelName(gates)` takes the same argument shape as `channelName()`:
 * an array of gate numbers (`channel.gates`) or a `"a-b"` string. It does not
 * touch `channelName()` itself, which stays the waking catalogue's name for every
 * other page.
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
/** Sleep type: reflector, generator, projector, manifestor, manifestingGenerator. */
export const dreamTypeName = dream('dreamTypeName');

/** Reading of a sleep type, or null. Fields are mechanical/condition/contrast/operating/phenomenon. */
export const dreamTypeReading = dream('dreamTypeReading');
/** Reading of one dream gate, or null. */
export const dreamGateReading = dream('dreamGateReading');
/**
 * Sleep-design name of a dream channel, or null for a channel that is not one of
 * the six.
 *
 * The argument is normalised to the stable `<low>-<high>` key the locale data
 * uses, so a caller passing `[8, 1]`, `'1-8'` or `[1, 8]` gets the same answer.
 */
export const dreamChannelName = gates => {
  const pair = Array.isArray(gates) ? gates.map(Number) : String(gates).split('-').map(Number);
  if (pair.length !== 2 || pair.some(value => !Number.isInteger(value))) return null;
  return dream('dreamChannelName')(pair.sort((a, b) => a - b).join('-'));
};
/** Reading of a dream channel: { dream, fixed, conditioning, residue }, or null. */
export const dreamChannelReading = dream('dreamChannelReading');
/** The shared fixed-vs-conditioning rule of the channel teaching: 'fixed' or 'conditioning'. */
export const dreamChannelDefinition = dream('dreamChannelDefinition');
/** Portal reading: { target, night, morning }, or null for a non-portal gate. */
export const dreamPortalReading = dream('dreamPortalReading');
/** The night force of one line: { waking, dream, residue }, or null. */
export const dreamLineReading = dream('dreamLineReading');
/** Planet reading: { role, mechanics, dream, residue }, or null. Keyed by engine planet id. */
export const dreamPlanetReading = dream('dreamPlanetReading');
/** Page frame: what the red (design) or black (personality) half means in a dream. */
export const dreamSideMeaning = dream('dreamSideMeaning');
/** Page frame: 'natal' (fixed state) or 'external' (transits and partner as weather). */
export const dreamConditioning = dream('dreamConditioning');
