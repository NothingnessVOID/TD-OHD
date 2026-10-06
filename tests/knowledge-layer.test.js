import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { parseAst } from 'rollup/parseAst';
import { getKnowledgeEntry, getKnowledgeSummary, getKnowledgeDetail, listKnowledgeEntries, createKnowledgeReader } from '../src/lib/knowledge/registry.js';
import { createFoundationSummary, foundationSummary } from '../src/lib/knowledge/foundation-summary.js';
import { foundationRecords } from '../src/lib/knowledge/human-design-foundation.js';
import { validateKnowledgeEntry, DOMAINS, OBJECT_TYPES, REVIEW_STATUSES } from '../src/lib/knowledge/schema.js';
import { SOURCES, SOURCE_TYPES } from '../src/lib/knowledge/sources.js';
import { TYPES, AUTHORITIES, PROFILES } from '../src/lib/human-design/catalog.js';
import { variableNames, variableDescriptions, cognitionNames, variableValueId } from '../src/lib/human-design/variable-data.js';
import { typeName, typeDescription, authorityName, profileName, cognition, variable, strategy, signature, notSelf } from '../src/lib/vocabulary.js';
import { contentText, crossName } from '../src/lib/content.js';
import { setLocale, getLocale } from '../src/lib/i18n.js';
import { adaptSharpChart } from '../src/lib/chart-engine/sharp-contract.js';
const query = (objectType, objectId, extra={})=>({domain:'human-design',objectType,objectId,...extra});
const fixtures=JSON.parse(readFileSync(new URL('./fixtures/sharp-definition-components.json',import.meta.url)));
const all = listKnowledgeEntries();

test('66 unique foundation entries have valid domain, object type, sources, review and slot versions',()=>{
 assert.equal(all.length,66);assert.equal(new Set(all.map(x=>x.id)).size,66);
 for(const e of all) {assert.equal(validateKnowledgeEntry(e),e);assert.ok(['unreviewed','reviewed'].includes(e.reviewStatus));}
 for(const [field,bad] of [['id','中文'],['domain','wrong'],['objectType','wrong'],['reviewStatus','official'],['version',0]])assert.throws(()=>validateKnowledgeEntry({...all[0],[field]:bad}));
 assert.throws(()=>validateKnowledgeEntry({...all[0],summary:{...all[0].summary,sourceId:'absent'}}));
 assert.throws(()=>createKnowledgeReader([foundationRecords[0],foundationRecords[0]]),/Duplicate/);
 for(const domain of ['human-design','iching','gene-keys','meridian','td-ohd-extension','teacher-extension'])assert.ok(DOMAINS.includes(domain));
 for(const objectType of ['gate','line','channel','center','geneKey','hexagram','meridian'])assert.ok(OBJECT_TYPES.includes(objectType));
 for(const status of ['unreviewed','reviewed','verified','custom'])assert.ok(REVIEW_STATUSES.includes(status));
 for(const source of ['sharpastrology',['natal','engine'].join(''),'open-human-design','td-ohd','teacher-material','teacher-extension','jovian-public','gene-keys-official','unknown'])assert.ok(SOURCE_TYPES.includes(source));
 for(const source of Object.values(SOURCES))assert.ok(SOURCE_TYPES.includes(source.type));
 assert.equal(SOURCES['teacher-material'].reserved,true);
 assert.ok(all.every(e=>!Object.values(e.provenance).some(p=>SOURCES[p.sourceId].reserved)));
});

test('all expected Type/Authority/Profile/Definition/Variable/Cognition identities are lookup-able',()=>{
 const counts={type:5,authority:8,profile:12,definition:5,variable:29,cognition:6};
 for(const [kind,count] of Object.entries(counts))assert.equal(all.filter(e=>e.objectType===kind).length,count);
 for(const id of Object.keys(TYPES))assert.ok(getKnowledgeEntry(query('type',id)));
 for(const id of Object.keys(PROFILES))assert.ok(getKnowledgeEntry(query('profile',id)));
 const a=getKnowledgeEntry(query('authority','egoManifested')),b=getKnowledgeEntry(query('authority','egoProjected'));
 assert.notEqual(a.id,b.id);assert.notEqual(a.detail.content,b.detail.content);assert.equal(a.hasDetail,true);assert.equal(b.hasDetail,true);
});

test('missing content is explicit and neither slot fabricates the other',()=>{
 const smell=getKnowledgeEntry(query('cognition','smell'));assert.equal(smell.summary,null);assert.equal(smell.detail,null);
 const ref={read:()=> 'short',sourceId:'unknown',reviewStatus:'unreviewed',version:1};
 const record={...foundationRecords[0],summary:ref,detail:null};let reader=createKnowledgeReader([record]);assert.equal(reader.getKnowledgeDetail(record),null);
 record.summary=null;record.detail=ref;reader=createKnowledgeReader([record]);assert.equal(reader.getKnowledgeSummary(record),null);
 assert.equal(getKnowledgeEntry(query('authority','unrecognized')),null);
});

test('real Cross enums have dynamic identities, structural properties, and no manufactured prose',()=>{
 for(const sample of fixtures.samples){const c=adaptSharpChart(sample.raw,{timezone:0});const e=getKnowledgeEntry(query('cross',c.incarnationCross.rawId,{cross:c.incarnationCross}));
  assert.equal(e.id,`hd.cross.${sample.raw.incarnationCross}`);assert.equal(e.name,crossName(c.incarnationCross));
  assert.deepEqual(e.properties.gates,c.incarnationCross.gates);assert.equal(e.summary,null);assert.equal(e.detail,null);
 }
 assert.equal(listKnowledgeEntries().filter(e=>e.objectType==='cross').length,1);
 assert.throws(()=>getKnowledgeEntry(query('cross',fixtures.samples[0].raw.incarnationCross,{cross:{rawId:'Different'}})),/mismatch/);
});

