/** Chart-independent reference index. The engine topology stays authoritative. */
import { GATES, CHANNELS, CENTERS } from 'natalengine';
import { localeResources } from '../locales/index.js';
import { gateName, channelName, centerName, circuitName, hexagramName } from './vocabulary.js';
import { channelById } from './reference-content.js';

const groupIds = ['individual', 'collective', 'tribal'];
const circuitIds = [...new Set(CHANNELS.map(channel => channel.subcircuit))]
  .filter(id => id && id !== 'integration');
const names = (field, ...args) => Object.values(localeResources).map(locale => locale.vocabulary[field](...args));
const normalized = value => String(value ?? '').normalize('NFKC').toLocaleLowerCase()
  .replace(/[‐‑‒–—―−]/g, '-').replace(/\s+/g, ' ').trim();

export function referenceEntries() {
  return [
    ...Object.keys(CENTERS).map(id => ({ kind: 'center', id, name: centerName(id),
      aliases: [CENTERS[id].name, ...names('centerName', id)] })),
    ...CHANNELS.map(channel => ({ kind: 'channel', id: channel.gates.join('-'), name: channelName(channel.gates),
      aliases: [[...channel.gates].reverse().join('-'), channel.name, ...names('channelName', channel.gates)] })),
    ...Object.keys(GATES).map(Number).sort((a, b) => a - b).map(id => ({ kind: 'gate', id: String(id), name: gateName(id),
      aliases: [GATES[id].name, GATES[id].iching, hexagramName(id), ...names('gateName', id), ...names('hexagramName', id)] })),
    ...groupIds.map(id => ({ kind: 'group', id, name: circuitName(id), aliases: names('circuitName', id) })),
    ...circuitIds.map(id => ({ kind: 'circuit', id, name: circuitName(id), aliases: names('circuitName', id) }))
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
  const lineMatch = /^(?:[1-9]|[1-5]\d|6[0-4])\.[1-6]$/.exec(text);
  if (lineMatch && (category === 'all' || category === 'gate')) {
    const [gate, line] = text.split('.').map(Number);
    return [{ ...referenceEntry('gate', String(gate)), line }];
  }
  const tokens = text.split(' ').filter(Boolean);
  return referenceEntries().filter(entry => {
    if (category !== 'all' && category !== entry.kind && !(category === 'circuit' && entry.kind === 'group')) return false;
    if (!tokens.length) return true;
    const values = [entry.id, entry.name, ...entry.aliases].map(normalized);
    return tokens.every(token => values.some(value => value.includes(token)));
  });
}

export function circuitChannels(kind, id) {
  return CHANNELS.filter(channel => kind === 'group'
    ? channel.circuit === id || (id === 'individual' && channel.circuit === 'integration')
    : channel.subcircuit === id);
}
