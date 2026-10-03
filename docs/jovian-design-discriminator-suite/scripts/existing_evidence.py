"""Offline inventory and six-model evaluation of saved synthetic official HD evidence.
Run: python3 docs/jovian-design-discriminator-suite/scripts/existing_evidence.py --runtime /tmp/ra-era-research
Every model runs in a fresh process to isolate Swiss Ephemeris global state.
No production imports, browser operations, network access, or fitted parameters.
"""
import argparse, hashlib, json, re, subprocess, sys
from collections import Counter
from datetime import datetime, timezone, timedelta
from pathlib import Path
sys.dont_write_bytecode=True
ROOT=Path(__file__).resolve().parents[3]
OUT=ROOT/'docs/jovian-design-discriminator-suite'
sys.path.insert(0,str(ROOT/'docs/jovian-discriminator-suite/scripts'))
from models import MODELS, Model, ORDER, utc_jd

def read(p):return json.loads((ROOT/p).read_text())
def dump(p,v):p.write_text(json.dumps(v,ensure_ascii=False,indent=2)+'\n')
def norm(a):
 return {side:{re.sub(r'[^a-z]','',b.lower()):str(v) for b,v in vals.items()} for side,vals in a.items()}
def bodykeys(a):
 return {side:{b:vals[b.lower()] for b in ORDER} for side,vals in a.items()}
def label_comparisons(records,models):
 rows=[]
 for c in records:
  labels={o['designDateDisplayed'] for o in c['observations'] if o['designDateDisplayed']}
  if not labels:continue
  parsed=[]
  for label in sorted(labels):
   m=re.fullmatch(r'(\d+)年(\d+)月(\d+)日 (\d+):(\d+)',label)
   t=datetime(*map(int,m.groups())) if m else datetime.strptime(label,'%d %B %Y @ %H:%M')
   parsed.append({'label':label,'parsedWallTime':t.isoformat(timespec='minutes'),'timezone':'UNKNOWN'})
  predictions={}
  for m in MODELS:
   t=datetime.fromisoformat(models[m][c['birthUtc']]['designUtcFromTt'].replace('Z','+00:00'))
   rounded=(t+timedelta(seconds=30)).replace(second=0,microsecond=0)
   predictions[m]={'designUtcFromTt':models[m][c['birthUtc']]['designUtcFromTt'],'utcTruncatedMinute':t.isoformat(timespec='minutes').replace('+00:00','Z'),'utcRoundedMinute':rounded.isoformat(timespec='minutes').replace('+00:00','Z'),'modelUt1NumericClock':models[m][c['birthUtc']]['designModelUt1NumericClock'],'numericClockTimezone':'NONE: numeric UT1 calendar, not civil UTC'}
  rows.append({'birthUtc':c['birthUtc'],'ids':c['ids'],'observedLabels':parsed,'predictions':predictions,'modelRoundedUtcMinutesDiffer':len({z['utcRoundedMinute'] for z in predictions.values()})>1,'modelTruncatedUtcMinutesDiffer':len({z['utcTruncatedMinute'] for z in predictions.values()})>1,'comparisonStatus':'Timezone UNKNOWN: minute-label comparison only; no exact UTC match or model winner claimed'})
 return rows

