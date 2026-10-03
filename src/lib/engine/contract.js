/** Browser-safe shared contract. No astronomy runtime or provider is imported here. */
import { transitInstants } from '../transit-time.js';
export const ENGINE_IDS = Object.freeze(['modern', 'jovian-compatible']);
export const ENGINE_CONTRACT_VERSION = 'chart-engine-v1';
export const BODY_ORDER = Object.freeze(['sun', 'earth', 'moon', 'northNode', 'southNode', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto']);
const PRECISIONS = ['minute', 'second', 'millisecond', 'unknown'];

function calendarDate(date) {
  const ms = /^\d{4}-\d{2}-\d{2}$/.test(date ?? '') && Date.parse(date + 'T00:00:00Z');
  if (ms === false || !Number.isFinite(ms) || new Date(ms).toISOString().slice(0, 10) !== date) throw new RangeError('Invalid birth date');
}

export function normalizeChartInput(input) {
  if (typeof input === 'string') input = { utc: input };
  if (!input || typeof input !== 'object') throw new RangeError('Provide a ChartInput');
  const sourceUtc = input.utc ?? input.birthUtc;
  const location = input.location ?? null;
  const locationZone = typeof location === 'object' && (location?.timeZone ?? location?.iana);
  const timeZone = input.timeZone ?? locationZone;
  const timeUnknown = Boolean(input.timeUnknown);
  let utc, birthDate, birthTime, timezone, inferredPrecision;
  if (sourceUtc) {
    if (typeof sourceUtc !== 'string' || !/(?:Z|[+-]\d{2}:\d{2})$/.test(sourceUtc)) throw new RangeError('UTC input requires an explicit zone');
    calendarDate(/^\d{4}-\d{2}-\d{2}/.exec(sourceUtc)?.[0]);
    const instant = Date.parse(sourceUtc);
    if (!Number.isFinite(instant)) throw new RangeError('Invalid birth instant');
    utc = new Date(instant).toISOString();
    birthDate = utc.slice(0, 10); birthTime = utc.slice(11, 19); timezone = 0;
    inferredPrecision = /\.\d+/.test(sourceUtc) ? 'millisecond' : /:\d{2}:\d{2}/.test(sourceUtc) ? 'second' : 'minute';
  } else {
    birthDate = input.birthDate ?? input.date;
    birthTime = timeUnknown ? '12:00' : input.birthTime ?? input.time;
    calendarDate(birthDate);
    if (!/^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(birthTime ?? '')) throw new RangeError('Invalid local birth date/time');
    const wall = Date.parse(`${birthDate}T${birthTime.length === 5 ? birthTime + ':00' : birthTime}Z`);
    let instant;
    if (timeZone) {
      const matches = transitInstants(birthDate, birthTime, timeZone);
      if (!matches.length) throw new RangeError('Local time is in a DST gap');
      const selection = input.fold ?? 0;
      if (![0, 1].includes(selection) || !matches[selection]) throw new RangeError('Invalid DST fold');
      ({ instant, offset: timezone } = matches[selection]);
    } else {
      timezone = input.timezone ?? input.offset;
      if (!Number.isFinite(timezone) || Math.abs(timezone) > 24) throw new RangeError('Provide IANA timeZone or numeric timezone hours');
      instant = wall - timezone * 3_600_000;
    }
    utc = new Date(instant).toISOString();
    inferredPrecision = birthTime.length === 5 ? 'minute' : 'second';
  }
  const precision = input.precision ?? (timeUnknown ? 'unknown' : inferredPrecision);
  if (!PRECISIONS.includes(precision)) throw new RangeError('Unsupported input precision');
  // Preserve a resolved civil display context when reusing normalized input.
  if (sourceUtc && input.birthDate && input.birthTime && Number.isFinite(input.timezone)) {
    calendarDate(input.birthDate);
    if (!/^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(input.birthTime)) throw new RangeError('Invalid local birth date/time');
    const clock = input.birthTime.length === 5 ? input.birthTime + ':00' : input.birthTime;
    const resolved = Date.parse(`${input.birthDate}T${clock}Z`) - input.timezone * 3_600_000;
    if (Math.abs(resolved - Date.parse(utc)) >= 1000) throw new RangeError('Civil context disagrees with absolute UTC');
    birthDate = input.birthDate; birthTime = input.birthTime; timezone = input.timezone;
  }
  // Precision is provenance metadata: never truncate or adjust the resolved UTC.
  return { utc, birthDate, birthTime, timezone, ...(timeZone ? { timeZone } : {}), precision, timeUnknown, location };
}

export function validateEngineIdentity(identity, engineId) {
  if (!ENGINE_IDS.includes(engineId)) throw new RangeError(`Unknown engine: ${engineId}`);
  if (identity?.id !== engineId || typeof identity.engineSignature !== 'string' || !identity.engineSignature) throw new TypeError('Engine identity requires matching id and engineSignature');
  return identity;
}

/** Cache design only. No cache is created; include presentation input context too. */
export function engineCacheKey(identity, input) {
  validateEngineIdentity(identity, identity?.id);
  const birth = normalizeChartInput(input);
  return JSON.stringify([ENGINE_CONTRACT_VERSION, identity.id, identity.engineSignature, birth.utc,
    birth.birthDate, birth.birthTime, birth.timezone, birth.timeZone ?? null, birth.precision, birth.timeUnknown, birth.location]);
}

export function createChartResult(value, input, engineId) {
  const { raw, chart, engineIdentity } = value;
  validateEngineIdentity(engineIdentity, engineId);
  for (const side of ['personality', 'design']) {
    const activations = raw?.[side];
    if (!activations || Object.keys(activations).length !== 13) throw new TypeError(`Expected 13 ${side} activations`);
    for (const body of BODY_ORDER) {
      const a = activations[body];
      if (!a || !Number.isFinite(a.longitude)) throw new TypeError(`Missing ${side}.${body} longitude`);
      for (const [field, maximum] of [['gate', 64], ['line', 6], ['color', 6], ['tone', 6], ['base', 5]]) {
        if (!Number.isInteger(a[field]) || a[field] < 1 || a[field] > maximum) throw new TypeError(`Invalid ${side}.${body}.${field}`);
      }
    }
  }
  for (const key of ['type', 'authority', 'definition', 'profile', 'incarnationCross']) {
    if (typeof raw[key] !== 'string' || !raw[key]) throw new TypeError(`Missing chart ${key}`);
  }
  if (!Array.isArray(raw.channels) || !raw.centers || typeof chart?.type?.strategy !== 'string') throw new TypeError('Missing channels, centers or strategy');
  // Keep legacy raw/chart consumers intact. Strategy is existing presentation metadata.
  return { ...value, input, engineId, contractVersion: ENGINE_CONTRACT_VERSION };
}
