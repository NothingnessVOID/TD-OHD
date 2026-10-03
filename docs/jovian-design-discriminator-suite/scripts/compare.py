"""Score sealed research predictions against independently captured official UI evidence."""
import json,hashlib,re
from pathlib import Path
from datetime import datetime,timezone
from collections import Counter
ROOT=Path(__file__).resolve().parents[1]
ORDER=['sun','earth','moon','northNode','southNode','mercury','venus','mars','jupiter','saturn','uranus','neptune','pluto']
MODELS=['C1','C2','C3','C4','C5','C6']
def load(n):return json.loads((ROOT/n).read_text())
def save(n,x):(ROOT/n).write_text(json.dumps(x,ensure_ascii=False,indent=2)+'\n')
def parse_iso(x):return datetime.fromisoformat(x.replace('Z','+00:00'))
def score(chart,obs):
 dif=[{'side':s,'body':b,'prediction':chart[s][b]['gateLine'],'official':obs[s][b]}for s in ['personality','design']for b in ORDER if chart[s][b]['gateLine']!=obs[s][b]]
 counts={s:13-sum(x['side']==s for x in dif)for s in ['personality','design']}
 return {'personalityMatched':counts['personality'],'designMatched':counts['design'],'matchedActivations':sum(counts.values()),'fullChart':not dif,'profileMatched':chart['profile']==obs['profile'],'personalityCorrectDesignWrong':counts['personality']==13 and counts['design']<13,'mismatches':dif}
