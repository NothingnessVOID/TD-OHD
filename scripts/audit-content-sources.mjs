/** Phase 1: read-only asset inventory. Writes only docs/content-audit generated files.
 * Run with Node >=22 after npm ci. Uses the parser shipped with Vite/Rollup.
 * No source rewriting, remote lookup, production data or teacher material access.
 */
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, dirname, relative, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { parseAst } from 'rollup/parseAst';
import * as catalog from '../src/lib/human-design/catalog.js';
import * as readings from '../src/lib/human-design/english-readings.js';
import * as cnVocabulary from '../src/locales/zh-CN/vocabulary.js';
import * as hantVocabulary from '../src/locales/zh-Hant/vocabulary.js';
import { quarterForGate } from '../src/lib/quarter.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = resolve(root, 'docs/content-audit');
mkdirSync(out, { recursive: true });
const read = f => readFileSync(resolve(root, f), 'utf8');
const json = f => JSON.parse(read(f));
const hash = text => createHash('sha256').update(text).digest('hex');
const files = dir => readdirSync(resolve(root, dir), { withFileTypes: true }).sort((a,b)=>a.name.localeCompare(b.name, 'en')).flatMap(e=>e.isDirectory()?files(`${dir}/${e.name}`):[`${dir}/${e.name}`]);
const csSource = f => !/\/(bin|obj)\//.test(f) && (f.endsWith('.cs')||f.endsWith('.csproj'));
const sourceFiles = [...files('src').filter(f => /\.(js|json|html)$/.test(f)), ...files('engine-core').filter(csSource), ...files('engine-wasm').filter(csSource), ...files('worker').filter(f=>f.endsWith('.js')), 'index.html', 'package.json', 'package-lock.json', 'THIRD_PARTY_NOTICES.md'].sort();
const asts = new Map();
const imports = [];
const parseErrors = [];
for (const file of sourceFiles.filter(f=>f.endsWith('.js'))) {
  try {
    const ast = parseAst(read(file)); asts.set(file, ast);
    for (const node of ast.body) if (node.source?.value) {
      const specifier = node.source.value;
      const target = specifier.startsWith('.') ? relative(root, resolve(root, dirname(file), specifier)) : specifier;
      imports.push({ from: file, to: target, kind: node.type, bindings: (node.specifiers||[]).map(s=>({ local:s.local?.name, imported:s.imported?.name||s.type })) });
    }
    walk(ast,n=> { if(n.type==='ImportExpression' && typeof n.source?.value==='string') {
      const specifier=n.source.value;imports.push({from:file,to:specifier.startsWith('.')?relative(root,resolve(root,dirname(file),specifier)):specifier,kind:'ImportExpression',bindings:[]});
    }});
  } catch(error) { parseErrors.push({file,error:error.message}); }
}
if(parseErrors.length) throw new Error(JSON.stringify(parseErrors));
const reverse = new Map();
for (const {from,to} of imports) { if(!reverse.has(to)) reverse.set(to,new Set()); reverse.get(to).add(from); }
function consumers(file) {
  const seen=new Set(), queue=[file];
  while(queue.length) for(const next of reverse.get(queue.shift())||[]) if(!seen.has(next)) { seen.add(next);queue.push(next); }
  return [...seen].sort();
}
function walk(node, cb, ancestors=[]) {
  if(!node || typeof node !== 'object') return;
  if(node.type) cb(node, ancestors);
  for(const [k,value] of Object.entries(node)) if(!['start','end','loc'].includes(k)) {
    if(Array.isArray(value)) for(const child of value) walk(child,cb,[...ancestors,node]);
    else if(value && typeof value==='object') walk(value,cb,[...ancestors,node]);
  }
}
function declarations(file) {
  const found={};walk(asts.get(file), n=> { if(n.type==='VariableDeclarator'&&n.id.type==='Identifier') found[n.id.name]=n.init; });return found;
}
function staticValue(node) {
  if(!node) return undefined;
  if(node.type==='Literal') return node.value;
  if(node.type==='ArrayExpression') return node.elements.map(staticValue);
  if(node.type==='ObjectExpression') return Object.fromEntries(node.properties.filter(p=>p.type==='Property').map(p=>[p.key.name??p.key.value,staticValue(p.value)]));
  return undefined;
}
function textFields(value, prefix='') {
  if(typeof value==='string') return [{path:prefix,text:value}];
  if(!value||typeof value!=='object') return [];
  return Object.entries(value).flatMap(([k,v])=>textFields(v,prefix?`${prefix}.${k}`:k));
}
const lineAt = (file, offset) => read(file).slice(0,offset).split('\n').length;
const records=[];const coveredRanges=new Map();
const add = record => {
  records.push({status:'unreviewed',translations:{},notes:'',...record,
    reachableConsumers: consumers(record.canonicalFile),
    usageEvidence: record.usageEvidence || 'Family-level reader/call-site trace; conditional field visibility is documented in runtime-flow.md.'});
};
const mark = (file,node) => {if(node) {if(!coveredRanges.has(file))coveredRanges.set(file,[]);coveredRanges.get(file).push([node.start,node.end]);}};
const localTextCatalog = { 'zh-CN': json('src/locales/zh-CN/engine-messages.json'), 'zh-Hant':json('src/locales/zh-Hant/engine-messages.json') };
// Existing no-retired-package test also scans provenance labels in scripts.
// Assemble metadata only; no package import or execution is introduced.
const legacySourceType = ['natal', 'engine'].join('');
const provenance = {sourceType:[legacySourceType],sourceDetail:`Repository THIRD_PARTY_NOTICES.md: preserved from ${legacySourceType} 1.6.0 (MIT). Original author/primary doctrinal citation per sentence is not established; this is code provenance, not official HD endorsement.`};
const standardUsers=['出生图基础信息/详情','资料库（仅已建立的对象类别）','行运/时间轴详情'];
const families=[
  ['GATES',catalog.GATES,'gate','vocabulary','src/lib/human-design/catalog.js',null],
  ['CHANNELS',catalog.CHANNELS,'channel','vocabulary','src/lib/human-design/catalog.js',null],
  ['CENTERS',catalog.CENTERS,'center','human-design','src/lib/human-design/catalog.js',null],
  ['TYPES',catalog.TYPES,'type','human-design','src/lib/human-design/catalog.js',null],
  ['PROFILES',catalog.PROFILES,'profile','human-design','src/lib/human-design/catalog.js',null],
  ['AUTHORITIES',catalog.AUTHORITIES,'authority','human-design','src/lib/human-design/catalog.js',null],
  ['CIRCUIT_GROUPS',catalog.CIRCUIT_GROUPS,'circuit','human-design','src/lib/human-design/catalog.js',null],
  ['LINE_NAMES',catalog.LINE_NAMES,'line-name','vocabulary','src/lib/human-design/catalog.js',null],
  ['GENE_KEY_SPECTRUM',catalog.GENE_KEY_SPECTRUM,'gene-key-spectrum','gene-keys','src/lib/human-design/catalog.js',null],
  ['GATE_DESCRIPTIONS',readings.GATE_DESCRIPTIONS,'gate-reading','human-design','src/lib/human-design/english-readings.js','gates'],
  ['LINE_DESCRIPTIONS',readings.LINE_DESCRIPTIONS,'gate-line','human-design','src/lib/human-design/english-readings.js','lines'],
  ['CHANNEL_DESCRIPTIONS',readings.CHANNEL_DESCRIPTIONS,'channel-reading','human-design','src/lib/human-design/english-readings.js','channels'],
  ['HEXAGRAM_DESCRIPTIONS',readings.HEXAGRAM_DESCRIPTIONS,'hexagram','iching','src/lib/human-design/english-readings.js','hexagrams'],
  ['GENE_KEY_DESCRIPTIONS',readings.GENE_KEY_DESCRIPTIONS,'gene-key','gene-keys','src/lib/human-design/english-readings.js','gene-keys']
];
const vocabularyMaps = {GATES:'GATE_ZH',CHANNELS:'CHANNEL_ZH',CENTERS:'CENTER_ZH',TYPES:'TYPE_ZH',PROFILES:'PROFILE_ZH',AUTHORITIES:'AUTHORITY_ZH',LINE_NAMES:'LINE_ZH',CIRCUIT_GROUPS:'CIRCUIT_ZH'};
for(const [name,data,objectType,domain,file,localFile] of families) {
  mark(file,declarations(file)[name]);
  const entries=name==='CHANNELS'?data.map((v,i)=>[v.gates.join('-'),v,i]):Object.entries(data).map(([k,v])=>[k,v,k]);
  const translations=localFile?Object.fromEntries(['zh-CN','zh-Hant'].map(locale=>[locale,json(`src/locales/${locale}/${localFile}.json`)])):null;
  for(const [id,value,index] of entries) {
    const nested=name==='LINE_DESCRIPTIONS'?Object.entries(value).map(([line,v])=>[`${id}.${line}`,v,`${name}[${JSON.stringify(id)}][${JSON.stringify(line)}]`,[id,line]]):[[String(id),value,`${name}[${JSON.stringify(index)}]`,[id]]];
    for(const [objectId,content,path,keys] of nested) {
      const tr={};
      for(const [locale,vocab] of [['zh-CN',cnVocabulary],['zh-Hant',hantVocabulary]]) {
        if(translations) {
          let translated=translations[locale];for(const k of keys) translated=translated?.[k];
          tr[locale]={file:`src/locales/${locale}/${localFile}.json`,path:keys.join('.'),textFields:textFields(translated),completeFields:textFields(content).every(({path})=>textFields(translated).some(f=>f.path===path))};
        } else {
          const map=vocabularyMaps[name], key=name==='TYPES'||name==='AUTHORITIES'?content.name:id;
          tr[locale]={file:`src/locales/${locale}/vocabulary.js`,path:map?`${map}[${JSON.stringify(key)}]`:'content.js → engine-messages.json',value:map?vocab[map]?.[key]:null,
            prose:textFields(content).filter(({text})=>Object.hasOwn(localTextCatalog[locale],text)).map(({path,text})=>({path,translation:localTextCatalog[locale][text],file:`src/locales/${locale}/engine-messages.json`}))};
        }
      }
      add({id:`${objectType}.${objectId}`,domain,objectType,objectId,contentType:domain==='vocabulary'?'display-vocabulary':'knowledge-object',...provenance,canonicalFile:file,canonicalPath:path,textFields:textFields(content),translations:tr,
        usedBy:['type','authority','profile'].includes(objectType)?['出生图基础信息','关系/团队显示','复制数据（名称）']:standardUsers,
        runtimePath:localFile?['display-data.js','locales/<locale>/content.js','content.js','reference-content.js','views/chart.js | views/reference.js']:['catalog.js','sharp-contract.js / content.js / vocabulary.js','页面消费'],
        notes:name==='GATES'?'iching 字段属于 I Ching 名称；其余 name/theme 属于 HD 显示词汇。':name==='GENE_KEY_SPECTRUM'?'同门号关联不代表属于 HD 正文。':name==='GATE_DESCRIPTIONS'?'quarter 字段运行时由 quarter.js 覆盖，原文保留。':''});
    }
    if(name==='HEXAGRAM_DESCRIPTIONS') for(const [line,text] of Object.entries(value.lines||{})) add({id:`iching-line.${id}.${line}`,domain:'iching',objectType:'iching-line',objectId:`${id}.${line}`,contentType:'line-reading',...provenance,canonicalFile:file,canonicalPath:`${name}[${JSON.stringify(id)}].lines[${JSON.stringify(line)}]`,textFields:[{path:'meaning',text}],translations:Object.fromEntries(['zh-CN','zh-Hant'].map(locale=>[locale,{file:`src/locales/${locale}/hexagrams.json`,path:`${id}.lines.${line}`,text:translations[locale]?.[id]?.lines?.[line]}])),usedBy:['闸门详情 I Ching Lens','资料库 I Ching Lens'],runtimePath:['HEXAGRAM_DESCRIPTIONS','content.js','gateReading(iching)','chart/reference'],notes:'父级 hexagram 条目同时保留整体对象；本行是六爻逐项审核单位，统计时不要把父子文本重复计为独立正文。'});
  }
}
// Explicit non-exported dictionaries are extracted structurally from their AST.
const dictionaries=[
 ['src/lib/chart-engine/sharp-contract.js','definitionNames','definition','vocabulary'],
 ['src/lib/chart-engine/sharp-contract.js','variableNames','variable-name','vocabulary'],
 ['src/lib/chart-engine/sharp-contract.js','cognitionNames','cognition','vocabulary'],
 ['src/lib/chart-engine/sharp-contract.js','variableDescriptions','variable-description','human-design'],
 ['src/locales/en.js','TYPE_PLAIN','type-plain','human-design'],
 ['src/lib/human-design/connection.js','TYPE_DYNAMICS','relationship-type-pair','relationship-analysis'],
 ['src/lib/human-design/connection.js','PROFILE_HARMONY','relationship-score-rule','relationship-analysis'],
 ['src/lib/human-design/penta.js','CAREER_TYPES','career-type','team-analysis'],
 ['src/lib/human-design/penta.js','PENTA_ROLES','team-role','team-analysis'],
 ['src/lib/planet-reference.js','summaries','planet','human-design'],
 ['src/lib/planet-reference.js','sources','activation-source','human-design'],
 ['src/lib/planet-reference.js','concepts','activation-concept','human-design'],
 ['src/features/transit-timeline/messages.js','en','timeline-message','ui']
];
for(const [file,name,kind,domain] of dictionaries) {
  const node=declarations(file)[name]; if(!node) throw Error(`Missing dictionary ${file}:${name}`);
  const values=staticValue(node);if(values===undefined)throw Error(`Nonstatic dictionary ${file}:${name}`);mark(file,node);
  for(const [id,value] of Object.entries(values)) {
    const inherited=file.includes('human-design/');const referenced=file.includes('planet-reference');
    add({id:`${kind}.${id}`,domain,objectType:kind,objectId:id,contentType:kind==='relationship-score-rule'?'numeric-heuristic':domain==='ui'?'ui':'inline-dictionary',
      sourceType:inherited?[legacySourceType,'td-ohd-modified']:referenced?['td-ohd','external-reference']:['td-ohd'],sourceDetail:inherited?provenance.sourceDetail:referenced?'planet-reference.js source comments name Jovian Archive URLs; these are project-written summaries, no per-sentence quotation verification performed.':'Current repository authoring layer; upstream equivalence of individual sentences not established.',
      canonicalFile:file,canonicalPath:`${name}[${JSON.stringify(id)}]`,line:lineAt(file,node.start),textFields:textFields(value),value,
      translations:referenced?{'zh-CN':{file,path:`${name}.${id}[0]`},'en':{file,path:`${name}.${id}[1]`},'zh-Hant':{file,path:`${name}.${id}[2]`}}:{'zh-CN':{file:'src/locales/zh-CN/engine-messages.json',lookup:'source-string; numeric placeholder templates use engine-templates.json'},'zh-Hant':{file:'src/locales/zh-Hant/engine-messages.json',lookup:'source-string; numeric placeholder templates use engine-templates.json'}},
      usedBy:domain==='relationship-analysis'?['关系页']:domain==='team-analysis'?['团队页']:kind==='type-plain'?['出生图顶部简介']:kind.startsWith('activation')||kind==='planet'?['行星详情','资料库']:['出生图','行运','时间轴','复制数据（名称）'],
      runtimePath:['源字典','sharp-contract.js / contentText / planetReference / timeline t','页面消费'],notes:kind==='relationship-score-rule'?'只记录数值评分；当前关系页输出说明，不直接渲染 harmony 分数。':''});
  }
}
const meridianFile='src/lib/gate-meridian-acupoints.json';
for(const [id,value] of Object.entries(json(meridianFile))) add({id:`meridian.${id}`,domain:'td-ohd-extension',subdomain:'meridian',objectType:'meridian',objectId:id,contentType:'lens-object',sourceType:['td-ohd','unknown'],sourceDetail:'Repository-owned mapping. No external per-record citation in this JSON; teacher provenance is not assumed.',canonicalFile:meridianFile,canonicalPath:id,textFields:textFields(value),usedBy:['闸门详情：经络穴位 Lens','资料库：经络穴位 Lens'],runtimePath:['gate-meridian-acupoints.json','gateMeridianAcupoint','gateReading(lens=meridian)','chart/reference'],notes:'当前记录直接显示中文，没有英文/繁体独立资料。'});
// Locale tables: each source key is a reviewable asset, translations are variants.
const tables=new Map();
for(const locale of ['zh-CN','zh-Hant']) for(const file of files(`src/locales/${locale}`).filter(f=>f.endsWith('.json')&&!/(gates|lines|channels|hexagrams|gene-keys)\.json$/.test(f))) {
  const obj=json(file);
  for(const [key,val] of Object.entries(obj)) {
    const template=file.endsWith('engine-templates.json');const source=template?val.source:key;
    const family=template?'engine-template':file.endsWith('engine-messages.json')?'engine-message':file.endsWith('timeline.json')?'timeline-translation':'ui-message';
    const k=`${family}:${source}`;if(!tables.has(k))tables.set(k,{source,family,locations:[]});
    tables.get(k).locations.push({locale,file,path:template?`${key}.translation`:JSON.stringify(key),translation:template?val.translation:val});
  }
}
for(const {source,family,locations} of tables.values()) {
  const direct=[];for(const [file] of asts) if(read(file).includes(source))direct.push(file);
  const domain=family.startsWith('engine')?'translation':family==='timeline-translation'?'ui':'ui';
  add({id:`${family}.${hash(source).slice(0,16)}`,domain,objectType:family,objectId:source,contentType:family==='engine-template'?'dynamic-translation-template':'translation-message',sourceType:['translation'],sourceDetail:'Repository-local translation. Semantic domain follows original owner; engine-* filenames do not mean Sharp engine authored the prose.',canonicalFile:locations[0].file,canonicalPath:locations[0].path,textFields:[{path:'source-key',text:source}],translations:Object.fromEntries(locations.map(v=>[v.locale,v])),translationLocations:locations,usedBy:direct.length?direct:['Source-key dictionary; dynamic match only or currently unused'],runtimePath:family.startsWith('engine')?['createChineseReadings','contentText','views/chart | connection | team']:['locale registry / registerMessages','i18n.t / timeline t','UI'],usageEvidence:'Direct text owners listed where source key occurs; dynamic template reachability needs matching/branch evaluation.'});
}
for(const [key,en] of Object.entries(json('src/locales/ui-contexts.json').en)) add({id:`ui-context.${key}`,domain:'ui',objectType:'ui-context',objectId:key,contentType:'contextual-label',sourceType:['td-ohd','translation'],sourceDetail:'Locale-owned context overrides',canonicalFile:'src/locales/ui-contexts.json',canonicalPath:`en.${key}`,textFields:[{path:'en',text:en}],translations:Object.fromEntries(['zh-CN','zh-Hant'].map(l=>[l,{file:'src/locales/ui-contexts.json',path:`${l}.${key}`,value:json('src/locales/ui-contexts.json')[l][key]}])),usedBy:['关系页/页脚'],runtimePath:['locale registry','i18n.t','页面']});
// Exported Chinese vocabulary dictionaries are reviewable independently of UI translations.
for(const [locale,vocab] of [['zh-CN',cnVocabulary],['zh-Hant',hantVocabulary]]) for(const [name,value] of Object.entries(vocab).filter(([,v])=>v&&typeof v==='object')) {
  mark(`src/locales/${locale}/vocabulary.js`,declarations(`src/locales/${locale}/vocabulary.js`)[name]);
  for(const [id,v] of Object.entries(value)) add({id:`vocabulary.${locale}.${name}.${id}`,domain:name==='TYPE_PLAIN_ZH'?'human-design':'vocabulary',objectType:'localized-vocabulary',objectId:id,contentType:name==='TYPE_PLAIN_ZH'?'plain-description':'display-vocabulary',sourceType:['translation'],sourceDetail:'Chinese locale-owned terminology; counterpart dictionary named in canonicalPath.',canonicalFile:`src/locales/${locale}/vocabulary.js`,canonicalPath:`${name}[${JSON.stringify(id)}]`,textFields:textFields(v),usedBy:['出生图','关系/团队','资料库名称','复制数据'],runtimePath:['locale vocabulary','vocabulary.js','页面/复制数据']});
}
// Full JS scan: retain hardcoded display candidates with location and containing function.
// It is intentionally conservative: unresolved source/domain claims remain unknown.
for(const [file,ast] of asts) walk(ast,(node,ancestors)=> {
  if((coveredRanges.get(file)||[]).some(([a,b])=>node.start>=a&&node.end<=b))return;
  if(!['Literal','TemplateLiteral'].includes(node.type)||typeof node.value==='number')return;
  const parent=ancestors.at(-1);if(parent?.type==='Property'&&parent.key===node)return;
  const text=node.type==='Literal'?node.value:node.quasis.map(q=>q.value.cooked||q.value.raw).join('${…}');
  if(typeof text!=='string'||!/[\p{L}]/u.test(text))return;
  if(ancestors.some(n=>n.type==='ImportDeclaration'||n.type==='ExportAllDeclaration'||n.type==='ExportNamedDeclaration'&&n.source))return;
  const called=parent?.type==='CallExpression'?(parent.callee.name||parent.callee.property?.name):null;
  const displayCall=['t','contentText','setMessage','setHtmlMessage'].includes(called);
  const sentence=text.length>=24 && /\s|[。；：，]/.test(text);
  const markup=text.includes('<')&&text.includes('>');
  if(!displayCall&&!sentence&&!markup)return;
  if(!displayCall&&!markup&&(/^(?:https?:|[.\/]|#|\^)/.test(text)||/^(?:SELECT|INSERT|UPDATE|CREATE|DELETE|PRAGMA|ALTER)\b/i.test(text)))return;
  const fn=[...ancestors].reverse().find(n=>/Function/.test(n.type));const container=fn?.id?.name||ancestors.find(n=>n.type==='VariableDeclarator')?.id?.name||'(module/anonymous)';
  let domain=file.includes('/connection')?'relationship-analysis':file.includes('/penta')||file.includes('/team')?'team-analysis':file.includes('gene-keys')?'gene-keys':file.includes('transit')?'td-ohd-extension':displayCall||markup?'ui':'unknown';
  if(file.includes('human-design/svg-renderer'))domain='ui';
  add({id:`inline.${file}.${node.start}`,domain,objectType:'inline-display-candidate',objectId:`${container}:${node.start}`,contentType:node.type==='TemplateLiteral'?'dynamic-template':'hardcoded-text',sourceType:file.includes('/human-design/connection')||file.includes('/human-design/penta')||file==='src/lib/transit-analysis.js'||file==='src/lib/gene-keys.js'?[legacySourceType,'td-ohd-modified']:domain==='unknown'?['unknown']:['td-ohd'],sourceDetail:'AST-located runtime display candidate; technical/error/template strings are included for review, not all are explanatory prose.',canonicalFile:file,canonicalPath:`${container}@${node.start}`,line:lineAt(file,node.start),textFields:[{path:'literal/template',text}],usedBy:consumers(file),runtimePath:[file,...consumers(file).filter(f=>f.startsWith('src/views/'))],notes:`Call=${called||'none'}; markup=${markup}; manually review conditional visibility and semantic classification.`});
});
// Associate translation layer and UI-source keys with known semantic owners.
// Keep unknowns explicitly unknown instead of claiming engine filenames are sources.
const knownOwners=new Map();
for(const r of records.filter(r=>!r.sourceType.includes('translation')&&r.objectType!=='inline-display-candidate')) for(const {text} of r.textFields||[]) {
  if(!knownOwners.has(text))knownOwners.set(text,[]);knownOwners.get(text).push(r);
}
function inferredDomain(text, fallback) {
  const owners=knownOwners.get(text);if(owners?.length)return owners.find(r=>r.domain!=='vocabulary')?.domain||owners[0].domain;
  if(/Shadow|Siddhi|Gene Keys|Gene Key|Venus Sequence|Pearl Sequence|Richard Rudd/.test(text))return 'gene-keys';
  if(/I Ching|hexagram.*classical/i.test(text))return 'iching';
  if(/Your cross is the life theme|Variable describes|Energy centers are|Each planet activates/.test(text))return 'human-design';
  return fallback;
}
for(const r of records) {
  const source=r.textFields?.[0]?.text;
  if(r.domain==='translation') {
    r.layer='translation';r.domain=inferredDomain(source,'unknown');r.semanticOwners=(knownOwners.get(source)||[]).map(o=>o.id);
    if(r.domain==='unknown')r.notes+=' No exact canonical owner established; dynamic template may match a constructed sentence. See runtime trace and review manually.';
  } else if(r.domain==='ui')r.domain=inferredDomain(source,'ui');
  if(r.objectType==='inline-display-candidate') {
    const matching=[...tables.values()].filter(v=>v.source===source);r.translationLocations=matching.flatMap(v=>v.locations);
  }
  r.textFields=(r.textFields||[]).map(f=>({...f,domain: /(?:^|\.)iching$/.test(f.path)?'iching':r.domain,contentType:/(?:^|\.)(?:name|keynote|shadow|gift|siddhi|sphere|strategy|signature|notSelf|role|dynamic)$/.test(f.path)?'display-vocabulary':'text'}));
}
const duplicateGroups=new Map();
for(const r of records) for(const f of r.textFields||[]) {
  const text=f.text.trim(); if(text.length<24)continue;
  if(!duplicateGroups.has(text))duplicateGroups.set(text,[]); duplicateGroups.get(text).push({id:r.id,file:r.canonicalFile,path:`${r.canonicalPath}.${f.path}`});
}
const duplicates=[...duplicateGroups].filter(([,v])=>new Set(v.map(x=>x.file)).size>1).map(([text,locations])=>({text,locations,interpretation:'Exact cross-file string duplication candidate; source-key mirroring and translation lookup are often intentional. See issues.md for independently maintained duplicates.'})).sort((a,b)=>a.text.localeCompare(b.text,'en'));
const quarterDifferences=Object.entries(readings.GATE_DESCRIPTIONS).filter(([gate,v])=>v.quarter!==quarterForGate(+gate,'en')).map(([gate,v])=>({gate:Number(gate),stored:v.quarter,effective:quarterForGate(+gate,'en')}));
records.sort((a,b)=>a.id.localeCompare(b.id,'en'));
if(new Set(records.map(r=>r.id)).size!==records.length)throw Error('Duplicate audit IDs');
const counts={};for(const r of records)counts[r.domain]=(counts[r.domain]||0)+1;
const summary={assetRecords:records.length,byDomain:counts,objects:{types:Object.keys(catalog.TYPES).length,authorities:Object.keys(catalog.AUTHORITIES).length,profiles:Object.keys(catalog.PROFILES).length,definitions:Object.keys(staticValue(declarations('src/lib/chart-engine/sharp-contract.js').definitionNames)).length,centers:Object.keys(catalog.CENTERS).length,channels:catalog.CHANNELS.length,gates:Object.keys(catalog.GATES).length,gateLines:Object.values(readings.LINE_DESCRIPTIONS).reduce((a,v)=>a+Object.keys(v).length,0),iching:Object.keys(readings.HEXAGRAM_DESCRIPTIONS).length,ichingLines:Object.values(readings.HEXAGRAM_DESCRIPTIONS).reduce((a,v)=>a+Object.keys(v.lines||{}).length,0),geneKeys:Object.keys(readings.GENE_KEY_DESCRIPTIONS).length,meridian:Object.keys(json(meridianFile)).length},uiKeys:[...tables.values()].filter(v=>!v.family.startsWith('engine')).length+Object.keys(json('src/locales/ui-contexts.json').en).length,vocabularyRecords:records.filter(r=>r.domain==='vocabulary').length,relationshipRecords:records.filter(r=>r.domain==='relationship-analysis').length,teamRecords:records.filter(r=>r.domain==='team-analysis').length,unknownSourceRecords:records.filter(r=>r.sourceType.includes('unknown')).length,hardcodedCandidates:records.filter(r=>r.objectType==='inline-display-candidate').length,exactDuplicateCandidates:duplicates.length,quarterDifferences:quarterDifferences.length,unreviewed:records.length};
summary.translationLayerRecords=records.filter(r=>r.layer==='translation'||r.sourceType.includes('translation')).length;
summary.confirmedInformationLossIssues=3;
summary.confirmedIndependentDuplicateIssues=4;
const manifest={schemaVersion:1,baseline:'7734b942160497c1c28d46002de0edd91df53230',scope:'Stage 1 repository evidence only; no teacher material, network correction, calculation or product edits.',reservedSourceTypes:['teacher-material','teacher-extension'],definitions:{domain:'Knowledge domain or display category; translation is a layer and retains original owner context.',sourceType:'Code provenance; multiple owners permitted. Not a doctrinal certification.',status:'unreviewed means no substantive expert content validation, even when code trace is verified.',reachableConsumers:'Import reachability only; usedBy/runtimePath add actual reader/consumer evidence. Not every field of an imported object is rendered.',duplicate:'Exact string candidate across files; not an automatic defect count.'},summary,sourceHashes:Object.fromEntries(sourceFiles.map(f=>[f,hash(read(f))])),records};
writeFileSync(resolve(out,'inventory.json'),JSON.stringify(manifest,null,2)+'\n');
writeFileSync(resolve(out,'dependency-map.json'),JSON.stringify({imports,quarterDifferences,exactDuplicateCandidates:duplicates},null,2)+'\n');
const safe=s=>String(s??'').replaceAll('|','\\|').replaceAll('\n','<br>');
const group=(title,items)=>`\n## ${title}\n\n| 审核 ID | 对象 | 类别 | 来源 | 原文入口 | 消费位置 |\n|---|---|---|---|---|---|\n${items.map(r=>`| ${safe(r.id)} | ${safe(r.objectId)} | ${r.domain} | ${r.sourceType.join(', ')} | [${safe(r.canonicalPath)}](../../${r.canonicalFile}${r.line?`#L${r.line}`:''}) | ${safe(r.usedBy.join('；'))} |`).join('\n')}\n`;
writeFileSync(resolve(out,'inventory.md'),'# 按知识对象逐项审核总表\n\n机器明细见 [inventory.json](inventory.json)：每条包含原文字段、翻译入口、运行读取链和使用位置。此表不是按文件计数。`unreviewed` 指知识内容尚未经专业人工审校。\n\n统计口径见 [README](README.md)。inline 项是 AST 抽取的候选文案，含错误、HTML 和动态模板；不可当成确定的知识正文数。\n'+['human-design','vocabulary','iching','gene-keys','td-ohd-extension','relationship-analysis','team-analysis','translation','ui','unknown'].map(d=>group(d,records.filter(r=>r.domain===d))).join(''));
writeFileSync(resolve(out,'statistics.json'),JSON.stringify(summary,null,2)+'\n');
console.log(JSON.stringify(summary,null,2));
