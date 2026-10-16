import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { pentaPackage, pentaContentRecords, PENTA_CONTENT_SOURCE, readPentaContent } from '../src/lib/knowledge/content/penta.js';
import { pentaRecords } from '../src/lib/knowledge/penta-foundation.js';
import { getKnowledgeEntry, getKnowledgeSummary, getKnowledgeDetail } from '../src/lib/knowledge/registry.js';
import { readPentaSummary, qualifyPentaEntry } from '../src/lib/knowledge/penta-reading-policy.js';
import { SOURCES } from '../src/lib/knowledge/sources.js';
import waRecords from '../src/lib/wa/content-data.json' with { type:'json' };
import { readWaContent, listWaContent, WA_CONTENT_ALIASES } from '../src/lib/wa/content.js';
import { getLocale, setLocale } from '../src/lib/i18n.js';
const BASE='c379fbe6b9a1b4b472b900aeedc691275407c3f8';
const root=new URL('../',import.meta.url);
const baseRead=path=>JSON.parse(execFileSync('git',['show',`${BASE}:${path}`],{cwd:root,encoding:'utf8',maxBuffer:8*1024*1024}));
const oldPenta=baseRead('src/lib/knowledge/content/penta-v1.json');
const oldWa=baseRead('src/lib/wa/content-data.json');
const before=[...oldPenta.records,...oldWa], after=[...pentaContentRecords,...waRecords];
const locales=['zh-CN','zh-Hant','en'];
const changedPenta=[...['1','8','14','15','46'].map(n=>`hd.penta.gate.${n}`),...['1-8','2-14','5-15','7-31','13-33','29-46'].map(n=>`hd.penta.channel.${n}`),...['powerColumn','contexts','skill-gap','cross-member','three-paths-six-links'].map(n=>`hd.penta.${n}`)];
const changedWa=[...['penta-roles','alpha','gapping','powerbases'].map(n=>`wa.topic.${n}`),...['45-21','51-25','2-14','3-60','59-6','27-50'].map(n=>`wa.communication.${n}`)];
const expectedChanges=new Set([...changedPenta,...changedWa]);

test('v2 retains all 43 baseline identities and appends only Triggering',()=>{
  assert.equal(before.length,43); assert.equal(after.length,44);
  assert.equal(new Set(after.map(r=>r.id)).size,44);
  assert.equal(pentaContentRecords.length,30); assert.equal(waRecords.length,14);
  assert.deepEqual(pentaContentRecords.filter(r=>r.id!=='hd.penta.triggering').map(r=>r.id),oldPenta.records.map(r=>r.id));
  assert.deepEqual(waRecords.map(r=>r.id),oldWa.map(r=>r.id));
  for(const old of before) {
    const current=after.find(r=>r.id===old.id); assert.ok(current,old.id);
    for(const key of ['id','objectType','objectId']) assert.equal(current[key],old[key]);
  }
  assert.deepEqual(after.filter(r=>!before.some(old=>old.id===r.id)).map(r=>r.id),['hd.penta.triggering']);
  assert.equal(pentaContentRecords.filter(r=>r.kind==='mechanism').length,12);
});

test('DELTA changes exactly 5 gate, 6 channel, 5 mechanism and 10 Wa bodies; other 17 remain byte identical',()=>{
  const delta=new Map(pentaPackage.reviewHistory.v2.delta.contentChanges.map(r=>[r.id,r]));
  let unchanged=0;
  for(const old of before) {
    const current=after.find(r=>r.id===old.id), change=delta.get(old.id);
    if(expectedChanges.has(old.id)) {
      assert.equal(change.metadata_only,false,old.id);
      assert.deepEqual(change.locales_changed,locales);
      for(const locale of locales) assert.notDeepEqual(current.locales[locale],old.locales[locale],`${old.id} ${locale}`);
    } else {
      unchanged++;
      for(const locale of locales) for(const field of ['name','summary','detail']) {
        assert.ok(Buffer.from(current.locales[locale][field]).equals(Buffer.from(old.locales[locale][field])),`${old.id} ${locale} ${field}`);
      }
      if(change) {assert.equal(change.metadata_only,true);assert.deepEqual(change.locales_changed,[]);}
      else assert.deepEqual(current,old,old.id);
    }
    if(change) assert.notDeepEqual(current,old,`${old.id} metadata must update`);
  }
  assert.equal(unchanged,17);
  assert.equal(changedPenta.length,16); assert.equal(changedWa.length,10);
});

