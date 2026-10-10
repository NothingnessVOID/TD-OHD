import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { auditRoot, incrementHead, incrementBase, incrementManifestPath, validateIncrementManifest, validateReleaseIncrement, incrementProjection, snapshotBytes } from './helpers/release-increment-projection.js';
const read = file => readFileSync(path.join(auditRoot, file));
import {validationPaths,validationHead} from './helpers/release-validation-projection.js';
const inventory = execFileSync('git', ['ls-tree','-r','--name-only',incrementHead], {cwd:auditRoot}).toString().trim().split('\n').filter(file => /^(src\/|engine-core\/|engine-tools\/|engine-wasm\/|jovian-engine\/|scripts\/|third_party\/|public\/transit-data\/)/.test(file) || ['index.html','package.json','package-lock.json','vite.config.js','.env.production'].includes(file));
inventory.push(...validationPaths.filter(file=>!inventory.includes(file)));
const validateMutation = (file, transform) => {
 const original = read(file), mutated = Buffer.from(transform(original.toString()));
 assert.notDeepEqual(mutated, original, 'Mutation must actually change bytes');
 assert.throws(() => validateReleaseIncrement(auditRoot, { files: inventory, read: p => p === file ? mutated : read(p) }), /Unreviewed increment source/);
};

test('fixed reviewed increment validates current inventory, evidence and unchanged algorithm/knowledge bytes', () => {
 const result = validateReleaseIncrement();
 assert.equal(result.reviewedFiles, 56);
 assert.ok(result.protectedFiles > 300);
 assert.ok(result.unchangedInvariants > 50);
});
test('every existing reviewed file validates before projection; every unreviewed byte fails', () => {
 const manifest = validateIncrementManifest();
 const base = new Set(execFileSync('git',['ls-tree','-r','--name-only',incrementBase],{cwd:auditRoot}).toString().trim().split('\n'));
 for(const file of Object.keys(manifest.files)) {
  const current = read(file);
  assert.throws(() => incrementProjection(Buffer.concat([current,Buffer.from('\n// mutation')]),file), /Unreviewed increment source/);
  if(base.has(file)) assert.deepEqual(incrementProjection(current,file),snapshotBytes(incrementBase,file));
  else assert.throws(() => incrementProjection(current,file), /no historical projection/);
 }
});
test('algorithm mutations stay forbidden outside all presentation projections', () => {
 validateMutation('src/lib/human-design/penta-structure.js', text => text+'\n// altered coverage algorithm\n');
 validateMutation('engine-core/TransitCore.cs', text => text.replace('activation.Longitude);','activation.Longitude + 1);'));
});
test('storage contract changes are rejected even in an authorized UUID compatibility file', () => {
 validateMutation('src/lib/team-repository.js', text => text.replace("'ohd-teams-v1'", "'ohd-teams-v9'"));
 validateMutation('src/lib/profile-storage.js', text => text.replace('createdAt: previous?.createdAt || profile.createdAt || now', 'createdAt: now'));
});
test('knowledge review bypass and content mutations cannot be hidden by projection', () => {
 validateMutation('src/lib/shared-object-details.js', text => text.replace("entry.reviewStatus !== 'reviewed'", 'false'));
 validateMutation('src/views/penta-matrix.js', text => text.replace("entry.properties.interpretationStatus !== 'verified'", 'false'));
 validateMutation('src/lib/knowledge/content/penta.js', text => text+'\n// unreviewed content\n');
});
test('unrelated functions and annual integrity checks remain guarded', () => {
 validateMutation('src/views/connection.js', text => text.replace('function rerenderConnectionGraphs()', 'function rerenderConnectionGraphs(/* mutation */)'));
 validateMutation('src/features/transit-timeline/annual-loader.js', text => text.replace('actual !== entry.sha256', 'false'));
});
test('manifest expansion, repinning and simultaneous source/manifest edits all fail', () => {
 const original = JSON.parse(read(incrementManifestPath));
 for (const mutate of [m=>{m.files['src/lib/human-design/penta-structure.js']='approve algorithm';}, m=>{m.reviewedHead=incrementBase;}, m=>{m.files['src/views/team.js']='approve changed source';}]) {
  const manifest=structuredClone(original); mutate(manifest);
  const changed=Buffer.from(JSON.stringify(manifest));
  assert.throws(()=>validateIncrementManifest(changed), /Unreviewed increment manifest/);
  assert.throws(()=>validateReleaseIncrement(auditRoot,{files:inventory,read:file=>file===incrementManifestPath?changed:file==='src/views/team.js'?Buffer.from('changed source'):read(file)}),/Unreviewed increment manifest/);
 }
});
test('editing old historical proof inputs cannot be concealed by the temporary snapshot', () => {
 const file = 'docs/team/PHASE1E-REVIEW-SOURCE-SCOPE.json';
 assert.throws(()=>validateReleaseIncrement(auditRoot,{files:inventory,read:p=>p===file?Buffer.from('{}'):read(p)}),/Historical audit input changed/);
});
test('release blocker fixes have exact independent snapshot coverage and mutation rejection',()=>{
 for(const file of validationPaths) {
  assert.deepEqual(read(file),snapshotBytes(validationHead,file));
  validateMutation(file,text=>text+'\n// unreviewed change');
 }
});
test('new unauthorized paths cannot enter the current source inventory', () => {
 assert.throws(()=>validateReleaseIncrement(auditRoot,{files:[...inventory,'src/lib/unreviewed.js']}),/Unreviewed increment source inventory/);
});
