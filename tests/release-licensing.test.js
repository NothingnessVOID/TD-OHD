import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync,mkdirSync,cpSync,rmSync,readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { validateSyncedRelease } from '../docs/frontend-knowledge-sync-v1/validate.mjs';
import { validateDistribution } from '../docs/release-licensing-v1/validate.mjs';
const root=path.resolve(import.meta.dirname,'..');
test('required full notices are copied into the actual static distribution',()=>{assert.equal(validateDistribution(),true);});
test('distribution check rejects an omitted Base license',()=>{
 const temp=mkdtempSync(path.join(tmpdir(),'release-notice-test-'));
 try{
  // This negative case needs only the required notices, not the runtime tree.
  // Copy exact identity paths to avoid traversing unrelated distribution folders.
  const identity=JSON.parse(readFileSync(path.join(root,'docs/release-licensing-v1/production-identity.json')));
  for(const file of identity.distributionLicensePaths){
   const target=path.join(temp,file);mkdirSync(path.dirname(target),{recursive:true});
   cpSync(path.join(root,'dist',file),target);
  }
  rmSync(path.join(temp,'engine/licenses/SharpAstrology.Base-MIT.txt'));
  assert.throws(()=>validateDistribution(temp),/Missing distribution notice/);
 }finally{rmSync(temp,{recursive:true,force:true});}
});
test('synced frontend and Knowledge build preserves both reviewed source parents and notices',()=>{assert.equal(validateSyncedRelease().passed,true);});
test('manifest retains unresolved root license and distinct metadata provenance',()=>{
 const id=JSON.parse(readFileSync(path.join(root,'docs/release-licensing-v1/production-identity.json')));
 assert.equal(id.calculationBaselineCommit,'4cc718f2ba6aaadc74b3c4036a0191fa9791d657');assert.equal(id.licensingMetadataCommit,null);
 const m=JSON.parse(readFileSync(path.join(root,'docs/release-licensing-v1/release-components.json')));assert.equal(m.components[0].license,'NOASSERTION');
});

test('a regenerated identity cannot silently omit the required Base notice',()=>{
 const id=JSON.parse(readFileSync(path.join(root,'docs/release-licensing-v1/production-identity.json')));
 id.distributionLicensePaths=id.distributionLicensePaths.filter(p=>!p.endsWith('SharpAstrology.Base-MIT.txt'));
 assert.throws(()=>validateDistribution(path.join(root,'dist'),id),/Required notice missing/);
});
