import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { getKnowledgeEntry, getKnowledgeSummary, getKnowledgeDetail, getKnowledgeEntryById, listKnowledgeEntries } from '../src/lib/knowledge/registry.js';
import { pentaRecords } from '../src/lib/knowledge/penta-foundation.js';
import { PENTA_GATES, PENTA_CHANNELS } from '../src/lib/human-design/penta-catalog.js';
import { SOURCES } from '../src/lib/knowledge/sources.js';
import { setLocale, getLocale } from '../src/lib/i18n.js';
import { referenceEntries } from '../src/lib/reference-catalog.js';
const q = objectId => ({domain:'human-design',objectType:'penta',objectId});

test('Penta has 21 stable, distinct identities, with source evidence and no fabricated gate interpretation', () => {
  assert.equal(pentaRecords.length,21);
  assert.equal(new Set(pentaRecords.map(r=>r.id)).size,21);
  for (const gate of PENTA_GATES) {
    const entry=getKnowledgeEntry(q(`gate:${gate.gate}`));
    assert.equal(entry.id,`hd.penta.gate.${gate.gate}`);
    assert.equal(entry.properties.gate,gate.gate);
    assert.equal(entry.properties.interpretationStatus,'missing');
    assert.equal(entry.detail,null);
    assert.equal(entry.detailStatus,'missing');
    assert.equal(entry.properties.evidence.status,'verified');
    assert.deepEqual(entry.properties.evidence.sourceIds,['B2']);
    assert.equal(SOURCES[entry.summary.sourceId].reserved,undefined);
    assert.equal(getKnowledgeDetail(q(`gate:${gate.gate}`)),null);
    assert.equal(getKnowledgeEntry({domain:'human-design',objectType:'gate',objectId:String(gate.gate)}),null);
  }
  for (const channel of PENTA_CHANNELS) {
    const entry=getKnowledgeEntry(q(`channel:${channel.channelId}`));
    assert.equal(entry.id,`hd.penta.channel.${channel.channelId}`);
    assert.deepEqual(entry.properties.gates,channel.gates);
    assert.equal(entry.summary.sourceId,entry.detail.sourceId);
    assert.equal(entry.summary.version,entry.detail.version);
    assert.deepEqual(entry.properties.evidence.sourceIds,['B2']);
    assert.ok(entry.detail.content.includes(channel.gates.join('–')));
    assert.equal(getKnowledgeEntry({domain:'human-design',objectType:'channel',objectId:channel.channelId}),null);
  }
  for (const id of ['introduction','powerColumn','contexts']) {
    const entry=getKnowledgeEntry(q(id));
    assert.ok(entry.summary?.content);
    assert.ok(entry.detail?.content);
    assert.equal(getKnowledgeEntryById(entry.id).id,entry.id);
    assert.equal(entry.summary.sourceId,entry.detail.sourceId);
  }
  assert.ok(pentaRecords.every(record=>record.properties().unresolved.includes('gapFormula')));
});

test('locale content stays independent, and missing local slot never borrows another language or detail', () => {
  const original=getLocale();
  try {
    const results=[];
    for (const locale of ['en','zh-CN','zh-Hant']) {
      setLocale(locale,{persist:false});
      const summary=getKnowledgeSummary(q('introduction'));
      results.push(summary.content);
      assert.equal(summary.locale,locale);
      assert.equal(getKnowledgeDetail(q('gate:31')),null);
      assert.equal(getKnowledgeEntry(q('gate:31')).hasDetail,false);
    }
    assert.equal(new Set(results).size,3);
  } finally { setLocale(original,{persist:false}); }
});

test('ordinary reference inventory and categories remain separate from Penta', () => {
  assert.equal(listKnowledgeEntries().filter(e=>e.objectType==='penta').length,21);
  const catalog=referenceEntries();
  assert.equal(catalog.filter(e=>e.kind==='gate').length,64);
  assert.equal(catalog.filter(e=>e.kind==='channel').length,36);
  assert.equal(catalog.filter(e=>e.kind==='knowledge').length,64); // 70 foundation records minus six cognition entries.
  assert.ok(catalog.every(e=>!String(e.id).startsWith('hd.penta.')));
  assert.equal(listKnowledgeEntries({includePenta:false}).length,70);
  const view=readFileSync(new URL('../src/views/penta-matrix.js',import.meta.url),'utf8');
  assert.match(view,/getKnowledgeDetail\(query\)/);
  assert.match(view,/knowledgeSections\(`gate:\$\{gate\.gate\}`\)/);
  assert.match(view,/knowledgeSections\(`channel:\$\{ch\.channelId\}`\)/);
  const home=readFileSync(new URL('../src/views/chart.js',import.meta.url),'utf8');
  assert.doesNotMatch(home,/penta-foundation|pentaContent/);
});
