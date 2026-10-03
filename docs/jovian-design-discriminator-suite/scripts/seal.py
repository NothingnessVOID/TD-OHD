#!/usr/bin/env python3
"""Prepare C2 Design discriminator draft; explicit --seal creates hash lock.

Refuses overwrite. No official results are read. Model metadata inherits the
previous sealed suite, verifying current native library digests against it.
"""
import argparse,hashlib,json,shutil,sys
from datetime import datetime,timezone
from zoneinfo import ZoneInfo
from pathlib import Path
from research_models import MODELS,ORDER,BODIES
DOC=Path(__file__).resolve().parents[1]
BASE='d3693d4942a23e043fa75efd84287f7393656f78'
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def dump(p,x):p.write_text(json.dumps(x,indent=2)+'\n')
def inherited_files():
 import models,run_stack,frozen_mapping
 root=DOC.parents[1]
 paths=[Path(m.__file__)for m in [models,run_stack,frozen_mapping]]+[DOC.parent/'ra-era-astronomy-stack/acquisition-manifest.json',DOC.parent/'jovian-discriminator-suite/predictions-sealed.json']
 return {str(p.relative_to(root)):sha(p)for p in paths}

def asset_provenance(runtime):
 manifest=DOC.parent/'ra-era-astronomy-stack/acquisition-manifest.json'
 assets=[]
 for entry in json.loads(manifest.read_text())['assets']:
  name=entry['name']
  if entry['kind']!='source-archive'and entry['kind']!='jpl-binary'and not(name.startswith('de406/')or name.startswith('de441/')):continue
  p=runtime/name;actual=sha(p);assert actual==entry['sha256'],f'Asset hash mismatch: {name}'
  assets.append(dict(entry,verifiedLocalSha256=actual))
 return {'inheritedManifest':'docs/ra-era-astronomy-stack/acquisition-manifest.json','manifestSha256':sha(manifest),'assets':assets,'redistributed':False}

def seal_fixed(a):
 assert a.seal,'--fixed-draft requires --seal; this path freezes an already reviewed draft'
 required=['design-discriminator-cases.json','design-predictions-sealed.json','search-summary.json','SHA256SUMS.json']
 assert not any((a.output/f).exists()for f in required),'Refusing overwrite of any existing frozen output'
 if a.output!=DOC:
  assert not any((a.output/'scripts'/f).exists()for f in ['search.py','research_models.py','seal.py']),'Refusing overwrite of critical scripts'
 source=a.fixed_draft
 cases=json.loads((source/'cases.json').read_text());pred=json.loads((source/'predictions-sealed.json').read_text());summary=json.loads((source/'search-summary.json').read_text())
 ids=[r['id']for r in cases['cases']];pids=[r['id']for r in pred['cases']]
 assert len(ids)==len(set(ids))==28 and set(ids)==set(pids)and len(pids)==28,'Fixed draft ID bijection failed'
 inputlookup={r['id']:r['birthUtc']for r in cases['cases']}
 assert all(r['birthUtc']==inputlookup[r['id']]and r['birthUtc'].endswith(':00Z')for r in pred['cases'])
 assert all(set(r['models'])==set(MODELS)for r in pred['cases'])
 assert all(c.get('designRootAlgorithm')=='immutable Model.chart -> Native.design: original 64-iteration bisection'for r in pred['cases']for c in r['models'].values())
 inherited=inherited_files();assets=asset_provenance(a.runtime)
 assert pred['sourceProvenance']['inheritedFiles']==inherited,'Inherited script/manifest hashes changed'
 assert pred['sourceProvenance']['assets']==assets,'Inherited source asset provenance changed'
 for k,(stem,ephe,mode,flags,jpl,label)in MODELS.items():
  lib=a.runtime/(stem+('.dylib'if sys.platform=='darwin'else'.so'))
  assert sha(lib)==pred['models'][k]['librarySha256'],'Native library hash changed'
  assert pred['models'][k]['timeMode']==mode and pred['models'][k]['requestedFlags']==flags
  assert pred['models'][k]['returnedFlags']==[flags]
 stamp=datetime.now(timezone.utc).isoformat()
 cases.update(baseCommit=BASE,frozenAtUtc=stamp);pred.update(baseCommit=BASE,frozenAtUtc=stamp)
 summary['fixedDraftSeal']={'frozenAtUtc':stamp,'fixedDraftSource':str(source),'caseCount':28,'reselected':False,'inputBijectionVerified':True}
 summary['reproduceNativeWorkers']={'instruction':'Create a JSON pool containing points [{utc: birthUtc, triggers: []}] from the fixed cases. Run each model command in its own process; Newton is used only for candidate inverse mapping, immutable Model.chart supplies all full predictions. Workers recalculate all 13+13 activations and all four second sensitivities.',
  'commands':[f'python3 docs/jovian-design-discriminator-suite/scripts/search.py evaluate --full --model {k} --runtime {a.runtime} --pool /tmp/jovian-design-discriminator/bisection-recompute/pool.json --output /tmp/jovian-design-discriminator/bisection-recompute/{k}.json'for k in MODELS]}
 a.output.mkdir(parents=True,exist_ok=True)
 dump(a.output/required[0],cases);dump(a.output/required[1],pred);dump(a.output/required[2],summary)
 scripts=[DOC/'scripts'/f for f in ['search.py','research_models.py','seal.py']]
 if a.output!=DOC:
  (a.output/'scripts').mkdir(exist_ok=True)
  for f in scripts:
   assert not(a.output/'scripts'/f.name).exists(),'Refusing overwrite of critical script'
   shutil.copyfile(f,a.output/'scripts'/f.name)
 files=required[:3]+['scripts/'+f.name for f in scripts]
 dump(a.output/'SHA256SUMS.json',{'sealedAtUtc':stamp,'algorithm':'SHA256','officialCollectionBegan':False,'files':{f:sha(a.output/f)for f in files},'inheritedFiles':inherited,'assetProvenance':assets,'protocol':'Never alter after collection begins; separate IDs and seal required for any alternative suite.'})
 print('SEALED FIXED DRAFT',stamp,len(ids))

