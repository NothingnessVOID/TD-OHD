/**
 * Organization-only integrated body copy (Issue 57).
 *
 * Deliberately separate from:
 * - content-data.json — the frozen BG5 Wa catalog (shared channel knowledge, reviewed elsewhere);
 * - the department-positioning copy registered in org-role-readings.js.
 *
 * The delivery shape from the content author is locale-first:
 *   { 'zh-CN': { channels:[{id,name,departmentId,centralAxis,intro,application,organizationRole?,source,role?}],
 *                gates:[{gate,role,context,intro,application,source}] }, 'zh-Hant': …, en: … }
 * `name` is the textbook channel title ("个人36种商业优势/技能") and is the organization page's only
 * channel name; it never feeds the shared vocabulary used by the other pages.
 * Each locale module below exports the same prose keyed by channel id / gate number.
 * `source`, `notes`, `departmentId` and `centralAxis` are provenance/routing metadata for the
 * maintainer and are intentionally not stored or rendered: the catalog owns department and axis identity.
 *
 * Rendering combines intro → application → organizationRole as continuous paragraphs, and
 * intro + application as one gate body. No "official / plain / source" labels exist in the UI.
 */
import zhCN from './org-reading-content.zh-CN.js';
import zhHant from './org-reading-content.zh-Hant.js';
import en from './org-reading-content.en.js';

const SUPPORTED_LOCALES = Object.freeze(['zh-CN', 'zh-Hant', 'en']);
/** Locale → delivered content. Locales without a module read as absent and fall back upstream. */
const SOURCES = Object.freeze({ 'zh-CN': zhCN, 'zh-Hant': zhHant, en });

const isPlainObject = value => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const text = value => typeof value === 'string' && value.trim() ? value.trim() : null;

/** Keep only presentable prose; metadata never reaches the DOM. */
function normalizeEntry(entry, { withRole = false } = {}) {
  if (!isPlainObject(entry)) return null;
  const intro = text(entry.intro);
  const application = text(entry.application);
  const organizationRole = text(entry.organizationRole);
  const role = withRole ? text(entry.role) : null;
  if (!intro && !application && !organizationRole && !role) return null;
  return { intro, application, organizationRole, role };
}

function indexSource(source) {
  const channels = {}, gates = {}, names = {};
  const channelEntries = Array.isArray(source?.channels) ? source.channels
    : Object.entries(source?.channels ?? {}).map(([id, entry]) => ({ ...entry, id }));
  const gateEntries = Array.isArray(source?.gates) ? source.gates
    : Object.entries(source?.gates ?? {}).map(([gate, entry]) => ({ ...entry, gate }));
  for (const entry of channelEntries) {
    const key = text(entry?.id);
    if (key && !channels[key]) {
      channels[key] = normalizeEntry(entry, { withRole: true });
      const name = text(entry?.name);
      if (name) names[key] = name;
    }
  }
  for (const entry of gateEntries) {
    const gate = Number(entry?.gate);
    if (Number.isInteger(gate) && !gates[gate]) gates[gate] = normalizeEntry(entry, { withRole: true });
  }
  return { channels, gates, names };
}

const TABLES = Object.fromEntries(SUPPORTED_LOCALES.map(locale => [locale,
  SOURCES[locale] ? indexSource(SOURCES[locale]) : { channels: {}, gates: {}, names: {} }]));

const deepFreeze = value => {
  if (value && typeof value === 'object') {
    for (const child of Object.values(value)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
};

/** Read-only, locale-indexed tables; frozen so presentation code cannot mutate the copy. */
export const ORG_READING_CONTENT = deepFreeze({
  channels: Object.fromEntries(Object.entries(TABLES).map(([locale, table]) => [locale, table.channels])),
  gates: Object.fromEntries(Object.entries(TABLES).map(([locale, table]) => [locale, table.gates])),
  names: Object.fromEntries(Object.entries(TABLES).map(([locale, table]) => [locale, table.names]))
});

export const ORG_READING_LOCALES = SUPPORTED_LOCALES;
export const ORG_READING_AVAILABLE_LOCALES = Object.freeze(Object.keys(SOURCES));

export function readOrgChannelBody(channelId, locale) {
  if (!SUPPORTED_LOCALES.includes(locale)) return null;
  return ORG_READING_CONTENT.channels[locale]?.[channelId] ?? null;
}

export function readOrgGateBody(gate, locale) {
  if (!SUPPORTED_LOCALES.includes(locale)) return null;
  return ORG_READING_CONTENT.gates[locale]?.[String(Number(gate))] ?? null;
}

/** Textbook channel title for the organization page only; null when the locale has no title. */
export function readOrgChannelName(channelId, locale) {
  if (!SUPPORTED_LOCALES.includes(locale)) return null;
  return ORG_READING_CONTENT.names[locale]?.[channelId] ?? null;
}
