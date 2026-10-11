// Prepare an auditable content upgrade; staged output is applied with structured file tools.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';
export const BASE = 'c379fbe6b9a1b4b472b900aeedc691275407c3f8';
const input = resolve(process.argv[2] ?? '../../penta-wa-development-v2-input/penta-wa-development-v2');
const output = resolve(process.argv[3] ?? join(tmpdir(), 'td-ohd-penta-wa-v2-content'));
const read = path => JSON.parse(readFileSync(join(input, path), 'utf8'));
const baseRead = path => JSON.parse(execFileSync('git', ['show', `${BASE}:${path}`], { encoding:'utf8', maxBuffer:8*1024*1024 }));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const manifest = paths => paths.map(path => { const bytes=readFileSync(join(input,path)); return {path,bytes:bytes.length,sha256:hash(bytes)}; });
const old = baseRead('src/lib/knowledge/content/penta-v1.json');
const oldWa = baseRead('src/lib/wa/content-data.json');
const files = ['penta/gates.json','penta/channels.json','penta/mechanisms.json','wa/content.json'];
const docs = Object.fromEntries(files.map(path=>[path,read(path)]));
const records = files.slice(0,3).flatMap(path=>docs[path].records);
const wa = docs['wa/content.json'].records;
const all = [...records,...wa], baseline = [...old.records,...oldWa];
assert.equal(all.length,44); assert.equal(new Set(all.map(r=>r.id)).size,44);
assert.equal(records.length,30); assert.equal(wa.length,14);
const delta=read('changes/DELTA.json');
const changes=new Map(delta.contentChanges.map(item=>[item.id,item]));
for(const prior of baseline) {
  const current=all.find(item=>item.id===prior.id); assert.ok(current,prior.id);
  for(const key of ['id','objectId','objectType']) assert.equal(current[key],prior[key]);
  const change=changes.get(prior.id);
  if(!change || change.metadata_only) assert.deepEqual(current.locales,prior.locales,prior.id);
  else for(const locale of change.locales_changed) assert.notDeepEqual(current.locales[locale],prior.locales[locale],`${prior.id} ${locale}`);
}
assert.deepEqual(all.filter(item=>!baseline.some(prior=>prior.id===item.id)).map(item=>item.id),['hd.penta.triggering']);
assert.deepEqual(read('integration/generated/penta-content.json'),records);
assert.deepEqual(read('integration/generated/wa-content.json'),wa);
const registry=read('sources/resolved-registry.json').sources;
const refs=[...new Set(all.flatMap(item=>item.sourceRefs.map(ref=>typeof ref==='string'?ref:ref.sourceId??ref.id)))];
for(const id of refs) assert.ok(registry[id],id);
const sourceFiles=['sources/resolved-registry.json','sources/gates-specialist-v2.json','sources/penta-mechanisms-v2.json','sources/wa-specialist-v2.json'];
const reviewFiles=['validation/editorial-cross-review.json','validation/editorial-resolution.json','validation/editorial-check.json','validation/v2-release-check.json'];
const {records:oldRecords,...oldMetadata}=old;
const data={...old,
  contentPackage:'penta-wa-development-v2',contentVersion:2,
  inputFiles:manifest([...files,...sourceFiles,...reviewFiles,'changes/DELTA.json','package.json']),
  sourceRegistry:Object.fromEntries(refs.map(id=>[id,registry[id]])),
  // Historical review hashes retain their original scope; never relabel them as v2 approval.
  history:{'penta-wa-development-v1':oldMetadata},
  inputDocuments:Object.fromEntries(files.map(path=>{const {records,...metadata}=docs[path];return [path,metadata];})),
  specialistReviews:Object.fromEntries(sourceFiles.slice(1).map(path=>[path,read(path)])),
  reviewHistory:{...old.reviewHistory,
    versionScope:{crossReview:'penta-wa-development-v1',resolution:'penta-wa-development-v1',v2:'penta-wa-development-v2'},
    v2:{package:read('package.json'),editorialCheck:read('validation/editorial-check.json'),releaseCheck:read('validation/v2-release-check.json'),delta}},
  records
};
mkdirSync(output,{recursive:true});
const chunks={};
for(const [name,value] of [['penta-v1.json',data],['content-data.json',wa]]) {
  const text=JSON.stringify(value,null,2)+'\n';
  writeFileSync(join(output,name),text);
  chunks[name]=[];
  for(let i=0;i<text.length;i+=8000) {
    const part=`${name}.${chunks[name].length}.part.json`;
    writeFileSync(join(output,part),JSON.stringify(text.slice(i,i+8000)));
    chunks[name].push(part);
  }
}
writeFileSync(join(output,'chunks.json'),JSON.stringify(chunks));
console.log(JSON.stringify({output,records:all.length,locales:all.length*3,stable:baseline.length,sources:refs.length,unchangedBodies:baseline.filter(prior=>JSON.stringify(prior.locales)===JSON.stringify(all.find(item=>item.id===prior.id).locales)).length},null,2));