def main():
 p=argparse.ArgumentParser();p.add_argument('--work',type=Path);p.add_argument('--fixed-draft',type=Path);p.add_argument('--output',type=Path,required=True);p.add_argument('--runtime',type=Path,default=Path('/tmp/ra-era-research'));p.add_argument('--seal',action='store_true');a=p.parse_args();a.output=a.output.resolve()
 if a.fixed_draft:
  seal_fixed(a);return
 assert a.work,'--work is required for candidate selection; --fixed-draft bypasses selection'
 files=['design-discriminator-cases.json','design-predictions-sealed.json','search-summary.json']
 assert not any((a.output/f).exists()for f in files+['SHA256SUMS.json']),'Refusing overwrite of existing draft or seal'
 a.output.mkdir(parents=True,exist_ok=True)
 full={k:json.loads((a.work/'full'/f'{k}.json').read_text())for k in MODELS}
 assert all(r.get('designRootAlgorithm')=='immutable Model.chart -> Native.design: original 64-iteration bisection'for v in full.values()for r in v['rows']),'Refusing prediction outputs that do not use immutable bisection'
 lookup={k:{r['utc']:r for r in v['rows']}for k,v in full.items()};pool=json.loads((a.work/'full-pool.json').read_text());eligible=[]
 for point in pool['points']:
  utc=point['utc']
  if int(utc[:4])>=2026:continue
  vals={k:lookup[k][utc]for k in MODELS};diff=[]
  for side in ['personality','design']:
   for b in ORDER:
    lines={k:v[side][b]['gateLine']for k,v in vals.items()};contrasts=[k for k in MODELS if lines[k]!=lines['C2']]
    if contrasts:diff.append({'side':side,'body':b,'C2Contrasts':contrasts,'gateLines':lines})
  des=[d for d in diff if d['side']=='design']
  if not des:continue
  stable1=all(v['stability'][s]['all26Stable']for v in vals.values()for s in ['-1','1']);stable5=all(v['stability'][s]['all26Stable']for v in vals.values()for s in ['-5','5'])
  contrasts={k for d in des for k in d['C2Contrasts']};bodies={d['body']for d in des if d['body']in BODIES}
  eligible.append({'utc':utc,'decade':int(utc[:4])//10*10,'differences':diff,'designDifferences':des,'stable1':stable1,'stable5':stable5,'contrasts':contrasts,'bodies':bodies,'score':100*stable5+30*stable1+15*len(contrasts)+5*len(des)})
 eligible.sort(key=lambda r:(-r['score'],r['utc']));chosen=[]
 def add_match(predicate):
  for r in eligible:
   if r not in chosen and predicate(r):chosen.append(r);return True
  return False
 # Prioritize C2/C1, cover every native body, then decade and contrast balance.
 for _ in range(5):add_match(lambda r:'C1'in r['contrasts']and r['stable1'])
 for b in BODIES:
  for _ in range(2):
   if sum(b in r['bodies']for r in chosen)<2:add_match(lambda r:b in r['bodies']and r['stable1'])
 for decade in range(1980,2030,10):
  while sum(r['decade']==decade for r in chosen)<3:
   if not add_match(lambda r:r['decade']==decade and r['stable1']):break
 for k in ['C3','C4','C5','C6']:add_match(lambda r:k in r['contrasts']and r['stable1'])
 while len(chosen)<28:
  if not add_match(lambda r:r['stable5']):break
 while len(chosen)>28:
  removable=[r for r in chosen if sum(x['decade']==r['decade']for x in chosen)>3 and all(sum(b in x['bodies']for x in chosen)>2 for b in r['bodies']) and ('C1'not in r['contrasts']or sum('C1'in x['contrasts']for x in chosen)>5)]
  assert removable,'Unable to trim without losing coverage'
  chosen.remove(min(removable,key=lambda r:(r['score'],r['utc'])))
 assert 20<=len(chosen)<=30,len(chosen)
 chosen.sort(key=lambda r:(-len(r['contrasts']),not r['stable5'],-len(r['designDifferences']),r['utc']));stamp=datetime.now(timezone.utc).isoformat();cases=[];pred=[]
 for n,r in enumerate(chosen,1):
  cid=f'JDD-{n:02d}';d=datetime.fromisoformat(r['utc'].replace('Z','+00:00'));local=d.astimezone(ZoneInfo('Europe/London'))
  cases.append({'id':cid,'birthUtc':r['utc'],'birthLocal':local.strftime('%Y-%m-%dT%H:%M:%S'),'location':'London, England, United Kingdom','ianaTimezone':'Europe/London','utcOffsetMinutes':int(local.utcoffset().total_seconds()/60),'decade':r['decade'],'disagreementBodies':sorted(r['bodies']),'allModelsStableAtPlusMinus1s':r['stable1'],'allModelsStableAtPlusMinus5s':r['stable5'],'C2ContrastModels':sorted(r['contrasts']),'sensitive':not r['stable5']})
  pred.append({'id':cid,'birthUtc':r['utc'],'differences':r['differences'],'designDifferences':r['designDifferences'],'models':{k:lookup[k][r['utc']]for k in MODELS}})
 old=DOC.parent/'jovian-discriminator-suite/predictions-sealed.json';meta=json.loads(old.read_text())['models']
 for k,(stem,ephe,mode,flags,jpl,label)in MODELS.items():
  lib=a.runtime/(stem+('.dylib'if sys.platform=='darwin'else'.so'));assert sha(lib)==meta[k]['librarySha256'];assert full[k]['swissVersion']==meta[k]['swissVersion'];assert full[k]['returnedFlags']==[flags]
  meta[k]=dict(meta[k],metadataInheritedFrom='../jovian-discriminator-suite/predictions-sealed.json',returnedFlags=full[k]['returnedFlags'])
 dump(a.output/'design-discriminator-cases.json',{'schemaVersion':1,'baseCommit':BASE,'frozenAtUtc':stamp if a.seal else None,'preparedAtUtc':stamp,'inputsAreSynthetic':True,'selection':'C2 Design model-predicted disagreement only; no official outputs consulted','caseCount':len(cases),'cases':cases})
 dump(a.output/'design-predictions-sealed.json',{'schemaVersion':1,'baseCommit':BASE,'frozenAtUtc':stamp if a.seal else None,'preparedAtUtc':stamp,'models':meta,'cases':pred})
 search=json.loads((a.work/'search-pool.json').read_text());summary={k:v for k,v in search.items()if k!='points'}|{k:v for k,v in pool.items()if k!='points'}|{'fullPoolCount':len(pool['points']),'eligibleNonfutureFullCases':len(eligible),'selectedCaseCount':len(cases),'selectedDecades':{str(y):sum(r['decade']==y for r in cases)for y in range(1980,2030,10)},'selectedDesignBodyCoverage':{b:sum(b in r['disagreementBodies']for r in cases)for b in BODIES},'selectedC2ContrastCoverage':{k:sum(k in r['C2ContrastModels']for r in cases)for k in MODELS if k!='C2'},'allModelsStable1sCount':sum(r['allModelsStableAtPlusMinus1s']for r in cases),'allModelsStable5sCount':sum(r['allModelsStableAtPlusMinus5s']for r in cases)}
 dump(a.output/'search-summary.json',summary)
 if a.seal:
  scriptfiles=[DOC/'scripts'/f for f in ['search.py','research_models.py','seal.py']]
  if a.output!=DOC:
   (a.output/'scripts').mkdir(exist_ok=True)
   for f in scriptfiles:shutil.copyfile(f,a.output/'scripts'/f.name)
  files+=['scripts/'+f.name for f in scriptfiles]
  dump(a.output/'SHA256SUMS.json',{'sealedAtUtc':stamp,'algorithm':'SHA256','officialCollectionBegan':False,'files':{f:sha(a.output/f)for f in files},'inheritedFiles':inherited_files(),'assetProvenance':asset_provenance(a.runtime),'protocol':'Never alter after collection begins; separate IDs and seal required for any alternative suite.'})
 print('SEALED'if a.seal else'DRAFT',len(cases));print(json.dumps(summary,indent=2))
if __name__=='__main__':main()
