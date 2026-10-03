#!/usr/bin/env python3
"""Design-only candidate search using immutable model definitions.

Old Personality boundary roots supply dates only. Each root is re-solved as a
C2 Design TT boundary, inverted through the 88 degree solar arc into birth TT,
then inverted through C2 delta-T and rounded to civil UTC minute inputs.
No official outcomes, tuned offsets, or epsilon mapping are consulted.
"""
import argparse,json,math
from pathlib import Path
from research_models import *

def write(path,data):
    path.parent.mkdir(parents=True,exist_ok=True);path.write_text(json.dumps(data,indent=2)+'\n')

def scan(runtime,seeds,out):
    m=Model('C2',runtime);points={};count=0
    for seed in json.loads(seeds.read_text())['points']:
      for trigger in seed['triggers']:
        b=trigger['body'];uj=utc_jd(trigger['C1transitionUtcApprox']);t=m.tt(uj)
        v=m.native.calc(t,BODIES[b]);target=(3.875+round((v[0]-3.875)/.9375)*.9375)%360
        for _ in range(12):
          v=m.native.calc(t,BODIES[b]);nxt=t-signed(v[0],target)/v[3]
          if nxt==t:break
          t=nxt
        assert abs(signed(m.native.calc(t,BODIES[b])[0],target))<1e-7
        sun=m.native.calc(t,0)[0];birth=solar_root(m.native,(sun+88)%360,t+90)
        raw=m.native.ut1(birth);u=minute(raw);date=iso(u)
        if not '1980-01-01T00:00:00Z'<=date<'2031-01-01T00:00:00Z':continue
        points.setdefault(date,{'utc':date,'triggers':[]})['triggers'].append({'body':b,
          'seedC1UtcApprox':trigger['C1transitionUtcApprox'],'c2DesignTransitionTtJd':t,
          'c2DesignTransitionUtcFromTt':tt_to_utc(t),'boundaryLongitude':target,
          'c2ExactBirthTtJd':birth,'c2ExactBirthNumericUtcJd':raw,'minuteMinusExactBirthSeconds':(u-raw)*86400})
        count+=1
        if count%5000==0:print('converted',count,'minutes',len(points),flush=True)
    write(out,{'baseline':'C2','seedSource':str(seeds),'seedPolicy':'immutable previous boundary pool, re-rooted with C2 as Design TT; Sun plus 88 degrees determines birth TT; inverse C2 model delta-T determines numerical UTC; nearest minute',
      'convertedTransitions':count,'points':sorted(points.values(),key=lambda r:r['utc'])})
    print('scan complete',count,len(points),flush=True)

def evaluate(key,runtime,pool,out,full):
    m=Model(key,runtime);rows=[]
    for i,r in enumerate(json.loads(pool.read_text())['points']):
      u=utc_jd(r['utc'])
      if full:
        c=chart(m,u);c['utc']=r['utc'];c['stability']={}
        for seconds in [-5,-1,1,5]:
          alt=chart(m,u+seconds/86400)
          changes=[{'side':side,'body':b,'atMinute':c[side][b]['gateLine'],'shifted':alt[side][b]['gateLine']}for side in ['personality','design']for b in ORDER if c[side][b]['gateLine']!=alt[side][b]['gateLine']]
          c['stability'][str(seconds)]={'all26Stable':not changes,'design13Stable':not any(x['side']=='design'for x in changes),'changes':changes}
      else:
        t=m.tt(u);d=design_root(m,t);acts={}
        for b in sorted({x['body']for x in r['triggers']}):
          v=m.native.calc(d,BODIES[b]);acts[b]=m.activation(v[0],v[3])
        c={'utc':r['utc'],'designTtJd':d,'activations':acts}
      rows.append(c)
      if (i+1)%5000==0:print(key,'evaluated',i+1,flush=True)
    write(out,{'model':key,'classification':m.label,'timeMode':m.mode,'swissVersion':m.native.version,'requestedFlags':m.native.flags,'returnedFlags':sorted(m.native.returns),'rows':rows})
    print('evaluated',key,len(rows),'full'if full else'screen',flush=True)

def select(pool,screen,out):
    lookup={k:{r['utc']:r for r in json.loads((screen/f'{k}.json').read_text())['rows']}for k in MODELS};candidates=[]
    for r in json.loads(pool.read_text())['points']:
      differences={}
      for b in sorted({t['body']for t in r['triggers']}):
        acts={k:lookup[k][r['utc']]['activations'][b]for k in MODELS}
        contrasts=[k for k in MODELS if acts[k]['gateLine']!=acts['C2']['gateLine']]
        if contrasts:differences[b]={'contrasts':contrasts,'gateLines':{k:v['gateLine']for k,v in acts.items()},'minBoundarySecondsAcrossModels':min(v['secondsToNearestBoundaryLinear']or 0 for v in acts.values())}
      if differences:
        r['designScreenDisagreements']=differences;r['decade']=int(r['utc'][:4])//10*10
        r['score']=max(200*('C1'in v['contrasts'])+20*len(v['contrasts'])+min(v['minBoundarySecondsAcrossModels'],10)for v in differences.values());candidates.append(r)
    candidates.sort(key=lambda r:(-r['score'],r['utc']));selected={}
    for b in BODIES:
      for decade in range(1980,2031,10):
        bucket=[r for r in candidates if r['decade']==decade and b in r['designScreenDisagreements']]
        for r in bucket[:8]:selected[r['utc']]=r
    for k in MODELS:
      if k=='C2':continue
      for decade in range(1980,2031,10):
        bucket=[r for r in candidates if r['decade']==decade and any(k in d['contrasts']for d in r['designScreenDisagreements'].values())]
        for r in bucket[:10]:selected[r['utc']]=r
    stats={'screenCandidateCount':len(candidates),'countsByBody':{b:sum(b in r['designScreenDisagreements']for r in candidates)for b in BODIES},'contrastCounts':{k:sum(any(k in d['contrasts']for d in r['designScreenDisagreements'].values())for r in candidates)for k in MODELS if k!='C2'}}
    write(out,{**stats,'points':sorted(selected.values(),key=lambda r:r['utc'])});write(out.with_name('all-screen-disagreements.json'),{**stats,'points':sorted(candidates,key=lambda r:r['utc'])});print(stats,'fullPoolCount',len(selected),flush=True)

def main():
    p=argparse.ArgumentParser();p.add_argument('stage',choices=['scan','evaluate','select']);p.add_argument('--runtime',type=Path,default=Path('/tmp/ra-era-research'));p.add_argument('--seeds',type=Path,default=Path('/tmp/jovian-discriminator/search-pool.json'));p.add_argument('--pool',type=Path);p.add_argument('--output',type=Path,required=True);p.add_argument('--model',choices=list(MODELS));p.add_argument('--full',action='store_true');p.add_argument('--screen',type=Path);a=p.parse_args()
    if a.stage=='scan':scan(a.runtime,a.seeds,a.output)
    elif a.stage=='evaluate':evaluate(a.model,a.runtime,a.pool,a.output,a.full)
    else:select(a.pool,a.screen,a.output)
if __name__=='__main__':main()
