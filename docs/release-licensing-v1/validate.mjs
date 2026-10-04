/** Engineering release-material checks, not a legal compliance certification. */
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=path.resolve(import.meta.dirname,'../..');
const hash=b=>createHash('sha256').update(b).digest('hex');
const json=p=>JSON.parse(readFileSync(p));
export function validateDistribution(dist=path.join(root,'dist'),identity=json(path.join(root,'docs/release-licensing-v1/production-identity.json'))){
 const required=['SharpAstrology.Base-MIT.txt','SharpAstrology.HumanDesign-MIT.txt','SharpAstrology.SwissEph-AGPL-3.0.txt','SharpAstrology.SwissEph-SwissEph.txt','Swiss-Ephemeris-LICENSE.txt','dotnet-runtime-MIT.txt','dotnet-runtime-THIRD-PARTY-NOTICES.txt','System.Numerics.Tensors-MIT.txt','System.Numerics.Tensors-THIRD-PARTY-NOTICES.txt','ICU-LICENSE.txt','html-to-image-MIT.txt','Vite-generated-helpers-LICENSE.txt'];
 for(const name of required)if(!identity.distributionLicensePaths.includes('engine/licenses/'+name))throw new Error('Required notice missing from identity: '+name);
 for(const p of identity.distributionLicensePaths){
  if(!existsSync(path.join(dist,p)))throw new Error('Missing distribution notice: '+p);
  const source=p==='engine/THIRD_PARTY_NOTICES.md'?'THIRD_PARTY_NOTICES.md':'engine-wasm/licenses/'+path.basename(p);
  if(hash(readFileSync(path.join(dist,p)))!==hash(readFileSync(path.join(root,source))))throw new Error('Notice copy differs: '+p);
 }
 for(const [p,h] of Object.entries(identity.licenseSourceHashes))if(hash(readFileSync(path.join(root,p)))!==h)throw new Error('Notice source hash differs: '+p);
 return true;
}
export function validateRelease(rootPath=root){
 const dir=path.join(rootPath,'docs/release-licensing-v1');const identity=json(path.join(dir,'production-identity.json'));const release=json(path.join(dir,'release-components.json'));
 if(identity.engineSignature!=='59b90e629033cc7faf95'||identity.calculationBaselineCommit!==identity.releaseCommit)throw new Error('Calculation identity changed');
 const patch=json(path.join(rootPath,'third_party/SharpAstrology.SwissEph/patch-manifest.json'));
 if(patch.signature!==identity.engineSignature||patch.identity.patchRevision!==identity.patchRevision)throw new Error('Patch correspondence failed');
 for(const [p,h] of Object.entries(identity.relevantSourceHashes))if(hash(readFileSync(path.join(rootPath,p)))!==h)throw new Error('Production source changed: '+p);
 if(release.runtimeComponentCount!==release.components.length||new Set(release.components.map(x=>x.component)).size!==release.components.length)throw new Error('Component identity/count invalid');
 const required=['component','version','upstream','license','modifiedByTdOhd','sourceLocation','distributedArtifact','noticeLocation','includedInBrowser','includedAtRuntime','dataAsset','sha256','notes'];
 for(const c of release.components){
  for(const key of required)if(!(key in c))throw new Error('Missing component field '+key);
  if(c.scope!=='runtime'||!c.includedInBrowser||!c.includedAtRuntime)throw new Error('Non-runtime component in manifest');
  for(const p of c.distributedArtifact)if(!existsSync(path.join(rootPath,'dist',p)))throw new Error('Missing artifact '+p);
  for(const p of c.noticeLocation)if(!identity.distributionLicensePaths.includes(p))throw new Error('Unknown notice '+p);
  for(const [p,h] of Object.entries(c.sha256))if(hash(readFileSync(path.join(rootPath,'dist',p)))!==h)throw new Error('Artifact provenance mismatch '+p);
 }
 for(const [p,h] of Object.entries(identity.ephemerisHashes))if(hash(readFileSync(path.join(rootPath,'dist/engine/ephe',p)))!==h)throw new Error('Ephemeris changed');
 const forbidden=/jovian|swiss176|de406|native_backend/i;
 const evidence=json(path.join(dir,'artifact-evidence.json'));
 if(evidence.localArtifacts.some(x=>forbidden.test(x.name)))throw new Error('Historical runtime in browser');
 const tree=execFileSync('git',['ls-tree','-r','--name-only',identity.calculationBaselineCommit],{cwd:rootPath,encoding:'utf8'}).trim().split('\n');
 const protectedPaths=tree.filter(p=>p.startsWith('src/')||p.startsWith('public/transit-data/')||p.startsWith('third_party/')||p.startsWith('engine-core/')||p.startsWith('engine-tools/')||p.startsWith('jovian-engine/')||p==='package.json'||p==='package-lock.json');
 for(const p of protectedPaths){const original=execFileSync('git',['show',identity.calculationBaselineCommit+':'+p],{cwd:rootPath});if(hash(original)!==hash(readFileSync(path.join(rootPath,p))))throw new Error('Protected baseline changed: '+p);}
 return {passed:true,engineSignature:identity.engineSignature,runtimeComponents:release.components.length,protectedBaselineFiles:protectedPaths.length,calculationChanges:0,annualChanges:0,knowledgeChanges:0,jovianBrowserArtifacts:0};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){validateDistribution();console.log(JSON.stringify(validateRelease(),null,2));}