def run(runtime):
 byutc={};inventory=[]
 def add(utc,cid,platform,a,profile,source,evidence=None,design=None,designzone=None):
  utc=datetime.fromisoformat(utc.replace('Z','+00:00')).astimezone(timezone.utc).isoformat().replace('+00:00','Z')
  a=bodykeys(norm(a));assert set(a)=={'personality','design'}
  assert all(re.fullmatch(r'(?:[1-9]|[1-5][0-9]|6[0-4])\.[1-6]',v) for vals in a.values() for v in vals.values())
  if profile:assert profile==a['personality']['sun'].split('.')[1]+'/'+a['design']['sun'].split('.')[1],cid
  x=byutc.setdefault(utc,{'birthUtc':utc,'ids':[],'observations':[]})
  if cid not in x['ids']:x['ids'].append(cid)
  ob={'platform':platform,**a,'profile':profile,'designDateDisplayed':design,'designDateTimezone':designzone,'source':source,'evidence':evidence}
  if ob not in x['observations']:x['observations'].append(ob)
 p='docs/golden-reference/golden-cases.json';gold=read(p)
 for c in gold['cases']:add(c['birthUtc'],c['id'],'Jovian',c['expected']['activations'],c['expected'].get('profile'),p,c['evidence'])
 p='docs/golden-reference/platform-boundaries/golden-cases.json';plat=read(p)
 for c in plat['cases']:
  for key,name in [('jovian','Jovian'),('myBodyGraph','myBodyGraph')]:
   z=c[key];add(c['birthUtc'],c['referenceId'],name,z['activations'],z.get('profile'),p,design=z.get('designDateDisplayed'),designzone=z.get('designDateTimezone'))
 p='docs/golden-reference/platform-boundaries/mybodygraph/blind-results.json'
 inp={c['case']:c for c in plat['cases']}
 for c in read(p)['cases']:add(inp[c['case']]['birthUtc'],inp[c['case']]['referenceId'],'myBodyGraph',c['activations'],c.get('profile'),p,design=c.get('designDateDisplayed'),designzone=c.get('designDateTimezone'))
 p='docs/jovian-discriminator-suite/official-results.json'
 for c in read(p)['cases']:
  for name,z in c['observations'].items():add(c['birthUtc'],c['id'],name,{s:z[s] for s in ['personality','design']},z.get('profile'),p,z.get('evidence'),z.get('designDateDisplayed'),z.get('designDateTimezone'))
 # Raw Jovian captures provide source pointers and one extra saved numbered research case.
 goldids={c['id']:c for c in gold['cases']}
 for f in sorted((ROOT/'docs/golden-reference/browser-evidence').glob('*.json')):
  if f.name.startswith('td8787') or f.name=='jovian-control.json':continue
  c=json.loads(f.read_text());a=c.get('activations');source=str(f.relative_to(ROOT))
  if not isinstance(a,list) or len(a)!=26:continue
  if c.get('id') in goldids:
   k=goldids[c['id']];utc=k['birthUtc'];cid=c['id'];profile=k['expected'].get('profile')
  elif f.name=='jovian-1985-1233.json':
   dom=f.with_suffix('.dom.txt').read_text();m=re.search(r'Date and Time \(UTC\)\n\s*- paragraph: ([^\n]+)',dom);assert m
   utc=datetime.strptime(m[1],'%B %d, %Y, %H:%M').replace(tzinfo=timezone.utc).isoformat();cid='G1985-1233-raw';profile=None
  else:raise AssertionError(('Unclassified official capture',source))
  acts={'design':dict(zip(ORDER,a[:13])),'personality':dict(zip(ORDER,a[13:]))}
  # Profile in raw controls is copied only if visibly saved.
  if profile is None:
   s=c.get('properties','') or f.with_suffix('.dom.txt').read_text()
   m=re.search(r'Profile(?:\n\s*- paragraph: )?(\d/\d)',s)
   if m:profile=m[1]
  add(utc,cid,'Jovian',acts,profile,source,str(f.with_suffix('.dom.txt').relative_to(ROOT)) if f.with_suffix('.dom.txt').exists() else None)
 # Exhaustive file inventory: actual observations versus predictions and other evidence.
 used={o['source'] for c in byutc.values() for o in c['observations']}
 for f in sorted((ROOT/'docs').rglob('*')):
  if not f.is_file() or OUT in f.parents:continue
  rel=str(f.relative_to(ROOT))
  if not any(x in rel for x in ['golden-reference/','jovian-discriminator-suite/','ra-era-astronomy-stack/']):continue
  role='supporting-source-or-evidence'
  if rel in used:role='normalized-official-observations'
  elif rel.endswith('/jovian-control.json'):role='excluded-unconfirmed-synthetic-control'
  elif '/td8787-' in rel or '/sharp-webapp/' in rel:role='local-or-sharp-output-excluded-from-official-reference'
  elif any(x in rel for x in ['/results/','/independent/','/scan/','root-cause','predictions','comparison']):role='derived-model-or-diagnostic-not-official-observations'
  elif '/void/' in rel:role='other-platform-excluded-from-official-reference'
  inventory.append({'path':rel,'bytes':f.stat().st_size,'sha256':hashlib.sha256(f.read_bytes()).hexdigest(),'role':role})
 records=sorted(byutc.values(),key=lambda x:x['birthUtc'])
 conflicts=[]
 for c in records:
  for side in ['personality','design']:
   for b in ORDER:
    vals={o[side][b] for o in c['observations']}
    if len(vals)>1:conflicts.append({'birthUtc':c['birthUtc'],'side':side,'body':b,'values':sorted(vals)})
 assert not conflicts,conflicts
 official={'schemaVersion':1,'scope':'Previously saved synthetic official research cases only; account URLs and raw properties omitted','evaluationType':'retrospective_known_official_evidence_not_blind_test','bodyOrder':ORDER,'uniqueUtcCount':len(records),'observationRecordCount':sum(len(c['observations']) for c in records),'cases':records,'conflicts':conflicts}
 dump(OUT/'existing-official-records.json',official)
 models={}
 for key in MODELS:
  proc=subprocess.run([sys.executable,str(Path(__file__).resolve()),'--worker',key,'--runtime',str(runtime)],input=json.dumps([c['birthUtc'] for c in records]),text=True,capture_output=True,check=True)
  models[key]=json.loads(proc.stdout)
 labels=label_comparisons(records,models)
 result=[];stats={m:Counter() for m in MODELS};no=[]
 for c in records:
  utc=c['birthUtc'];pred={m:models[m][utc] for m in MODELS};obs=c['observations'][0];dif=[]
  for b in ORDER:
   vals={m:pred[m]['design'][b]['gateLine'] for m in MODELS}
   if len(set(vals.values()))>1:dif.append({'body':b,'official':obs['design'][b],'predictions':vals,'matches':[m for m,v in vals.items() if v==obs['design'][b]],'predictionDetails':{m:pred[m]['design'][b] for m in MODELS}})
  for m in MODELS:
   s=stats[m];s['cases']+=1
   for side in ['personality','design']:
    s[side+'Matched']+=sum(pred[m][side][b]['gateLine']==obs[side][b] for b in ORDER)
    s[side+'All13Matched']+=all(pred[m][side][b]['gateLine']==obs[side][b] for b in ORDER)
   s['all26Matched']+=all(pred[m][side][b]['gateLine']==obs[side][b] for side in ['personality','design'] for b in ORDER)
   if obs.get('profile'):s['profileAvailable']+=1;s['profileMatched']+=pred[m]['profile']==obs['profile']
   if dif:s['designDiscriminatorCases']+=1;s['designDiscriminatorFullDesignMatches']+=all(pred[m]['design'][b]['gateLine']==obs['design'][b] for b in ORDER)
  if dif:result.append({**c,'designDifferences':dif,'modelPredictions':pred})
  else:no.append({'birthUtc':utc,'ids':c['ids'],'allModelsMatchOfficialDesign':all(pred[m]['design'][b]['gateLine']==obs['design'][b] for m in MODELS for b in ORDER)})
 summary={'schemaVersion':1,'evaluationType':'retrospective_known_official_evidence_not_blind_test','runtime':str(runtime),'models':{m:list(MODELS[m]) for m in MODELS},'modelIsolation':'Each model evaluated in a separate subprocess','inventory':inventory,'uniqueUTC':[c['birthUtc'] for c in records],'counts':{'uniqueUtc':len(records),'normalizedObservationRecords':official['observationRecordCount'],'designDiscriminatorUtc':len(result),'designDiscriminatorBodyFields':sum(len(c['designDifferences']) for c in result),'noDesignDisagreementUtc':len(no),'excluded_unconfirmed_synthetic_control':1,'activationFieldsPerModel':len(records)*26,'designFieldsPerModel':len(records)*13,'designDateLabelUtc':len(labels),'modelRoundedDesignUtcMinuteDisagreementAmongLabelUtc':sum(x['modelRoundedUtcMinutesDiffer'] for x in labels),'modelTruncatedDesignUtcMinuteDisagreementAmongLabelUtc':sum(x['modelTruncatedUtcMinutesDiffer'] for x in labels)},'officialCoverage':{'platforms':dict(Counter(o['platform'] for c in records for o in c['observations'])),'all26AvailableUtc':len(records),'profileAvailableUtc':sum(any(o['profile'] for o in c['observations']) for c in records),'designDateDisplayedAvailableUtc':sum(any(o['designDateDisplayed'] for o in c['observations']) for c in records),'designDateTimezone':'Undisclosed where displayed; retained as label, never silently normalized to UTC'},'modelMatchStats':{m:dict(s) for m,s in stats.items()},'designDiscriminators':result,'historicalDesignDateLabelComparisons':labels,'modelPredictionsForAllUtc':models,'noDesignDisagreement':no,'limitations':['Official products may share backend; agreement is not independent algorithm evidence','Design date display timezone is not disclosed','Design-only Gate.Line disagreement is distinguished from numerical longitude/DesignTT disagreement','Inventory excludes newly created output files for stable reproduction']}
 dump(OUT/'existing-design-discriminators.json',summary)
 print(json.dumps({'counts':summary['counts'],'officialCoverage':summary['officialCoverage'],'modelMatchStats':summary['modelMatchStats']},indent=2))
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--runtime',type=Path,default=Path('/tmp/ra-era-research'));p.add_argument('--worker',choices=list(MODELS));args=p.parse_args()
 if args.worker:
  m=Model(args.worker,args.runtime);utcs=json.loads(sys.stdin.read());charts={}
  for utc in utcs:
   c=m.chart(utc_jd(utc));j=m.native.ut1(c['designTtJd']);t=datetime.fromtimestamp((j-2440587.5)*86400,timezone.utc);r=(t+timedelta(seconds=30)).replace(second=0,microsecond=0)
   c['designModelUt1Jd']=j;c['designModelUt1NumericClock']={'calendarLabel':t.replace(tzinfo=None).isoformat(),'truncatedMinute':t.replace(tzinfo=None).isoformat(timespec='minutes'),'roundedMinute':r.replace(tzinfo=None).isoformat(timespec='minutes'),'semantics':'Numeric UT1 calendar; inverse input clock for utc-as-ut1 models; not asserted civil UTC or official display timezone'}
   charts[utc]=c
  print(json.dumps(charts))
 else:run(args.runtime)
