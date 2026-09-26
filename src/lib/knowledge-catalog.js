/** Stable entity IDs, detached from any birth chart. Display names are looked
 * up through the existing locale provider at render/search time. */
import { GATES, CHANNELS, CENTERS } from 'natalengine';
import { gateName, hexagramName, centerName, channelName, circuitName, lineName } from './vocabulary.js';
import { t } from './i18n.js';
import { localeResources } from '../locales/index.js';

const groups = ['individual', 'collective', 'tribal'];
const circuits = [...new Set(CHANNELS.map(channel => channel.subcircuit))].filter(id => id !== 'integration');
const concepts = ['activation', 'type', 'strategy', 'authority', 'profile', 'definition', 'transit', 'penta'];
const aliases = (field, ...args) => Object.values(localeResources).map(locale => locale.vocabulary[field](...args));

export function knowledgeEntries() {
  return [
    ...Object.keys(CENTERS).map(id => ({ type: 'center', id, name: centerName(id), english: CENTERS[id].name,
      aliases: aliases('centerName', id) })),
    ...CHANNELS.map(channel => ({ type: 'channel', id: channel.gates.join('-'), name: channelName(channel.gates),
      english: channel.name, aliases: [...channel.gates.map(String), [...channel.gates].reverse().join('-'),
        ...aliases('channelName', channel.gates)] })),
    ...Object.keys(GATES).map(Number).sort((a,b) => a-b).map(id => ({ type: 'gate', id: String(id), name: gateName(id),
      english: GATES[id].name, aliases: [hexagramName(id), GATES[id].iching, GATES[id].theme,
        ...aliases('gateName', id), ...aliases('hexagramName', id)] })),
    ...Object.keys(GATES).map(Number).sort((a,b) => a-b).flatMap(gate => Array.from({length:6}, (_,i) => ({
      type: 'line', id: `${gate}.${i+1}`, name: `${gate}.${i+1} · ${lineName(i+1)}`,
      english: `${gate}.${i+1} · ${['Investigator','Hermit','Martyr','Opportunist','Heretic','Role Model'][i]}`,
      aliases: aliases('lineName', i+1)
    }))),
    ...groups.map(id => ({ type: 'circuit-group', id, name: circuitName(id), english: id,
      aliases: aliases('circuitName', id) })),
    ...circuits.map(id => ({ type: 'circuit', id, name: circuitName(id), english: id,
      aliases: aliases('circuitName', id) })),
    { type: 'network', id: 'integration', name: circuitName('integration'), english: 'Integration channels',
      aliases: aliases('circuitName', 'integration') },
    ...concepts.map(id => ({ type: 'concept', id, name: t(`concept:${id}`), english: id }))
  ];
}

export const knowledgeKey = (type, id) => `${type}/${id}`;
export function knowledgeEntry(type, id) {
  const canonical = type === 'channel' && /^\d+-\d+$/.test(id)
    ? CHANNELS.find(channel => channel.gates.join('-') === id || [...channel.gates].reverse().join('-') === id)?.gates.join('-')
    : id;
  return knowledgeEntries().find(entry => entry.type === type && entry.id === canonical) || null;
}

export function searchKnowledge(query, { type = 'all' } = {}) {
  const tokens = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  return knowledgeEntries().filter(entry => {
    if (type !== 'all' && type !== entry.type) return false;
    const haystack = [entry.id, entry.name, entry.english, ...(entry.aliases || [])].join(' ').toLocaleLowerCase();
    return tokens.every(token => haystack.includes(token));
  });
}

export function knowledgeCounts() {
  return knowledgeEntries().reduce((result, entry) => {
    result[entry.type] = (result[entry.type] || 0) + 1;
    return result;
  }, {});
}
