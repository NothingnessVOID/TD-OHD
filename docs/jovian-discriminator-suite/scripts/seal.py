#!/usr/bin/env python3
"""Select final cases deterministically from model outputs, then freeze hashes.

No official results are read. Abort if seal exists; never silently reseal.
"""
import argparse,hashlib,json,shutil
from datetime import datetime,timezone
from zoneinfo import ZoneInfo
from pathlib import Path
from models import MODELS,ORDER,BODIES
DOC=Path(__file__).resolve().parents[1]
BASE='70ec9f3c15fb98a55cb57baa2ed6adb2de753678'
def dump(p,x):p.write_text(json.dumps(x,indent=2)+'\n')
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def main():
 p=argparse.ArgumentParser();p.add_argument('--work',type=Path,required=True);p.add_argument('--output',type=Path,default=DOC);p.add_argument('--runtime',type=Path,required=True);a=p.parse_args();a.output.mkdir(parents=True,exist_ok=True)
 assert not(a.output/'SHA256SUMS.json').exists(),'Existing seal: do not reseal after official collection'
 full={k:json.loads((a.work/'full'/f'{k}.json').read_text())for k in MODELS}
 lookup={k:{r['utc']:r for r in v['rows']}for k,v in full.items()}
 pool=json.loads((a.work/'full-pool.json').read_text());eligible=[]
 for point in pool['points']:
  utc=point['utc']
  if int(utc[:4])>=2026:continue # Actual official calculator birth-year acceptance; no future births.
  vals={k:lookup[k][utc]for k in MODELS};diff=[]
  for side in ['personality','design']:
   for b in ORDER:
    lines={k:v[side][b]['gateLine']for k,v in vals.items()}
    contrasts=[k for k in MODELS if lines[k]!=lines['C1']]
    if contrasts:diff.append({'side':side,'body':b,'C1Contrasts':contrasts,'gateLines':lines})
  stable1=all(v['stability'][s]['all26Stable']for v in vals.values()for s in ['-1','1'])
  stable5=all(v['stability'][s]['all26Stable']for v in vals.values()for s in ['-5','5'])
  contrasts={k for d in diff for k in d['C1Contrasts']}
  bodies={d['body']for d in diff if d['body']in BODIES}
  eligible.append({'utc':utc,'decade':int(utc[:4])//10*10,'differences':diff,'stable1':stable1,'stable5':stable5,
                  'contrasts':contrasts,'bodies':bodies,'score':100*stable5+30*stable1+15*len(contrasts)+5*len(diff)})
 eligible.sort(key=lambda r:(-r['score'],r['utc']));chosen=[]
 def add_match(predicate):
  for r in eligible:
   if r not in chosen and predicate(r):chosen.append(r);return
 # Rare contrasts first, then two representatives for every original body.
 for k in ['C6','C2','C3']:
  for _ in range(2):add_match(lambda r:k in r['contrasts'] and r['stable1'])
 for b in BODIES:
  for _ in range(2):
   if sum(b in r['bodies']for r in chosen)<2:add_match(lambda r:b in r['bodies'] and r['stable1'])
 for decade in range(1980,2030,10):
  while sum(r['decade']==decade for r in chosen)<3:add_match(lambda r:r['decade']==decade and r['stable1'])
 while len(chosen)<28:add_match(lambda r:r['stable5'])
 assert 20<=len(chosen)<=30,len(chosen)
 chosen.sort(key=lambda r:(-len(r['contrasts']),not r['stable5'],-len(r['differences']),r['utc']))
 stamp=datetime.now(timezone.utc).isoformat();cases=[];pred=[]
 for n,r in enumerate(chosen,1):
  caseid=f'JDS-{n:02d}';d=datetime.fromisoformat(r['utc'].replace('Z','+00:00'));local=d.astimezone(ZoneInfo('Europe/London'))
  cases.append({'id':caseid,'birthUtc':r['utc'],'birthLocal':local.strftime('%Y-%m-%dT%H:%M:%S'),'location':'London, England, United Kingdom','ianaTimezone':'Europe/London','utcOffsetMinutes':int(local.utcoffset().total_seconds()/60),'decade':r['decade'],'disagreementBodies':sorted(r['bodies']),'allModelsStableAtPlusMinus1s':r['stable1'],'allModelsStableAtPlusMinus5s':r['stable5'],'C1ContrastModels':sorted(r['contrasts']),'sensitive':not r['stable5']})
  pred.append({'id':caseid,'birthUtc':r['utc'],'differences':r['differences'],'models':{k:lookup[k][r['utc']]for k in MODELS}})
 model_meta={}
 for k,(stem,ephe,mode,flags,jpl,label)in MODELS.items():
  lib=a.runtime/(stem+('.dylib'if __import__('sys').platform=='darwin' else'.so'))
  model_meta[k]={'librarySha256':sha(lib),'swissVersion':full[k]['swissVersion'],'data':'direct JPL DE406'if jpl else ephe,'timeMode':mode,'requestedFlags':flags,'classification':label,'source':'../ra-era-astronomy-stack/acquisition-manifest.json'}
 dump(a.output/'cases.json',{'schemaVersion':1,'baseCommit':BASE,'frozenAtUtc':stamp,'inputsAreSynthetic':True,'selection':'Model-predicted disagreement only; no official outputs consulted','caseCount':len(cases),'cases':cases})
 shutil.copyfile(a.output/'cases.json',a.output/'discriminator-cases.json')
 dump(a.output/'predictions-sealed.json',{'schemaVersion':1,'baseCommit':BASE,'frozenAtUtc':stamp,'models':model_meta,'cases':pred})
 search=json.loads((a.work/'search-pool.json').read_text())
 dump(a.output/'search-summary.json',{k:v for k,v in search.items()if k!='points'}|{k:v for k,v in pool.items()if k!='points'}|{'fullPoolCount':len(pool['points']),'eligibleNonfutureFullCases':len(eligible),'selectedCaseCount':len(cases),'selectedDecades':{str(y):sum(r['decade']==y for r in cases)for y in range(1980,2030,10)},'selectedBodyCoverage':{b:sum(b in r['disagreementBodies']for r in cases)for b in BODIES},'selectedContrastCoverage':{k:sum(k in r['C1ContrastModels']for r in cases)for k in MODELS if k!='C1'},'allModelsStable1sCount':sum(r['allModelsStableAtPlusMinus1s']for r in cases),'allModelsStable5sCount':sum(r['allModelsStableAtPlusMinus5s']for r in cases)})
 files=['cases.json','discriminator-cases.json','predictions-sealed.json','search-summary.json']+[str(f.relative_to(a.output))for f in sorted((a.output/'scripts').glob('*.py'))]
 dump(a.output/'SHA256SUMS.json',{'sealedAtUtc':stamp,'algorithm':'SHA256','officialCollectionBegan':False,'files':{f:sha(a.output/f)for f in files},'protocol':'Never change these files after collection begins. An alternative suite requires separate IDs and seal.'})
 print('SEALED',stamp,len(cases));print(json.dumps(json.loads((a.output/'search-summary.json').read_text()),indent=2))
 for r in cases:print(r['id'],r['birthUtc'],r['birthLocal'],','.join(r['disagreementBodies']),','.join(r['C1ContrastModels']),'stable5',r['allModelsStableAtPlusMinus5s'])
if __name__=='__main__':main()
