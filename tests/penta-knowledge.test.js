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

test('Penta preserves 21 stable identities and adds nine attributed editorial topics', () => {
  assert.equal(pentaRecords.length,30);
  assert.equal(new Set(pentaRecords.map(r=>r.id)).size,30);
  for (const gate of PENTA_GATES) {
    const entry=getKnowledgeEntry(q(`gate:${gate.gate}`));
    assert.equal(entry.id,`hd.penta.gate.${gate.gate}`);
    assert.equal(entry.properties.gate,gate.gate);
    assert.equal(entry.properties.interpretationStatus,'editorial-reviewed');
    assert.ok(entry.summary.content);
    assert.equal(entry.summaryStatus,'available');
    assert.equal(getKnowledgeSummary(q(`gate:${gate.gate}`)).content,entry.summary.content);
    assert.ok(entry.detail.content);
    assert.equal(entry.detailStatus,'available');
    assert.equal(entry.properties.evidence.status,'editorial-reviewed');
    assert.equal(entry.properties.structuralEvidence.status,'verified');
    assert.deepEqual(entry.properties.structuralEvidence.sourceIds,['B2']);
    assert.equal(SOURCES[entry.provenance.name.sourceId].reserved,undefined);
    assert.equal(getKnowledgeDetail(q(`gate:${gate.gate}`)).content,entry.detail.content);
    assert.equal(getKnowledgeEntry({domain:'human-design',objectType:'gate',objectId:String(gate.gate)}),null);
  }
  for (const channel of PENTA_CHANNELS) {
    const entry=getKnowledgeEntry(q(`channel:${channel.channelId}`));
    assert.equal(entry.id,`hd.penta.channel.${channel.channelId}`);
    assert.deepEqual(entry.properties.gates,channel.gates);
    assert.equal(entry.summary.sourceId,'penta-wa-development-v2');
    assert.ok(entry.summary.content);
    assert.ok(entry.detail.content);
    assert.equal(entry.detailStatus,'available');
    assert.equal(entry.properties.interpretationStatus,'editorial-reviewed');
    assert.equal(getKnowledgeDetail(q(`channel:${channel.channelId}`)).content,entry.detail.content);
    assert.deepEqual(entry.properties.structuralEvidence.sourceIds,['B2']);
    assert.ok(entry.name.includes(channel.gates.join('–')));
    assert.equal(getKnowledgeEntry({domain:'human-design',objectType:'channel',objectId:channel.channelId}),null);
  }
  for (const id of ['introduction','powerColumn','contexts']) {
    const entry=getKnowledgeEntry(q(id));
    assert.ok(entry.summary?.content);
    assert.ok(entry.detail?.content);
    assert.equal(getKnowledgeEntryById(entry.id).id,entry.id);
    assert.equal(entry.summary.sourceId,entry.detail.sourceId);
  }
  const column=getKnowledgeEntry(q('powerColumn'));
  assert.equal(column.detail.sourceId,'penta-wa-development-v2');
  assert.deepEqual(column.properties.structuralEvidence.sourceIds,['J1','P1','P2']);
  assert.equal(column.properties.interpretationStatus,'editorial-reviewed');
  assert.deepEqual(SOURCES['penta-power-column-public'].urls,column.properties.structuralEvidence.urls.slice(1));
  assert.ok(pentaRecords.slice(0,21).every(record=>record.properties().unresolved.includes('gapFormula')));
});

test('locale content stays independent with complete gate and channel readings', () => {
  const original=getLocale();
  try {
    const results=[];
    for (const locale of ['en','zh-CN','zh-Hant']) {
      setLocale(locale,{persist:false});
      const summary=getKnowledgeSummary(q('introduction'));
      results.push(summary.content);
      assert.equal(summary.locale,locale);
      assert.ok(getKnowledgeSummary(q('gate:31')).content);
      assert.ok(getKnowledgeDetail(q('gate:31')).content);
      assert.equal(getKnowledgeEntry(q('gate:31')).hasSummary,true);
      assert.equal(getKnowledgeEntry(q('gate:31')).hasDetail,true);
      assert.ok(getKnowledgeDetail(q('channel:7-31')).content);
    }
    assert.equal(new Set(results).size,3);
  } finally { setLocale(original,{persist:false}); }
});

test('ordinary reference inventory and categories remain separate from Penta', () => {
  assert.equal(listKnowledgeEntries({includePenta:true}).filter(e=>e.objectType==='penta').length,30);
  const catalog=referenceEntries();
  assert.equal(catalog.filter(e=>e.kind==='gate').length,64);
  assert.equal(catalog.filter(e=>e.kind==='channel').length,36);
  assert.equal(catalog.filter(e=>e.kind==='knowledge').length,94); // 64 public foundation records + 30 Penta records.
  assert.equal(catalog.filter(e=>String(e.id).startsWith('hd.penta.')).length,30);
  assert.equal(listKnowledgeEntries().length,70);
  assert.deepEqual(listKnowledgeEntries().map(e=>e.id),listKnowledgeEntries({includePenta:false}).map(e=>e.id));
  assert.ok(listKnowledgeEntries().every(e=>e.objectType!=='penta'));
  assert.equal(listKnowledgeEntries({includePenta:true}).length,100);
  const view=readFileSync(new URL('../src/views/penta-matrix.js',import.meta.url),'utf8');
  assert.match(view,/const knowledgeBody = renderPentaReading/);
  assert.match(view,/qualifiedSummary\(`gate:\$\{gate\.gate\}`\)/);
  assert.match(view,/qualifiedSummary\(`channel:\$\{channel\.channelId\}`\)/);
  assert.match(view,/const qualifiedSummary = renderPentaSummary/);
  const policy=readFileSync(new URL('../src/lib/knowledge/penta-reading-policy.js',import.meta.url),'utf8');
  assert.match(policy,/editorial-reviewed/);
  assert.match(view,/detailAdapter\[kind\]\(record, context\)/);
  const home=readFileSync(new URL('../src/views/chart.js',import.meta.url),'utf8');
  assert.doesNotMatch(home,/penta-foundation|pentaContent/);
});
