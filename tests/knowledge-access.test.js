import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { chartKnowledgeQuery } from '../src/lib/knowledge/access.js';
import { getKnowledgeEntryById, getKnowledgeEntry, listKnowledgeEntries } from '../src/lib/knowledge/registry.js';
import { referenceEntries, referenceEntry, searchReference } from '../src/lib/reference-catalog.js';
import { renderKnowledgeDetail } from '../src/lib/knowledge/detail-renderer.js';
import { setLocale, getLocale } from '../src/lib/i18n.js';
import { openDetailDialog, closeDetailDialog, fitDetailSheetHeight } from '../src/lib/detail-dialog.js';

const chart={calculation:{type:{id:'generator'},authority:{id:'egoProjected'},definition:{id:'split'}},profile:{numbers:'1/3'},incarnationCross:{rawId:'RightAngleCrossOfExplanation2',angle:'right',gates:[23,43,49,4]},variable:{motivation:{valueId:'hope',color:2,tone:4,base:3}}};
test('Foundation maps exact calculation identities; Strategy aliases Type; circuit has no Knowledge route',()=>{
 for(const [kind,id] of [['type','generator'],['authority','egoProjected'],['profile','1/3'],['definition','split']])assert.deepEqual(chartKnowledgeQuery(chart,kind),{domain:'human-design',objectType:kind,objectId:id});
 assert.deepEqual(chartKnowledgeQuery(chart,'strategy'),chartKnowledgeQuery(chart,'type'));
 assert.equal(chartKnowledgeQuery(chart,'cross').cross,chart.incarnationCross);
 assert.deepEqual(chartKnowledgeQuery(chart,'variable','motivation'),{domain:'human-design',objectType:'variable',objectId:'motivation:hope'});
 for(const kind of ['circuit','cognition'])assert.equal(chartKnowledgeQuery(chart,kind),null);
 assert.equal(chartKnowledgeQuery(chart,'variable','environment'),null);
});
test('ID lookup comes from existing records and keeps 31 Basic / 29 Variable entries, no Cognition',()=>{
 for(const e of listKnowledgeEntries())assert.deepEqual(getKnowledgeEntryById(e.id),getKnowledgeEntry(e));
 assert.equal(getKnowledgeEntryById('hd.profile.1/3'),null);assert.equal(getKnowledgeEntryById('constructor'),null);
 const entries=referenceEntries().filter(e=>e.kind==='knowledge');
 assert.equal(entries.filter(e=>e.category==='basic').length,31);assert.equal(entries.filter(e=>e.category==='variable').length,29);
 assert.equal(entries.filter(e=>e.objectType==='cross').length,1);assert.equal(entries.some(e=>e.objectType==='cognition'),false);
 for(const entry of entries)assert.equal(referenceEntry('knowledge',entry.id).id,entry.id);
});
test('localized names, Summary and useful stable aliases are searchable',()=>{
 const old=getLocale();try{for(const locale of ['en','zh-CN','zh-Hant']){
  setLocale(locale,{persist:false});
  assert.ok(searchReference(locale==='en'?'Sacral':locale==='zh-CN'?'骶骨':'薦骨','basic').some(e=>e.id==='hd.authority.sacral'));
  assert.ok(searchReference('1/3','basic').some(e=>e.id==='hd.profile.1-3'));
  assert.ok(searchReference('hope','variable').some(e=>e.id==='hd.variable.motivation.hope'));
  assert.ok(searchReference('transit','basic').some(e=>e.kind==='concept'&&e.id==='transit'));
  const e=referenceEntry('knowledge','hd.authority.sacral');assert.ok(searchReference(e.summary,'basic').some(x=>x.id===e.id));
 }}finally{setLocale(old,{persist:false});}
});
test('ID and chart query use identical Knowledge body; dynamic Cross missing stays internal',()=>{
 const old=getLocale();try{for(const locale of ['en','zh-CN','zh-Hant']){
  setLocale(locale,{persist:false});
  for(const id of ['hd.type.generator','hd.authority.sacral','hd.profile.1-3','hd.definition.split','hd.variable.motivation.hope']) {
   const e=getKnowledgeEntryById(id);assert.equal(renderKnowledgeDetail(id),renderKnowledgeDetail(e));
  }
  const query=chartKnowledgeQuery(chart,'cross');assert.equal(getKnowledgeEntry(query).detailStatus,'missing');
  assert.doesNotMatch(renderKnowledgeDetail(query,{showSpecificMissing:false}),/class="knowledge-missing"/);
 }}finally{setLocale(old,{persist:false});}
});
test('same DOM owner transition closes and cleans the previous controller; default BodyGraph label stays',()=>{
 const oldLocale=getLocale();setLocale('en',{persist:false});
 const oldDocument=globalThis.document;
 const classes=new Set(),focus=[];
 const trigger={isConnected:true,focus:()=>focus.push('trigger')};
 const doc=new EventTarget();doc.activeElement=trigger;doc.body={classList:{add:x=>classes.add(x),remove:x=>classes.delete(x)}};
 const button={focus:()=>focus.push('close'),addEventListener:()=>{}};
 const element=new EventTarget();element.dataset={};element.classList={add:()=>{},remove:()=>{}};
 element.attrs={};element.setAttribute=(k,v)=>element.attrs[k]=v;
 element.querySelector=()=>button;element.querySelectorAll=()=>[button];
 globalThis.document=doc;let bodyClosed=0,knowledgeClosed=0;
 try {
  openDetailDialog(element,()=>bodyClosed++);assert.equal(element.attrs['aria-label'],'Bodygraph details');
  openDetailDialog(element,()=>knowledgeClosed++,{owner:'knowledge',label:'Knowledge details'});
  assert.equal(bodyClosed,1);assert.equal(knowledgeClosed,0);assert.equal(element.dataset.detailOwner,'knowledge');
  openDetailDialog(element,()=>assert.fail('same owner must preserve lifecycle'),{owner:'knowledge',label:'Knowledge details'});
  openDetailDialog(element,()=>bodyClosed++);assert.equal(knowledgeClosed,1);assert.equal(bodyClosed,1);
  closeDetailDialog();assert.equal(bodyClosed,2);assert.equal(element.dataset.detailOwner,undefined);assert.equal(classes.has('modal-open'),false);assert.equal(focus.at(-1),'trigger');
 }finally{closeDetailDialog();globalThis.document=oldDocument;setLocale(oldLocale,{persist:false});}
});
test('shared sheet fitting retains limits and previous-height animation',()=>{
 const old=globalThis.window;globalThis.window={innerWidth:390,innerHeight:800};
 const card={style:{},offsetHeight:400,querySelector:selector=>selector==='.gate-detail-nav'?{offsetHeight:25}:{scrollHeight:900}};
 try{fitDetailSheetHeight(card,400);assert.equal(card.style.height,'656px');assert.match(card.style.transition,/height 260ms/);
 card.querySelector=()=>({offsetHeight:0,scrollHeight:0});fitDetailSheetHeight(card);assert.equal(card.style.height,'280px');}
 finally{globalThis.window=old;}
});
test('protected BodyGraph layout module and Knowledge body resources are not used as replacement renderers',()=>{
 const controller=readFileSync(new URL('../src/lib/knowledge/detail-controller.js',import.meta.url),'utf8');
 assert.match(controller,/gate-detail/);assert.doesNotMatch(controller,/knowledge-detail['"]|detailHistory|currentDetail\s*=/);
 const reference=readFileSync(new URL('../src/views/reference.js',import.meta.url),'utf8');assert.match(reference,/renderKnowledgeDetail\(entry\.id/);
});
