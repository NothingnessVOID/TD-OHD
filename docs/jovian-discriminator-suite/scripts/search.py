#!/usr/bin/env python3
"""Find model-disagreement minute inputs before any official collection.

Deterministic windows, no reads of official results or earlier Golden expected.
Slow planets additionally scanned continuously across 1980-2030.
"""
import argparse,json,math,subprocess,sys,hashlib
from pathlib import Path
from datetime import datetime,timezone
from zoneinfo import ZoneInfo
from models import Model,MODELS,BODIES,utc_jd,gate_line,signed,minute,iso

DOC=Path(__file__).resolve().parents[1]

def scan(runtime,output):
 m=Model('C1',runtime);points={};transitions=0;calls=0
 for body in BODIES:
  intervals=[]
  if body in ['uranus','neptune','pluto','saturn','jupiter']:
   intervals=[(utc_jd('1980-01-01T00:00:00Z'),utc_jd('2031-01-01T00:00:00Z'),2.0)]
  else:
   for year in range(1980,2031):
    for month in [1,7]:
     lo=utc_jd(f'{year}-{month:02d}-01T00:00:00Z');intervals.append((lo,lo+14,1/24 if body=='moon' else .25))
  for lo,end,step in intervals:
   x=m.body(lo,body)[0]
   while lo<end:
    hi=min(end,lo+step);y=m.body(hi,body)[0];delta=signed(y,x)
    a=(x-3.875)/.9375;b=a+delta/.9375
    # Global index may wrap; longitude residual is always normalized locally.
    if math.floor(a)!=math.floor(b):
     target=(3.875+(math.floor(a)+1 if delta>0 else math.floor(a))*.9375)%360
     left=lo;right=hi
     for _ in range(28):
      mid=(left+right)/2;z=signed(m.body(mid,body)[0],target)
      if (z>=0)==(delta>0):right=mid
      else:left=mid
     root=(left+right)/2;u=minute(root);key=iso(u)
     points.setdefault(key,{'utc':key,'triggers':[]})['triggers'].append({'body':body,'C1transitionUtcApprox':iso(root),'minuteMinusTransitionSeconds':(u-root)*86400})
     transitions+=1
    lo=hi;x=y;calls+=1
  print('scanned',body,'transitions',transitions,'minutes',len(points),flush=True)
 output.write_text(json.dumps({'range':'1980-01-01 through 2030-12-31','searchPolicy':'Jan/Jul first 14 days each year for Sun/Moon/Mercury/Venus/Mars/True Node; Jupiter/Saturn/Uranus/Neptune/Pluto full continuous range at 2-day step','sampleIntervals':calls,'C1transitions':transitions,'points':sorted(points.values(),key=lambda r:r['utc'])},indent=2)+'\n')

def evaluate(key,runtime,pool,output,full=False):
 m=Model(key,runtime);rows=[]
 for r in json.loads(pool.read_text())['points']:
  uj=utc_jd(r['utc'])
  if full:
   c=m.chart(uj);c['utc']=r['utc'];c['stability']={}
   for seconds in [-5,-1,1,5]:
    alt=m.chart(uj+seconds/86400)
    diff=[{'side':side,'body':body,'atMinute':c[side][body]['gateLine'],'shifted':alt[side][body]['gateLine']}for side in ['personality','design']for body in c[side]if c[side][body]['gateLine']!=alt[side][body]['gateLine']]
    c['stability'][str(seconds)]={'all26Stable':not diff,'changes':diff}
   rows.append(c)
  else:
   acts={}
   for b in sorted({t['body']for t in r['triggers']}):
    v=m.body(uj,b);acts[b]=m.activation(v[0],v[3])
   rows.append({'utc':r['utc'],'activations':acts})
 output.write_text(json.dumps({'model':key,'classification':m.label,'timeMode':m.mode,'swissVersion':m.native.version,'rows':rows},indent=2)+'\n')
 print('evaluated',key,len(rows),'full' if full else 'screen',flush=True)

def select(pool,screen,out):
 raw=json.loads(pool.read_text());lookup={k:{r['utc']:r for r in json.loads((screen/f'{k}.json').read_text())['rows']}for k in MODELS}
 candidates=[]
 for r in raw['points']:
  differences={}
  for t in r['triggers']:
   b=t['body'];v={k:lookup[k][r['utc']]['activations'][b]for k in MODELS}
   contrasts=[k for k in MODELS if v[k]['gateLine']!=v['C1']['gateLine']]
   if contrasts:
    differences[b]={'contrasts':contrasts,'gateLines':{k:x['gateLine']for k,x in v.items()},'minBoundarySecondsAcrossModels':min(x['secondsToNearestBoundaryLinear']or 0 for x in v.values())}
  if differences:
   r['screenDisagreements']=differences;r['decade']=int(r['utc'][:4])//10*10
   r['score']=max(100*('C2'in d['contrasts'])+200*('C6'in d['contrasts'])+20*len(d['contrasts'])+min(d['minBoundarySecondsAcrossModels'],10) for d in differences.values())
   candidates.append(r)
 candidates.sort(key=lambda r:(-r['score'],r['utc']))
 # Preserve all rare C1/C2 or C1/C6 cases and balanced best per body/decade.
 selected={}
 for b in BODIES:
  for decade in range(1980,2031,10):
   bucket=[r for r in candidates if r['decade']==decade and b in r['screenDisagreements']]
   for r in bucket[:6]:selected[r['utc']]=r
 for contrast in ['C2','C3','C4','C5','C6']:
  for decade in range(1980,2031,10):
   bucket=[r for r in candidates if r['decade']==decade and any(contrast in d['contrasts']for d in r['screenDisagreements'].values())]
   for r in bucket[:6]:selected[r['utc']]=r
 for r in candidates:
  if any(k in d['contrasts']for d in r['screenDisagreements'].values()for k in ['C2','C6']):
   if len([s for s in selected.values()if any('C2'in d['contrasts']or'C6'in d['contrasts']for d in s['screenDisagreements'].values())])<100:selected[r['utc']]=r
 data={'screenCandidateCount':len(candidates),'countsByBody':{b:sum(b in r['screenDisagreements']for r in candidates)for b in BODIES},'contrastCounts':{k:sum(any(k in d['contrasts']for d in r['screenDisagreements'].values())for r in candidates)for k in MODELS if k!='C1'},'points':sorted(selected.values(),key=lambda r:r['utc'])}
 out.write_text(json.dumps(data,indent=2)+'\n');print('selected full pool',len(selected),'disagreements',len(candidates),data['countsByBody'],data['contrastCounts'])

def main():
 p=argparse.ArgumentParser();p.add_argument('stage',choices=['scan','evaluate','select']);p.add_argument('--runtime',type=Path);p.add_argument('--pool',type=Path);p.add_argument('--output',type=Path,required=True);p.add_argument('--model',choices=list(MODELS));p.add_argument('--full',action='store_true');p.add_argument('--screen',type=Path);a=p.parse_args()
 if a.stage=='scan':scan(a.runtime,a.output)
 elif a.stage=='evaluate':evaluate(a.model,a.runtime,a.pool,a.output,a.full)
 else:select(a.pool,a.screen,a.output)
if __name__=='__main__':main()
