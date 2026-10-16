import test from 'node:test';
import assert from 'node:assert/strict';
import { pentaRecords } from '../src/lib/knowledge/penta-foundation.js';
import { pentaPackage, pentaContentRecords, pentaContent, readPentaContent, pentaTextParagraphs } from '../src/lib/knowledge/content/penta.js';
import { createKnowledgeReader, getKnowledgeEntry, listKnowledgeEntries } from '../src/lib/knowledge/registry.js';
import { PENTA_GATES, PENTA_CHANNELS } from '../src/lib/human-design/penta-catalog.js';
import { SOURCES } from '../src/lib/knowledge/sources.js';
import { getLocale, setLocale } from '../src/lib/i18n.js';

const gateIds = [1,2,5,7,8,13,14,15,29,31,33,46].map(n => `hd.penta.gate.${n}`);
const channelIds = ['1-8','2-14','5-15','7-31','13-33','29-46'].map(id => `hd.penta.channel.${id}`);
const oldMechanisms = ['introduction','powerColumn','contexts'].map(id => `hd.penta.${id}`);
const addedMechanisms = ['size-formation','structure-vs-individual','skill-gap','contributions','cross-member','duplicates','three-paths-six-links','alpha-bg5','triggering'].map(id => `hd.penta.${id}`);
const byId = new Map(pentaContentRecords.map(item => [item.id,item]));
const query = objectId => ({ domain:'human-design',objectType:'penta',objectId });

test('exact 30 identities retain the original 21 order and computed topology', () => {
  assert.deepEqual(pentaRecords.map(r=>r.id).sort(), [...gateIds,...channelIds,...oldMechanisms,...addedMechanisms].sort());
  assert.equal(new Set(pentaRecords.map(r=>r.objectId)).size,30);
  assert.deepEqual(pentaRecords.slice(0,21).map(r=>r.id), [
    ...oldMechanisms,...PENTA_GATES.map(g=>`hd.penta.gate.${g.gate}`),...PENTA_CHANNELS.map(c=>`hd.penta.channel.${c.channelId}`)
  ]);
  assert.deepEqual(pentaRecords.slice(21).map(r=>r.id),addedMechanisms);
  for (const id of [...oldMechanisms,...addedMechanisms]) {
    const record=pentaRecords.find(r=>r.id===id);
    assert.equal(byId.get(id).kind,'mechanism');
    assert.notEqual(record.properties().kind,'gate');
    assert.equal(record.properties().kind,addedMechanisms.includes(id)?'mechanism':record.objectId);
  }
  for (const cell of PENTA_GATES) {
    const entry = getKnowledgeEntry(query(`gate:${cell.gate}`));
    for (const [key,value] of Object.entries(cell)) assert.deepEqual(entry.properties[key],value);
    assert.equal(entry.properties.kind,'gate');
    assert.equal(entry.provenance.properties.sourceId,'penta-structure');
    assert.equal(entry.provenance.identity.sourceId,'penta-bg5-course');
  }
  for (const channel of PENTA_CHANNELS) {
    const entry = getKnowledgeEntry(query(`channel:${channel.channelId}`));
    for (const key of ['channelId','gates','centers','displayOrder']) assert.deepEqual(entry.properties[key],channel[key]);
    assert.equal(entry.properties.kind,'channel');
  }
  assert.equal(listKnowledgeEntries().length,70);
  assert.equal(listKnowledgeEntries({includePenta:true}).length,100);
});

test('all 90 locale records preserve exact independent package fields and Penta gate names', () => {
  const original=getLocale();
  try {
    for (const locale of ['zh-CN','zh-Hant','en']) {
      setLocale(locale,{persist:false});
      for (const record of pentaRecords) {
        const item=byId.get(record.id), text=item.locales[locale], entry=getKnowledgeEntry(record);
        assert.equal(entry.name,text.name);
        assert.equal(entry.summary.content,text.summary);
        assert.equal(entry.detail.content,text.detail);
        assert.equal(entry.locale,locale);
        for (const key of ['name','summary','detail']) assert.ok(text[key].trim(),`${item.id} ${locale} ${key}`);
        assert.notEqual(text.summary.trim(),text.detail.trim());
        assert.equal(entry.hasSummary,true);
        assert.equal(entry.hasDetail,true);
        assert.equal(entry.summary.format,'plain-text');
        assert.equal(entry.detail.format,'plain-text');
        assert.doesNotMatch(text.detail,/<\/?[a-z][^>]*>/i);
        if (item.gate) {
          assert.ok(entry.name.includes(item.term[locale]));
          assert.deepEqual(entry.properties.hexagram,item.hexagram);
          assert.deepEqual(entry.properties.natalTitle,item.natalTitle);
          assert.deepEqual(entry.properties.term,item.term);
        }
      }
    }
  } finally { setLocale(original,{persist:false}); }
});

test('summary and detail getters are separately lazy through the actual registry reader', () => {
  const record=pentaRecords.find(r=>r.objectId==='gate:31');
  let summaryReads=0,detailReads=0;
  const reader=createKnowledgeReader([{
    ...record,
    summary:{...record.summary,read:()=>{summaryReads++;return record.summary.read();}},
    detail:{...record.detail,read:()=>{detailReads++;return record.detail.read();}}
  }]);
  assert.ok(reader.getKnowledgeSummary(record).content);
  assert.equal(summaryReads,1);assert.equal(detailReads,0);
  assert.ok(reader.getKnowledgeDetail(record).content);
  assert.equal(summaryReads,1);assert.equal(detailReads,1);
});