test('all 44 entries and 132 locale texts are statically readable through the live readers and policy',()=>{
  const original=getLocale(); let count=0;
  try {for(const locale of locales) {
    setLocale(locale,{persist:false});
    for(const record of after) {
      const text=record.locales[locale]; count++;
      for(const field of ['name','summary','detail']) assert.ok(text[field]?.trim(),`${record.id} ${locale} ${field}`);
      assert.notEqual(text.summary,text.detail);
      if(record.objectType==='penta') {
        const entry=getKnowledgeEntry(record), qualified=qualifyPentaEntry(entry);
        assert.equal(entry.name,text.name); assert.equal(entry.version,2);
        assert.equal(entry.locale,locale); assert.equal(entry.summary.locale,locale); assert.equal(entry.detail.locale,locale);
        assert.equal(entry.summary.content,text.summary); assert.equal(entry.detail.content,text.detail);
        assert.equal(getKnowledgeSummary(record).content,text.summary); assert.equal(getKnowledgeDetail(record).content,text.detail);
        assert.equal(readPentaSummary(record.objectId).content,text.summary);
        assert.equal(qualified.summary.content,text.summary); assert.equal(qualified.detail.content,text.detail);
        for(const slot of [entry.summary,entry.detail,entry.provenance.name]) {
          assert.equal(slot.version,2); assert.equal(slot.sourceId,PENTA_CONTENT_SOURCE);
          assert.equal(slot.evidenceStatus,'editorial-reviewed');
        }
      } else {
        const entry=readWaContent(record.id,locale);
        for(const field of ['name','summary','detail']) assert.equal(entry[field],text[field]);
        assert.equal(entry.version,'penta-wa-development-v2');
        for(const field of ['sourceRefs','semantics','evidenceClassification']) assert.deepEqual(entry[field],record[field]);
      }
    }
  }} finally {setLocale(original,{persist:false});}
  assert.equal(count,132);
});

test('no field/language fallback or borrowed verified status opens missing or invalid content',()=>{
  assert.equal(readPentaContent('triggering','detail','fr'),null);
  assert.equal(readPentaContent('triggering','detail','en',{en:{triggering:{summary:'Summary only'}}}),null);
  assert.equal(readPentaContent('triggering','summary','zh-Hant',{en:{triggering:{summary:'English only'}}}),null);
  assert.equal(readWaContent('alpha','fr'),null); assert.deepEqual(listWaContent('fr'),[]);
  const entry=getKnowledgeEntry(pentaRecords.find(r=>r.objectId==='triggering'));
  assert.equal(entry.properties.structuralEvidence,undefined);
  for(const patch of [{contentVersion:1},{contentPackage:'penta-wa-development-v1'},{interpretationStatus:'verified'},{editorialReview:{status:'incomplete'}},{sourceRefs:[]}]) {
    assert.equal(qualifyPentaEntry({...entry,properties:{...entry.properties,...patch}}),null);
  }
  for(const slot of ['summary','detail']) {
    assert.equal(qualifyPentaEntry({...entry,[slot]:{...entry[slot],evidenceStatus:'verified'}})[slot],null);
    assert.equal(qualifyPentaEntry({...entry,[slot]:{...entry[slot],sourceId:'penta-wa-development-v1'}})[slot],null);
    assert.equal(qualifyPentaEntry({...entry,[slot]:{...entry[slot],content:'Unrelated content'}})[slot],null);
  }
});

