/** Portable observation format. No birth details are stored in a note by default. */
import { TIMELINE_RULE_VERSION } from '../features/transit-timeline/version.js';
export const OBSERVATION_FORMAT = 'td-ohd-observations-v1';
export const OBSERVATION_RULE_VERSION = TIMELINE_RULE_VERSION;
export const OBSERVATION_ENGINE_VERSION = 'natalengine-1.6.0';

const validIso = value => typeof value === 'string' && Number.isFinite(Date.parse(value))
  && new Date(value).toISOString() === value;
const text = (value, max) => {
  if (typeof value !== 'string' || value.length > max) throw new Error('Invalid observation text.');
  return value;
};
const id = value => {
  if (typeof value !== 'string' || !/^[\w-]{1,100}$/.test(value)) throw new Error('Invalid observation ID.');
  return value;
};
const date = value => {
  if (!validIso(value)) throw new Error('Invalid observation date.');
  return value;
};
const zone = value => {
  if (typeof value !== 'string' || value.length > 100) throw new Error('Invalid observation time zone.');
  try { new Intl.DateTimeFormat('en', { timeZone: value }); }
  catch { throw new Error('Invalid observation time zone.'); }
  return value;
};

export function normalizeObservation(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Invalid observation.');
  const snapshot = input.snapshot == null ? null : normalizeSnapshot(input.snapshot);
  const tags = input.tags || [];
  if (!Array.isArray(tags) || tags.length > 20) throw new Error('Invalid observation tags.');
  const result = {
    id: id(input.id),
    observedAt: date(input.observedAt),
    displayZone: zone(input.displayZone),
    personId: input.personId == null || input.personId === '' ? null : id(input.personId),
    alias: text(input.alias || '', 120).trim(),
    raw: text(input.raw || '', 10000),
    interpretation: text(input.interpretation || '', 10000),
    event: text(input.event || '', 10000),
    tags: [...new Set(tags.map(value => text(value, 60).trim()).filter(Boolean))],
    snapshot,
    createdAt: date(input.createdAt),
    updatedAt: date(input.updatedAt),
    restoredFrom: input.restoredFrom == null ? null : id(input.restoredFrom)
  };
  if (!result.raw.trim() && !result.interpretation.trim() && !result.event.trim()) throw new Error('Write an observation before saving.');
  return result;
}

export function normalizeSnapshot(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Invalid chart snapshot.');
  const activations = input.activations || {};
  if (typeof activations !== 'object' || Array.isArray(activations) || Object.keys(activations).length > 20) throw new Error('Invalid chart snapshot.');
  const cleanActivations = {};
  for (const [planet, value] of Object.entries(activations)) {
    if (!/^[a-zA-Z]{2,24}$/.test(planet) || !Number.isInteger(value?.gate) || value.gate < 1 || value.gate > 64
      || !Number.isInteger(value?.line) || value.line < 1 || value.line > 6) throw new Error('Invalid chart activation.');
    cleanActivations[planet] = { gate: value.gate, line: value.line };
  }
  const stringList = (value, max) => {
    if (!Array.isArray(value) || value.length > max || value.some(item => typeof item !== 'string' || item.length > 80)) throw new Error('Invalid chart snapshot.');
    return [...new Set(value)];
  };
  return {
    instantUtc: date(input.instantUtc), displayZone: zone(input.displayZone),
    mode: input.mode === 'transit-only' ? 'transit-only' : input.mode === 'overlay' ? 'overlay' : (() => { throw new Error('Invalid chart mode.'); })(),
    planetFilter: input.planetFilter == null ? 'all' : text(input.planetFilter, 20),
    activations: cleanActivations,
    activeGates: stringList(input.activeGates, 64),
    activeChannels: stringList(input.activeChannels, 36),
    definedCenters: stringList(input.definedCenters, 9),
    engineVersion: text(input.engineVersion, 80), ruleVersion: text(input.ruleVersion, 80)
  };
}

export function observationBackup(records, { anonymous = false, exportedAt = new Date().toISOString() } = {}) {
  return { format: OBSERVATION_FORMAT, exportedAt, anonymous,
    records: records.map(record => {
      const clean = normalizeObservation(record);
      return anonymous ? { ...clean, personId: null, alias: '', snapshot: null } : clean;
    }) };
}

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
export function previewObservationRestore(existing, backup) {
  if (backup?.format !== OBSERVATION_FORMAT || !Array.isArray(backup.records) || backup.records.length > 5000)
    throw new Error('Invalid observation backup.');
  const incoming = backup.records.map(normalizeObservation);
  if (new Set(incoming.map(item => item.id)).size !== incoming.length) throw new Error('Duplicate IDs in observation backup.');
  const current = new Map(existing.map(item => [item.id, normalizeObservation(item)]));
  const additions = [], conflicts = [], unchanged = [];
  for (const item of incoming) {
    const old = current.get(item.id);
    if (!old) additions.push(item);
    else if (same(old, item)) unchanged.push(item);
    else conflicts.push(item);
  }
  return { additions, conflicts, unchanged,
    counts: { add: additions.length, conflict: conflicts.length, unchanged: unchanged.length } };
}

export function restoreObservationRecords(existing, backup, makeId = () => crypto.randomUUID()) {
  const preview = previewObservationRestore(existing, backup);
  const used = new Set([...existing.map(item => item.id), ...backup.records.map(item => item.id)]);
  const additions = [...preview.additions];
  for (const record of preview.conflicts) {
    let next;
    do { next = id(makeId()); } while (used.has(next));
    used.add(next);
    additions.push({ ...record, id: next, restoredFrom: record.id });
  }
  return { ...preview, records: additions };
}
