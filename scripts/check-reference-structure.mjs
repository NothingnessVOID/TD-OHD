/** Structural checks only. This does not certify the meaning of any prose. */
import { writeFile } from 'node:fs/promises';
import { GATES, CHANNELS, CENTERS, GATE_DESCRIPTIONS, LINE_DESCRIPTIONS,
  CHANNEL_DESCRIPTIONS, HEXAGRAM_DESCRIPTIONS, GENE_KEY_DESCRIPTIONS } from 'natalengine';
import * as zhCN from '../src/locales/zh-CN/content.js';
import * as zhHant from '../src/locales/zh-Hant/content.js';
import { referenceEntry } from '../src/lib/reference-catalog.js';
import { quarterForGate } from '../src/lib/quarter.js';

const issues = [];
const add = (id, detail) => issues.push({ id, detail });
const gateIds = Array.from({ length: 64 }, (_, index) => index + 1);
const centerIds = new Set(Object.keys(CENTERS));
const partners = new Map(gateIds.map(id => [id, new Set()]));
const channelIds = new Set();
if (centerIds.size !== 9) add('centers/count', centerIds.size);
if (Object.keys(GATES).length !== 64) add('gates/count', Object.keys(GATES).length);
if (CHANNELS.length !== 36) add('channels/count', CHANNELS.length);
for (const id of gateIds) {
  if (!GATES[id]) add(`gate/${id}`, 'missing');
  else if (!centerIds.has(GATES[id].center)) add(`gate/${id}/center`, GATES[id].center);
}
for (const channel of CHANNELS) {
  const id = channel.gates.join('-');
  if (channelIds.has(id)) add(`channel/${id}`, 'duplicate');
  channelIds.add(id);
  const [a, b] = channel.gates;
  if (channel.gates.length !== 2 || a === b || !GATES[a] || !GATES[b]) {
    add(`channel/${id}/gates`, channel.gates);
    continue;
  }
  partners.get(a)?.add(b); partners.get(b)?.add(a);
  if (JSON.stringify(channel.centers) !== JSON.stringify([GATES[a].center, GATES[b].center])) {
    add(`channel/${id}/centers`, channel.centers);
  }
  if (referenceEntry('channel', `${b}-${a}`)?.id !== id) add(`channel/${id}/reverse-alias`, 'missing');
}
for (const id of gateIds) {
  const harmonic = GATE_DESCRIPTIONS[id]?.harmonic;
  if (harmonic != null && !partners.get(id)?.has(harmonic)) add(`gate/${id}/harmonic`, harmonic);
  if (!partners.get(id)?.size) add(`gate/${id}/partners`, 'none');
}

const sources = { en: { GATE_DESCRIPTIONS, LINE_DESCRIPTIONS, CHANNEL_DESCRIPTIONS,
  HEXAGRAM_DESCRIPTIONS, GENE_KEY_DESCRIPTIONS }, 'zh-CN': zhCN, 'zh-Hant': zhHant };
const kinds = [
  ['gate', 'GATE_DESCRIPTIONS', gateIds.map(String)],
  ['line', 'LINE_DESCRIPTIONS', gateIds.flatMap(gate => Array.from({ length: 6 }, (_, index) => `${gate}.${index + 1}`))],
  ['channel', 'CHANNEL_DESCRIPTIONS', [...channelIds]],
  ['hexagram', 'HEXAGRAM_DESCRIPTIONS', gateIds.map(String)],
  ['gene-key', 'GENE_KEY_DESCRIPTIONS', gateIds.map(String)]
];
const get = (source, key, id) => key === 'LINE_DESCRIPTIONS'
  ? source[key]?.[id.split('.')[0]]?.[id.split('.')[1]] : source[key]?.[id];
let checkedFields = 0;
for (const [kind, key, ids] of kinds) for (const id of ids) {
  const english = get(sources.en, key, id);
  if (!english || typeof english !== 'object') { add(`en/${kind}/${id}`, 'missing'); continue; }
  for (const [locale, source] of Object.entries(sources)) {
    const value = get(source, key, id);
    if (!value || typeof value !== 'object') { add(`${locale}/${kind}/${id}`, 'missing'); continue; }
    for (const [field, raw] of Object.entries(english)) {
      checkedFields++;
      const translation = value[field];
      if (translation === undefined) add(`${locale}/${kind}/${id}/${field}`, 'missing field');
      else if (Array.isArray(raw) !== Array.isArray(translation) || typeof raw !== typeof translation) {
        add(`${locale}/${kind}/${id}/${field}`, 'type mismatch');
      } else if (typeof translation === 'string' && (!translation.trim() || translation.trim() === 'undefined')) {
        add(`${locale}/${kind}/${id}/${field}`, 'empty or undefined text');
      }
    }
  }
}
const report = { scope: 'structure-only', centers: centerIds.size, gates: Object.keys(GATES).length,
  channels: CHANNELS.length, multiPartnerGates: [...partners].filter(([, values]) => values.size > 1)
    .map(([id, values]) => ({ gate: id, partners: [...values].sort((a, b) => a - b) })),
  quarterMismatches: gateIds.filter(id => GATE_DESCRIPTIONS[id]?.quarter !== quarterForGate(id))
    .map(id => ({ gate: id, source: GATE_DESCRIPTIONS[id]?.quarter, corrected: quarterForGate(id) })),
  checkedFields, issues };
await writeFile(new URL('../docs/data-audit/structure.json', import.meta.url), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ checkedFields, issues: issues.length,
  multiPartnerGates: report.multiPartnerGates.length, quarterMismatches: report.quarterMismatches.length }));
if (issues.length) process.exitCode = 1;
