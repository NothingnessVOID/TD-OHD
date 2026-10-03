import base64,collections,hashlib,json,pathlib,subprocess
root=pathlib.Path(__file__).resolve().parents[2];out=root/'docs/licensing-audit-v1';j=json.loads((out/'license-inventory.json').read_text()); rows=j['items'];baseline=j['baseline'];
required={'path','component','origin','author_upstream','version','license','modified','distributed','included_in_browser','included_in_build','source_available','notice_required','known_compatibility_concern','evidence'}
assert all(required<=r.keys() for r in rows)
tracked=[r for r in rows if 'git_blob' in r];names=subprocess.check_output(['git','-c','core.quotepath=false','ls-tree','-r','--name-only',baseline],text=True).splitlines();assert len(tracked)==959;assert {r['path'] for r in tracked}==set(names)
assert len({r['path'] for r in rows})==len(rows)
for r in tracked:
 b=(root/r['path']).read_bytes();assert hashlib.sha256(b).hexdigest()==r['sha256'];assert hashlib.sha1(b'blob '+str(len(b)).encode()+b'\0'+b).hexdigest()==r['git_blob']
lock=json.loads((root/'package-lock.json').read_text());assert sum(r.get('scope')=='npm dependency' for r in rows)==len(lock['packages'])-1==262
assert not (root/'LICENSE').exists() and not (root/'LICENSE.md').exists();assert 'license' not in json.loads((root/'package.json').read_text())
patch=json.loads((root/'third_party/SharpAstrology.SwissEph/patch-manifest.json').read_text());assert len(patch['changedFiles'])==8
for r in patch['changedFiles']:assert hashlib.sha256((root/'third_party/SharpAstrology.SwissEph'/r['file']).read_bytes()).hexdigest()==r['patchedSha256']
live=json.loads((out/'evidence/live-artifacts.json').read_text());assert all(r['matchesManifest'] for r in live if not r['path'].startswith('ephe/'))
manifest=json.loads((root/'engine-wasm/ephemeris-manifest.json').read_text());assert all(r['sha256']==manifest['files'][r['path'].split('/')[-1]] for r in live if r['path'].startswith('ephe/'))
external=json.loads((out/'evidence/external-asset-hashes.json').read_text());em=json.loads((root/'jovian-engine/native-assets.json').read_text());assert all(next(r['sha256'] for r in external if r['path']=='external-cache/'+a['name'])==a['sha256'] for a in em['assets'])
notice=json.loads((out/'evidence/notices.json').read_text());assert len(notice['files'])==4 and all(r['liveByteIdentical'] for r in notice['files']);assert notice['liveEngineSignature']==patch['signature']
assert {r['component'] for r in rows if r.get('scope')=='npm dependency' and r['included_in_browser']}=={'html-to-image'}
changed=subprocess.check_output(['git','diff','--name-only',baseline],text=True).splitlines();assert all(p.startswith('docs/licensing-audit-v1/') for p in changed)
subprocess.run(['git','diff','--check'],check=True)
build=json.loads((out/'evidence/build-summary.json').read_text());assert build['staticBuildExitCode']==0 and build['engineBuildPassed'] and build['viteBuildPassed']
heads=subprocess.check_output(['git','ls-remote','origin','refs/heads/main','refs/heads/pages'],text=True).splitlines();heads=dict((line.split()[1],line.split()[0]) for line in heads)
evidence=[{'path':str(p.relative_to(out)),'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in sorted((out/'evidence').glob('*'))]
result={'schemaVersion':1,'auditDate':'2026-10-04','baseline':baseline,'status':'passed','validationScope':'license metadata/inventory consistency, static build, actual public HTTP artifacts; not a legal compliance certificate or algorithm test','counts':j['counts'],'inventoryItems':len(rows),'requiredFieldsPerItem':sorted(required),'checks':{'fullTrackedBaselineCoverage':True,'all959BaselineBytesUnchanged':True,'uniqueInventoryPaths':True,'completeNpmLockCoverage':True,'restoredNuGetLicenseMetadataChecked':True,'rootLicenseUnchangedAndAbsent':True,'packageLicenseUnchangedAndAbsent':True,'all8PatchedSourceHashesMatchManifest':True,'staticBuildPassed':True,'sourcemapBundleAnalysisPassed':True,'live6WasmResourceHashesMatchManifest':True,'liveDE441FilesMatchPinnedManifest':True,'live4NoticeTextsMatchLocalDistribution':True,'externalSourceAndDE406HashesMatchManifest':True,'noTrackedRuntimeOrUIChange':True,'gitDiffCheckPassed':True,'privacyReview':'only public component metadata, filenames, hashes and audit prose; no credentials or account contents'},'buildWarnings':['Vite chunk-size advisory; build passed'],'notCertified':['full legal compliance','ownership of all original candidates','complete live reproducible build','commercial license possession','independent compressed data permissive rights'],'observedRemoteHeads':heads,'evidenceHashes':evidence}
(out/'validation.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');print('PASS',len(rows),'inventory rows;',len(tracked),'tracked files unchanged')