def main():
 seal=load('SHA256SUMS.json')
 for n,h in seal['files'].items():assert hashlib.sha256((ROOT/n).read_bytes()).hexdigest()==h,n
 for n,h in seal.get('inheritedFiles',{}).items():assert hashlib.sha256((ROOT.parents[1]/n).read_bytes()).hexdigest()==h,n
 cases=load('design-discriminator-cases.json')['cases'];pred=load('design-predictions-sealed.json');pp={r['id']:r for r in pred['cases']};inputs={r['id']:r for r in cases}
 official=load('official-results.json');new=official['cases'];new_scored=[];n=len(new)
 assert len(inputs)==len(cases)==len(pp)==len(pred['cases'])
 assert set(inputs)==set(pp)
 assert len({r['birthUtc']for r in cases})==len(cases)
 assert len({r['id']for r in new})==n and len({r['birthUtc']for r in new})==n,'Duplicate official ID or UTC'
 assert {r['id']for r in new}==set(inputs),'Complete official ID set required'
 assert {r['birthUtc']for r in new}=={r['birthUtc']for r in cases},'Complete official UTC set required'
 old=load('existing-official-records.json')
 assert not {r['birthUtc']for r in cases}&{r['birthUtc']for r in old['cases']},'New suite overlaps previously observed official UTC'
 assert (ROOT/'evidence/SHA256SUMS.json').is_file(),'Raw source evidence hash manifest required'
 evidence_status='NOT PROVIDED'
 if (ROOT/'evidence/SHA256SUMS.json').exists():
  manifest=load('evidence/SHA256SUMS.json');entries=manifest.get('files',manifest)
  for path,digest in entries.items():
   if not isinstance(digest,str):continue
   f=ROOT/path if (ROOT/path).is_file()else ROOT/'evidence'/path
   assert f.is_file()and hashlib.sha256(f.read_bytes()).hexdigest()==digest,path
  evidence_status='Provided raw evidence SHA256 manifest verified'
 totals={m:{'designMatched':0,'personalityMatched':0,'matchedActivations':0,'fullCharts':0,'profileMatched':0,'personalityCorrectDesignWrong':[],'designMismatchBodies':Counter(),'totalDesignActivations':13*n,'totalPersonalityActivations':13*n,'totalActivations':26*n,'totalCharts':n}for m in MODELS}
 pairs={m:{'designDiscriminatingCases':[],'C2Wins':[],'otherWins':[],'ties':[]}for m in MODELS if m!='C2'}
 assert (ROOT/'native-verification.json').is_file(),'Independent native verification required'
 native={'status':'not_available','evidenceFile':'native-verification.json'}
 if (ROOT/'native-verification.json').exists():
  verified=load('native-verification.json')
  assert verified['status']=='passed' and not verified.get('failures',[]),'Native verification failed'
  assert verified['caseCount']==len(cases) and verified['modelCount']==len(MODELS)
  assert verified['activationFieldsVerified']==len(cases)*len(MODELS)*26
  native={'status':'passed','evidenceFile':'native-verification.json','caseCount':verified['caseCount'],'modelCount':verified['modelCount'],'activationFieldsVerified':verified['activationFieldsVerified']}
 checks=['All sealed and inherited files retain original SHA256','Complete unique official ID and UTC sets match sealed suite; no historical UTC overlap'];platforms=Counter()
 for r in new:
  cid=r['id'];assert cid in inputs;assert r['birthUtc']==inputs[cid]['birthUtc'];observations=r['observations'];assert observations
  canonical=None
  for platform,obs in observations.items():
   captures=obs['captures'];assert len(captures)==2
   times=[parse_iso(c['capturedAtUtc'])for c in captures]
   assert all(t.tzinfo is not None for t in times),'Capture timestamp timezone required'
   assert times[0]<times[1],'Repeat submissions need distinct chronological timestamps'
   for c in captures:
    assert parse_iso(c['capturedAtUtc'])>parse_iso(seal['sealedAtUtc'])
    assert c['birthUtcVerified']==r['birthUtc']
    for side in ['personality','design']:
     assert set(c[side])==set(ORDER)
     assert all(re.fullmatch(r'(?:[1-9]|[1-5][0-9]|6[0-4])\.[1-6]',v)for v in c[side].values())
    assert c['profile']==c['personality']['sun'].split('.')[1]+'/'+c['design']['sun'].split('.')[1]
   assert all(captures[0][k]==captures[1][k]for k in ['personality','design','profile'])
   if canonical is not None:assert all(canonical[k]==captures[0][k]for k in ['personality','design','profile'])
   canonical=captures[0];platforms[platform]+=1
  byModel={m:score(pp[cid]['models'][m],canonical)for m in MODELS}
  for m,z in byModel.items():
   t=totals[m]
   for k in ['designMatched','personalityMatched','matchedActivations']:t[k]+=z[k]
   t['fullCharts']+=z['fullChart'];t['profileMatched']+=z['profileMatched']
   if z['personalityCorrectDesignWrong']:t['personalityCorrectDesignWrong'].append(cid)
   for d in z['mismatches']:
    if d['side']=='design':t['designMismatchBodies'][d['body']]+=1
  for m,p in pairs.items():
   differences=[b for b in ORDER if pp[cid]['models']['C2']['design'][b]['gateLine']!=pp[cid]['models'][m]['design'][b]['gateLine']]
   if differences:
    p['designDiscriminatingCases'].append(cid)
    a=sum(canonical['design'][b]==pp[cid]['models']['C2']['design'][b]['gateLine']for b in differences);b=sum(canonical['design'][b]==pp[cid]['models'][m]['design'][b]['gateLine']for b in differences)
    p['C2Wins'if a>b else 'otherWins'if b>a else 'ties'].append(cid)
  new_scored.append({'id':cid,'birthUtc':r['birthUtc'],'models':byModel})
 for t in totals.values():
  t['designMismatchBodies']=dict(t['designMismatchBodies']);t['designPercent']=round(t['designMatched']/t['totalDesignActivations']*100,6)if n else None
 checks+=['Official samples collected after seal','Every observed new UTC verified on page','Each available platform submitted twice with stable 26 activations and Profile','Complete valid 13-body Personality and Design records','Score derived only after independent official observations']
 result={'schemaVersion':1,'sourceEvidenceHashVerification':evidence_status,'newDifferentUtcTested':n,'sealedNewCases':len(cases),'pendingOfficialCases':[r['id']for r in cases if r['id']not in {x['id']for x in new}],'platformCaseCounts':dict(platforms),'totals':totals,'designPairwiseDiscriminators':pairs,'cases':new_scored,'designDateEvidence':{'newOfficialDesignDates':0,'interpretation':'NOT OBSERVED on accessible Jovian chart surface; myBodyGraph unavailable in isolated browser. Historical minute labels have UNKNOWN timezone and must not be assumed UTC.'}}
 save('comparison.json',result)
 save('validation.json',{'schemaVersion':1,'status':'passed','checks':checks,'officialCaseCount':n,'sealedCaseCount':len(cases),'researchOnly':True,'nativeReproduction':native,'sourceEvidenceHashVerification':evidence_status,'browserIsolation':'Codex In-app Browser only; no Chrome control, cookie, token or session extraction','platformAvailability':official['platformAvailability'],'productionTests':'NOT RUN: production files unchanged','limitations':['Minute outputs cannot identify exact official longitude or internal ephemeris.','Repeated normal submissions show stable UI outputs; backend caching is unknown.','Model-disagreement sample is intentionally selected and not a population accuracy estimate.','Design timestamp timezone cannot be inferred from an unlabeled official date.']})
 print(json.dumps({'totals':totals,'pairs':pairs},indent=2))
if __name__=='__main__':main()