test('missing locale/slot remains missing, and negative review/evidence metadata is never upgraded', () => {
  const record=pentaRecords.find(r=>r.objectId==='gate:31');
  const missing={en:{'gate:31':{summary:'Only English summary',detail:'Only English detail'}},'zh-CN':{'gate:31':{summary:'仅有摘要'}}};
  assert.equal(readPentaContent('gate:31','detail','zh-CN',missing),null);
  assert.equal(readPentaContent('gate:31','summary','zh-Hant',missing),null);
  assert.equal(readPentaContent('gate:unknown','summary','en',missing),null);
  assert.equal(readPentaContent('gate:31','summary','unsupported'),null);
  const reader=createKnowledgeReader([{
    ...record,reviewStatus:'unreviewed',
    summary:{...record.summary,read:()=>null,reviewStatus:'unreviewed'},
    detail:{...record.detail,read:()=>'',reviewStatus:'unreviewed'},
    properties:()=>({interpretationStatus:'unreviewed',evidence:{status:'unverified'},sourceRefs:[],editorialReview:{actor:'AI editorial team',status:'incomplete',humanApproval:false}})
  }]);
  assert.equal(reader.getKnowledgeSummary(record),null);
  assert.equal(reader.getKnowledgeDetail(record).content,'');
  const entry=reader.getKnowledgeEntry(record);
  assert.equal(entry.reviewStatus,'unreviewed');
  assert.equal(entry.detail.reviewStatus,'unreviewed');
  assert.equal(entry.properties.interpretationStatus,'unreviewed');
  assert.equal(entry.properties.evidence.status,'unverified');
  assert.deepEqual(entry.properties.sourceRefs,[]);
});

test('editorial provenance cannot borrow verified topology and every source reference resolves', () => {
  const registered=SOURCES['penta-wa-development-v2'];
  assert.equal(registered.type,'td-ohd');
  assert.equal(registered.humanApproval,false);
  assert.deepEqual(registered.lineage,['td-ohd']);
  assert.equal(Object.keys(pentaPackage.sourceRegistry).length,40);
  for (const record of pentaRecords) {
    const item=byId.get(record.id),entry=getKnowledgeEntry(record),props=entry.properties;
    assert.equal(entry.reviewStatus,'reviewed');
    assert.equal(props.interpretationStatus,'editorial-reviewed');
    assert.equal(props.evidence.status,'editorial-reviewed');
    assert.deepEqual(props.editorialReview,{actor:'AI editorial team',status:'complete',humanApproval:false});
    for (const slot of [entry.summary,entry.detail,entry.provenance.name]) {
      assert.equal(slot.sourceId,'penta-wa-development-v2');
      assert.equal(slot.reviewStatus,'reviewed');
      assert.equal(slot.evidenceStatus,'editorial-reviewed');
    }
    assert.deepEqual(props.sourceRefs,item.sourceRefs.map(ref=>({...ref,sourceId:ref.sourceId??ref.id})));
    for (const ref of props.sourceRefs) {
      assert.ok(pentaPackage.sourceRegistry[ref.sourceId],`${entry.id}: ${ref.sourceId}`);
      assert.ok(ref.locator);
      assert.ok(ref.scope??ref.use);
    }
    assert.deepEqual(props.metadata,item.metadata??{});
    assert.deepEqual(props.semantics,item.semantics??{});
    assert.deepEqual(props.limitations,item.limitations??[]);
    assert.deepEqual(props.technicalLimitations,props.limitations);
    if (addedMechanisms.includes(record.id)) assert.equal(props.structuralEvidence,undefined);
    else assert.equal(props.structuralEvidence.status,'verified');
  }
  const gate31=byId.get('hd.penta.gate.31');
  assert.ok(gate31.sourceRefs.some(ref=>(ref.sourceId??ref.id)==='GAP03'));
  const channel=byId.get('hd.penta.channel.7-31');
  assert.deepEqual(channel.metadata.mappingEvidence,{'31':'official-published-case','7':'third-party-explicit'});
});

test('both review passes retain their own hashes and the final resolution stays nonhuman', () => {
  const historical=pentaPackage.history['penta-wa-development-v1'];
  const {crossReview,resolution}=historical.reviewHistory;
  assert.equal(crossReview.findings.find(f=>f.id==='ECR-01').applied,false);
  assert.equal(resolution.findings_resolved.find(f=>f.id==='ECR-01').status,'applied_and_checked');
  assert.equal(resolution.human_approval,false);
  for (const path of ['penta/gates.json','penta/channels.json']) {
    assert.notEqual(crossReview.reviewedFiles.find(f=>f.path===path).sha256,resolution.final_files[path]);
    assert.equal(resolution.final_files[path],historical.inputFiles.find(f=>f.path===path).sha256);
  }
  assert.equal(pentaPackage.editorialReview.humanApproval,false);
});

test('plain text paragraphs preserve hostile markup literally without manufacturing HTML', () => {
  assert.deepEqual(pentaTextParagraphs(' First\r\n\r\nSecond\n\n<script>alert(1)</script>\n\n<img src=x onerror=alert(2)>'),[
    'First','Second','<script>alert(1)</script>','<img src=x onerror=alert(2)>'
  ]);
  assert.deepEqual(pentaTextParagraphs(null),[]);
  assert.deepEqual(pentaTextParagraphs(' \n\n '),[]);
  for (const locale of Object.keys(pentaContent)) {
    for (const text of Object.values(pentaContent[locale])) assert.ok(pentaTextParagraphs(text.detail).length>=2);
  }
});
