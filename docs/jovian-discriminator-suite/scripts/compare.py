"""Offline normalization and scoring. Official observations never derive from predictions."""
import csv,json,hashlib,re
from pathlib import Path
from datetime import datetime,timezone
from collections import Counter
ROOT=Path(__file__).resolve().parents[1]
ORDER=['sun','earth','moon','northNode','southNode','mercury','venus','mars','jupiter','saturn','uranus','neptune','pluto']
def read(n):return json.loads((ROOT/n).read_text())
def write(n,x):(ROOT/n).write_text(json.dumps(x,ensure_ascii=False,indent=2)+'\n')
def rows(n):return list(csv.DictReader((ROOT/'evidence'/n).open(),delimiter='\t'))
def iso(s):return datetime.fromisoformat(s.replace('Z','+00:00'))
def fnv(s):
 # Non-cryptographic transcription checksum; immutable seal uses SHA256 separately.
 h=2166136261
 assert s.isascii()
 for b in s.encode('ascii'):h=((h^b)*16777619)&0xffffffff
 return f'{h:08x}'
def run():
 seal=read('SHA256SUMS.json'); checks=[]
 for n,h in seal['files'].items():
  assert hashlib.sha256((ROOT/n).read_bytes()).hexdigest()==h,n
 checks.append('Sealed predictions, cases, and research model scripts unchanged')
 cases=read('cases.json')['cases'];inputs={x['id']:x for x in cases}
 mb=rows('mybodygraph-blind-dom.tsv');ja=rows('jovian-blind-confirmations.tsv');assert len(mb)==len(ja)==len(cases)==28
 assert {x['id'] for x in mb}==set(inputs)=={x['id'] for x in ja}
 ja={x['id']:x for x in ja};results=[]
 capture={x['id']:x for x in read('evidence/capture-fingerprints.json')['cases']}
 for x in mb:
  cid=x['id'];inp=inputs[cid];j=ja[cid]
  assert x['repeatIdentical']==j['repeatIdentical']==j['all26AndProfileEqualMyBodyGraph']=='true'
  assert capture[cid]['repeatsEqual']
  for platform,parts in [('myBodyGraph',[cid,x['personality'],x['design'],x['profile'],x['designDateDisplayed'],x['firstCapturedUtc'],x['secondCapturedUtc']]),('Jovian',[cid,x['personality'],x['design'],x['profile'],j['utcDisplayed'],j['firstCapturedUtc'],j['secondCapturedUtc']])]:
   assert fnv('|'.join(parts))==capture[cid][platform],(cid,platform,'Captured DOM transcription differs')
  utc=datetime.strptime(j['utcDisplayed'],'%B %d, %Y, %H:%M').replace(tzinfo=timezone.utc)
  assert utc==iso(inp['birthUtc']),cid
  activ={}
  for side in ['personality','design']:
   v=x[side].split();assert len(v)==13
   assert all(re.fullmatch(r'(?:[1-9]|[1-5][0-9]|6[0-4])\.[1-6]',z)for z in v)
   activ[side]=dict(zip(ORDER,v))
  assert x['profile']==activ['personality']['sun'].split('.')[1]+'/'+activ['design']['sun'].split('.')[1]
  entry={'id':cid,'birthUtc':inp['birthUtc'],'birthLocal':inp['birthLocal'],'location':inp['location'],'observations':{}}
  for platform,row,url,evidence in [('myBodyGraph',x,'https://app.mybodygraph.com/charts/[redacted]','evidence/mybodygraph-blind-dom.tsv'),('Jovian',j,'https://jovianarchive.com/pages/get-your-human-design-chart','evidence/jovian-blind-confirmations.tsv')]:
   times=[row['firstCapturedUtc'],row['secondCapturedUtc']]
   assert all(iso(t)>iso(seal['sealedAtUtc'])for t in times)
   entry['observations'][platform]={'personality':activ['personality'],'design':activ['design'],'profile':x['profile'],'capturedAtUtc':times,'repeatCount':2,'repeatIdentical':True,'url':url,'evidence':evidence,'method':'Normal UI form submission twice, visible SVG Gate.Line and property text; no API/auth extraction','birthUtcVerifiedOnPage':True,'designDateDisplayed':x['designDateDisplayed']if platform=='myBodyGraph'else None,'designDateTimezone':'NOT DISCLOSED'if platform=='myBodyGraph'else None,'longitude':'NOT DISCLOSED','colorToneBase':'NOT OBSERVED on accessible chart surface','cachePolicy':'UNKNOWN'}
  results.append(entry)
 official={'schemaVersion':1,'collectionCompletedAtUtc':max(j['secondCapturedUtc']for j in ja.values()),'bodyOrder':ORDER,'caseCount':28,'platforms':['myBodyGraph','Jovian'],'independentPlatforms':False,'independenceNote':'Two official products may share backend; agreement does not prove independent algorithms. Jovian TSV losslessly deduplicates its observed identical 26 values against the myBodyGraph TSV, with independent timestamps and UTC labels.','cases':results}
 write('official-results.json',official)
 predictions=read('predictions-sealed.json');pred={x['id']:x for x in predictions['cases']}
 totals={m:{'matchedActivations':0,'totalActivations':728,'personalityMatched':0,'designMatched':0,'fullCharts':0,'profileMatched':0,'mismatchBodies':Counter()}for m in predictions['models']}
 scored=[];pairs={m:{'discriminatingCases':[],'C1Wins':[],'otherWins':[],'neitherWins':[]}for m in totals if m!='C1'}
 for x in results:
  cid=x['id'];obs=x['observations']['myBodyGraph'];byModel={}
  for m,chart in pred[cid]['models'].items():
   dif=[];matches={}
   for side in ['personality','design']:
    for b in ORDER:
     actual=obs[side][b];expected=chart[side][b]['gateLine']
     if actual!=expected:dif.append({'side':side,'body':b,'official':actual,'prediction':expected})
    matches[side]=13-sum(z['side']==side for z in dif)
   n=matches['personality']+matches['design'];t=totals[m];t['matchedActivations']+=n;t['personalityMatched']+=matches['personality'];t['designMatched']+=matches['design'];t['fullCharts']+=n==26;t['profileMatched']+=obs['profile']==chart['profile']
   for d in dif:t['mismatchBodies'][d['body']]+=1
   byModel[m]={'matched':n,'personalityMatched':matches['personality'],'designMatched':matches['design'],'fullChart':n==26,'profileMatched':obs['profile']==chart['profile'],'mismatches':dif}
  scored.append({'id':cid,'models':byModel})
  for m,pair in pairs.items():
   different=[(side,b)for side in ['personality','design']for b in ORDER if pred[cid]['models']['C1'][side][b]['gateLine']!=pred[cid]['models'][m][side][b]['gateLine']]
   if different:
    pair['discriminatingCases'].append(cid)
    a=sum(obs[side][b]==pred[cid]['models']['C1'][side][b]['gateLine']for side,b in different);b=sum(obs[side][b]==pred[cid]['models'][m][side][b]['gateLine']for side,b in different)
    pair['C1Wins'if a>b else 'otherWins'if b>a else 'neitherWins'].append(cid)
 for t in totals.values():t['mismatchBodies']=dict(t['mismatchBodies']);t['activationPercent']=round(t['matchedActivations']/728*100,6)
 write('comparison.json',{'schemaVersion':1,'reference':'myBodyGraph; confirmed 28/28 same 26 activations and profiles on Jovian','differentUtcCount':28,'totalActivationsPerModel':728,'platformAgreement':{'activations':728,'profiles':28,'repeatsIdentical':True},'totals':totals,'pairwiseDiscriminators':pairs,'cases':scored})
 checks.extend(['28 unique UTC, 26 valid activations per official chart','28/28 repeat confirmations for each platform','Stored records match independent fingerprints of all 56 original DOM capture pairs','Both displayed UTC sets checked against sealed cases','728/728 platform activations and 28/28 profiles identical','Collection timestamps all later than seal','Official records and predictions stored separately'])
 write('validation.json',{'schemaVersion':1,'status':'passed','checks':checks,'nativeReproduction':'PENDING separate reproduce.py','researchOnly':True,'productionTests':'NOT RUN: production code unchanged','limitations':['Repeated submissions verify stable outputs; backend cache/recalculation cannot be observed.','No exact official longitude or fine substructure obtained.','Official products may share a backend.','Designed boundary sample is not an unbiased population accuracy estimate.']})
 print(json.dumps(totals,indent=2));print(json.dumps(pairs,indent=2))
if __name__=='__main__':run()
