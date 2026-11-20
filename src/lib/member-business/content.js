// Member business product copy, delivered verbatim as one locale-first JSON source.
// Shape: { [locale]: { careers, definitions, environments, steps, circuits, integrationChannels } }
// Rules: no prose lives in the analysis layer; a missing locale never falls back to another
// language, matching the organization reading content contract. Circuit group titles come from
// the shared vocabulary (circuitGroupName); this file only supplies that group's one-line body.
import source from './content.json' with { type: 'json' };

export const MB_CONTENT_LOCALES = Object.freeze(['zh-CN', 'zh-Hant', 'en']);
const text = value => (typeof value === 'string' && value.trim() ? value.trim() : null);
const read = (value, key) => value && typeof value === 'object' ? value[key] : undefined;

function entry(value, fields) {
  if (!value || typeof value !== 'object') return null;
  const record = Object.fromEntries(fields.map(field => [field, text(value[field])]));
  return Object.values(record).some(Boolean) ? record : null;
}

/** Whole locale table, or null when the locale has no delivered copy. */
export function readMemberBusinessContent(locale) {
  return MB_CONTENT_LOCALES.includes(locale) ? source[locale] ?? null : null;
}

export function careerCopy(careerId, locale) {
  return entry(read(readMemberBusinessContent(locale)?.careers, careerId), ['name', 'body']);
}

export function definitionCopy(definitionId, locale) {
  return entry(read(readMemberBusinessContent(locale)?.definitions, definitionId), ['name', 'body']);
}

export function environmentCopyName(environmentId, locale) {
  return text(read(readMemberBusinessContent(locale)?.environments, environmentId)?.name);
}

/** The OC16 step paragraph carries a collaboration note for tribal boundary channels. The note is
 *  split off so a person without those channels never receives it. */
const CAUTION_MARKERS = Object.freeze(['协作关注：', '協作關注：', 'Collaboration note:']);

export function stepCopy(kind, locale) {
  const raw = read(readMemberBusinessContent(locale)?.steps, kind);
  const name = text(raw?.name), body = text(raw?.body), noteField = text(raw?.note);
  if (!name && !body && !noteField) return null;
  // An explicit note field wins; otherwise a delivered body is split at the collaboration label.
  const marker = noteField ? null : CAUTION_MARKERS.find(token => body?.includes(token));
  if (marker) {
    const index = body.indexOf(marker);
    return { name, body: body.slice(0, index).trim(), note: body.slice(index).trim() };
  }
  return { name, body, note: noteField };
}

/** Circuit group body only: the group title stays in the shared vocabulary. */
export function circuitCopy(groupId, locale) {
  return entry(read(readMemberBusinessContent(locale)?.circuits, groupId), ['body']);
}

export function integrationChannelCopy(channelId, locale) {
  return entry(read(readMemberBusinessContent(locale)?.integrationChannels, channelId),
    ['name', 'intro', 'application']);
}