test('existing three-language names and hero slots still use their original vocabulary',()=>{
 const previous=getLocale();try{for(const locale of ['en','zh-CN','zh-Hant']){setLocale(locale,{persist:false});
  for(const [id,type] of Object.entries(TYPES)){const e=getKnowledgeEntry(query('type',id));assert.equal(e.name,typeName(type.name));assert.equal(getKnowledgeSummary(query('type',id,{surface:'hero'})).content,typeDescription(type.name));}
  for(const id of Object.keys(PROFILES))assert.equal(getKnowledgeEntry(query('profile',id)).name,profileName(id));
  for(const [kind,names]of Object.entries(variableNames))for(let color=1;color<=6;color++)assert.equal(getKnowledgeEntry(query('variable',`${kind}:${variableValueId(kind,color)}`)).name,variable({name:names[color-1]})[0]);
  for(const [index,id] of ['smell','taste','outerVision','innerVision','feeling','touch'].entries())assert.equal(getKnowledgeEntry(query('cognition',id)).name,cognition(cognitionNames[index]));
 }}finally{setLocale(previous,{persist:false});}
});

test('Knowledge Layer stores references, not a third copy of existing explanation text',()=>{
 const dir=new URL('../src/lib/knowledge/',import.meta.url);
 const code=readdirSync(dir).filter(f=>f.endsWith('.js')).map(f=>readFileSync(new URL(f,dir),'utf8')).join('\n');
 const texts=[...Object.values(TYPES).map(x=>x.description),...Object.values(AUTHORITIES).map(x=>x.description),...Object.values(PROFILES).map(x=>x.theme),...Object.values(variableDescriptions).flat()];
 const previous=getLocale();try{for(const locale of ['en','zh-CN','zh-Hant']){setLocale(locale,{persist:false});texts.push(...Object.values(TYPES).map(type=>typeDescription(type.name)));}}finally{setLocale(previous,{persist:false});}
 for(const text of texts)assert.equal(code.includes(text),false,`duplicate body: ${text}`);
 for(const record of foundationRecords)for(const slot of [record.name,record.summary,record.detail,...Object.values(record.legacySlots??{})])if(slot)assert.equal(typeof slot.read,'function');
});

test('a 50,000-character Detail, or throwing Detail reader, cannot change Home Summary',()=>{
 const fixture={...foundationRecords.find(r=>r.objectType==='type'&&r.objectId==='generator')};
 let detailReads=0;fixture.detail={...fixture.summary,read:()=>{detailReads++;return 'Detail '.repeat(8000);}};
 const reader=createKnowledgeReader([fixture]);const home=createFoundationSummary(reader.getKnowledgeSummary);
 const chart={type:{id:'generator'}};
 const first=home(chart,'type');fixture.detail.read=()=>{throw new Error('Home read Detail');};
 assert.equal(home(chart,'type'),first);assert.equal(detailReads,0);assert.equal(home(chart,'type','hero'),typeDescription(TYPES.generator.name));
 fixture.detail.read=()=> 'Detail '.repeat(8000);assert.ok(reader.getKnowledgeDetail(query('type','generator')).content.length>50000);assert.equal(home(chart,'type'),first);
});

test('Home and foundation renderers cannot call full-entry or Detail lookup',()=>{
 const source=readFileSync(new URL('../src/views/chart.js',import.meta.url),'utf8');
 const ast=parseAst(source);const functions=[];
 for(const statement of ast.body){const node=statement.type==='ExportNamedDeclaration'?statement.declaration:statement;if(node?.type==='FunctionDeclaration'&&['renderChartView','renderFoundation'].includes(node.id.name))functions.push(node);}
 assert.equal(functions.length,2);
 for(const node of functions){const body=source.slice(node.start,node.end);assert.doesNotMatch(body,/getKnowledge(?:Detail|Entry)|\bentry\.detail/);assert.match(body,/foundationSummary\(/);}
 const facade=readFileSync(new URL('../src/lib/knowledge/foundation-summary.js',import.meta.url),'utf8');assert.doesNotMatch(facade,/getKnowledge(?:Detail|Entry)|\.detail\b/);
 for(const sample of fixtures.samples){const c=adaptSharpChart(sample.raw,{timezone:0});for(const kind of ['type','authority','profile'])assert.equal(foundationSummary(c,kind),getKnowledgeSummary(query(kind,c.calculation[kind].id)).content);}
});


test('the same reader supports future domains without migrating their production data',()=>{
 for(const [domain,objectType] of [['iching','hexagram'],['gene-keys','geneKey'],['meridian','meridian'],['td-ohd-extension','gate'],['teacher-extension','type']]){
  const reference={read:()=> 'fixture',sourceId:'unknown',file:'test fixture',path:'name',reviewStatus:'unreviewed',version:1};
  const record={id:`test.${domain}.one`,domain,objectType,objectId:'one',name:reference,summary:null,detail:null,reviewStatus:'unreviewed',version:1};
  const reader=createKnowledgeReader([record]);const entry=reader.getKnowledgeEntry({domain,objectType,objectId:'one'});
  assert.equal(entry.domain,domain);assert.equal(entry.hasDetail,false);
 }
});
