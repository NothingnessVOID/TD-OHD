/** Chart-independent reference index. The engine topology stays authoritative. */
import { GATES, CHANNELS, CENTERS } from './human-design/catalog.js';
import { localeResources } from '../locales/index.js';
import { getLocale } from './i18n.js';
import { listKnowledgeEntries } from './knowledge/registry.js';
import { gateName, channelName, centerName, circuitName, circuitGroupName, hexagramName, planetName } from './vocabulary.js';
import { PLANET_ORDER, PLANET_NAMES, ACTIVATION_CONCEPT_IDS, activationConceptName, activationConceptAliases } from './planet-reference.js';
import { channelById } from './reference-content.js';
import { CIRCUIT_GROUPS, channelCircuit } from './circuit-topology.js';

const groupIds = Object.keys(CIRCUIT_GROUPS);
const names = (field, ...args) => Object.values(localeResources).map(locale => locale.vocabulary[field](...args));
const normalized = value => String(value ?? '').normalize('NFKC').toLocaleLowerCase()
  .replace(/[‐‑‒–—―−]/g, '-').replace(/\s+/g, ' ').trim();

export function referenceEntries() {
  return [
    ...ACTIVATION_CONCEPT_IDS.map(id => ({ kind: 'concept', category: 'basic', id,
      name: activationConceptName(id, getLocale()), aliases: activationConceptAliases(id) })),
    ...listKnowledgeEntries({ includePenta: false }).filter(entry => entry.objectType !== 'cognition').map(entry => ({
      kind: 'knowledge', category: entry.objectType,
      id: entry.id, name: entry.name, summary: entry.summary?.content ?? '', hasDetail: entry.hasDetail,
      objectType: entry.objectType, objectId: entry.objectId, aliases: [entry.objectId, entry.id]
    })),
    ...Object.keys(CENTERS).map(id => ({ kind: 'center', id, name: centerName(id),
      aliases: [CENTERS[id].name, ...names('centerName', id)] })),
    ...CHANNELS.map(channel => ({ kind: 'channel', id: channel.gates.join('-'), name: channelName(channel.gates),
      aliases: [[...channel.gates].reverse().join('-'), channel.name, ...names('channelName', channel.gates)] })),
    ...Object.keys(GATES).map(Number).sort((a, b) => a - b).map(id => ({ kind: 'gate', id: String(id), name: gateName(id),
      aliases: [GATES[id].name, GATES[id].iching, hexagramName(id), ...names('gateName', id), ...names('hexagramName', id)] })),
    ...PLANET_ORDER.map(id => ({ kind: 'planet', id, name: planetName(id),
      aliases: [PLANET_NAMES[id], ...names('planetName', id)] })),
    ...groupIds.map(id => ({ kind: 'group', id, name: circuitGroupName(id), aliases: [
      ...names('circuitGroupName', id), ...names('circuitName', id)
    ] })),
    ...Object.values(CIRCUIT_GROUPS).flat().map(id => ({ kind: 'circuit', category: 'group', id,
      name: circuitName(id), aliases: names('circuitName', id) }))
  ];
}

export function referenceEntry(kind, id) {
  if (typeof id !== 'string' || !id) return null;
  let canonical = id;
  if (kind === 'channel') {
    if (!/^\d{1,2}-\d{1,2}$/.test(normalized(id))) return null;
    canonical = channelById(normalized(id))?.gates.join('-');
  }
  if (kind === 'gate' && !/^(?:[1-9]|[1-5]\d|6[0-4])$/.test(id)) return null;
  return referenceEntries().find(entry => entry.kind === kind && entry.id === canonical) || null;
}

export function searchReference(query, category = 'all') {
  const text = normalized(query);
  const tokens = text.split(' ').filter(Boolean);
  return referenceEntries().filter(entry => {
    if (category !== 'all' && category !== (entry.category ?? entry.kind) && category !== entry.kind) return false;
    if (!tokens.length) return true;
    const values = [entry.id, entry.name, entry.summary, ...entry.aliases].map(normalized);
    return tokens.every(token => values.some(value => value.includes(token)));
  });
}

export function circuitChannels(kind, id) {
  return CHANNELS.filter(channel => kind === 'group'
    ? channelCircuit(channel).group === id
    : channelCircuit(channel).circuit === id);
}