test('v1 provenance and review hashes remain intact with explicit version scope; v2 is independently registered',()=>{
  const {records,...oldMetadata}=oldPenta;
  assert.deepEqual(pentaPackage.history['penta-wa-development-v1'],oldMetadata);
  assert.deepEqual(pentaPackage.reviewHistory.crossReview,oldPenta.reviewHistory.crossReview);
  assert.deepEqual(pentaPackage.reviewHistory.resolution,oldPenta.reviewHistory.resolution);
  assert.deepEqual(pentaPackage.reviewHistory.versionScope,{crossReview:'penta-wa-development-v1',resolution:'penta-wa-development-v1',v2:'penta-wa-development-v2'});
  assert.equal(pentaPackage.contentVersion,2); assert.equal(pentaPackage.contentPackage,PENTA_CONTENT_SOURCE);
  for(const version of [1,2]) {
    const source=SOURCES[`penta-wa-development-v${version}`];
    assert.equal(source.contentVersion,version); assert.equal(source.type,'td-ohd'); assert.equal(source.humanApproval,false);
  }
  assert.equal(SOURCES['penta-wa-development-v1'].sourceRegistryPath,'history.penta-wa-development-v1.sourceRegistry');
  for(const path of ['penta/gates.json','penta/channels.json']) assert.notEqual(pentaPackage.reviewHistory.resolution.final_files[path],pentaPackage.inputFiles.find(f=>f.path===path).sha256);
  assert.equal(pentaPackage.inputDocuments['penta/gates.json'].version,PENTA_CONTENT_SOURCE);
  assert.equal(pentaPackage.inputDocuments['wa/content.json'].version,PENTA_CONTENT_SOURCE);
  assert.equal(pentaPackage.reviewHistory.v2.package.version,'2.0.0');
  assert.equal(pentaPackage.reviewHistory.v2.editorialCheck.language_records,132);
  assert.equal(pentaPackage.reviewHistory.v2.releaseCheck.human_publication_approval,false);
  for(const record of after) for(const ref of record.sourceRefs) assert.ok(pentaPackage.sourceRegistry[typeof ref==='string'?ref:ref.sourceId??ref.id]);
});

test('Wa identities, pair semantics and alias reader remain unchanged while new metadata retains unavailable algorithms',()=>{
  assert.deepEqual(WA_CONTENT_ALIASES,{'21-45':'45-21','25-51':'51-25','2-14':'2-14','3-60':'3-60','6-59':'59-6','27-50':'27-50'});
  const current=readFileSync(new URL('../src/lib/wa/content.js',import.meta.url),'utf8');
  const prior=execFileSync('git',['show',`${BASE}:src/lib/wa/content.js`],{cwd:root,encoding:'utf8'});
  assert.equal(current.replaceAll('\r\n','\n'),prior.replaceAll('\r\n','\n'));
  for(const old of oldWa) {
    const record=waRecords.find(r=>r.id===old.id);
    for(const key of ['gatePair','theme']) assert.deepEqual(record.semantics[key],old.semantics[key]);
    assert.equal(record.evidenceClassification.automaticProfessionalRules,'unsupported_algorithm');
  }
  assert.ok(readWaContent('27-50').semantics.aliases.includes('Logical Enforcement'));
});

const input=process.env.PENTA_WA_V2_INPUT ?? fileURLToPath(new URL('../../../penta-wa-development-v2-input/penta-wa-development-v2/',import.meta.url));
test('supplied author records, original source entries, specialist reviews and input hashes match exactly',{skip:!existsSync(resolve(input,'HANDOFF.md'))?'Optional author package unavailable; self-contained base and reader checks still run':false},()=>{
  const read=path=>JSON.parse(readFileSync(resolve(input,path),'utf8'));
  assert.deepEqual(pentaContentRecords,['penta/gates.json','penta/channels.json','penta/mechanisms.json'].flatMap(path=>read(path).records));
  assert.deepEqual(waRecords,read('wa/content.json').records);
  const registry=read('sources/resolved-registry.json').sources;
  for(const [id,source] of Object.entries(pentaPackage.sourceRegistry)) assert.deepEqual(source,registry[id],id);
  for(const [path,value] of Object.entries(pentaPackage.specialistReviews)) assert.deepEqual(value,read(path));
  for(const [path,value] of Object.entries(pentaPackage.inputDocuments)) {const {records,...metadata}=read(path);assert.deepEqual(value,metadata);}
  for(const item of pentaPackage.inputFiles) {
    const bytes=readFileSync(resolve(input,item.path)); assert.equal(bytes.length,item.bytes,item.path);
    assert.equal(createHash('sha256').update(bytes).digest('hex'),item.sha256,item.path);
  }
});
