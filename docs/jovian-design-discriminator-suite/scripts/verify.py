#!/usr/bin/env python3
"""Independent offline recomputation using the prior immutable bisection Model.

python3 docs/jovian-design-discriminator-suite/scripts/verify.py --suite <draft-or-sealed-dir> --output /tmp/jdd-independent-verification.json
No official collection is performed. All verification reports are written outside
repository docs. Every model gets a fresh subprocess and re-solves the 88 degree
root through the old native.design method, including +-1/+5 second inputs.
"""
import argparse,hashlib,json,subprocess,sys
from datetime import datetime,timezone,timedelta
from pathlib import Path
sys.dont_write_bytecode=True
ROOT=Path(__file__).resolve().parents[3]
OLD=ROOT/'docs/jovian-discriminator-suite'
NEW=ROOT/'docs/jovian-design-discriminator-suite'
sys.path.insert(0,str(OLD/'scripts'))
from models import Model,MODELS,ORDER,utc_jd,signed,iso
sys.path.insert(0,str(NEW/'scripts'))
import research_models as extension
BASE='d3693d4942a23e043fa75efd84287f7393656f78'

def sha(p):
 h=hashlib.sha256()
 with p.open('rb') as f:
  for block in iter(lambda:f.read(1024*1024),b''):h.update(block)
 return h.hexdigest()
def read(p):return json.loads(p.read_text())
def clock(t):
 # This renders a numerical Julian day as a calendar label, not an assertion
 # that UT1 is UTC or that the official display has a known timezone.
 x=datetime.fromtimestamp((t-2440587.5)*86400,timezone.utc)
 return {'numericJulianDay':t,'numericCalendarLabel':x.replace(tzinfo=None).isoformat(),'truncatedMinute':x.replace(tzinfo=None).isoformat(timespec='minutes'),'roundedMinute':(x+timedelta(seconds=30)).replace(second=0,microsecond=0).replace(tzinfo=None).isoformat(timespec='minutes')}
def worker(key,runtime,utcs):
 m=Model(key,runtime);rows={}
 for utc in utcs:
  u=utc_jd(utc);c=m.chart(u);c['stability']={}
  for sec in [-5,-1,1,5]:
   alt=m.chart(u+sec/86400)
   changes=[{'side':s,'body':b,'atMinute':c[s][b]['gateLine'],'shifted':alt[s][b]['gateLine']}for s in ['personality','design']for b in ORDER if c[s][b]['gateLine']!=alt[s][b]['gateLine']]
   c['stability'][str(sec)]={'all26Stable':not changes,'design13Stable':not any(v['side']=='design' for v in changes),'changes':changes}
  ext=extension.chart(m,u)
  arc=signed(c['personality']['sun']['longitude'],c['design']['sun']['longitude']+88)
  c['verification']={'88degreeArcResidualDegrees':arc,'nativeRootUt1NumericClock':clock(m.native.ut1(c['designTtJd'])),'designClockSemantics':'native UT1 numeric calendar is inverse input clock for utc-as-ut1 model; UTC-from-TT is physical UTC conversion. Official timezone UNKNOWN; neither proves an exact official timestamp match.','extensionRootBitIdenticalToPriorModel':ext['designTtJd']==c['designTtJd'],'extensionRootMinusPriorSeconds':(ext['designTtJd']-c['designTtJd'])*86400,'extensionMaxLongitudeDeltaDegrees':max(abs(signed(ext[s][b]['longitude'],c[s][b]['longitude']))for s in ['personality','design']for b in ORDER),'extensionGateLineEqual':all(ext[s][b]['gateLine']==c[s][b]['gateLine'] for s in ['personality','design']for b in ORDER),'extensionProfileEqual':ext['profile']==c['profile']}
  rows[utc]=c
 return {'model':key,'swissVersion':m.native.version,'returnedFlags':sorted(m.native.returns),'rows':rows}
def main(a):
 assert not ROOT in a.output.resolve().parents,'Verification output must be outside repository'
 checks=[];failures=[]
 def check(name,ok,detail=None):
  checks.append({'name':name,'passed':bool(ok),'detail':detail})
  if not ok:failures.append(name)
 def seal(directory,label,required):
  p=directory/'SHA256SUMS.json'
  if not p.exists():
   checks.append({'name':label+' seal','passed':None,'detail':'Not formed yet; prepared draft only'})
   if required:failures.append(label+' seal missing')
   return
  x=read(p)
  for f,h in x['files'].items():check(label+' seal '+f,(directory/f).is_file() and sha(directory/f)==h)
  for f,h in x.get('inheritedFiles',{}).items():check(label+' inherited seal '+f,(ROOT/f).is_file() and sha(ROOT/f)==h)
 seal(OLD,'old',True);seal(a.suite,'new',a.require_seal)
 oldmeta=read(OLD/'predictions-sealed.json')['models']
 for k,definition in MODELS.items():
  lib=a.runtime/(definition[0]+('.dylib'if sys.platform=='darwin'else'.so'))
  check('native library '+k,sha(lib)==oldmeta[k]['librarySha256'])
 assets=read(ROOT/'docs/ra-era-astronomy-stack/acquisition-manifest.json')['assets']
 for asset in assets:
  p=a.runtime/asset['name'];check('acquisition asset '+asset['name'],p.is_file() and p.stat().st_size==asset['bytes'] and sha(p)==asset['sha256'])
 branch=subprocess.check_output(['git','branch','--show-current'],cwd=ROOT,text=True).strip()
 check('research branch',branch=='research/jovian-design-discriminator-suite-v1',branch)
 head=subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip()
 ancestor=subprocess.run(['git','merge-base','--is-ancestor',BASE,head],cwd=ROOT).returncode==0
 check('baseline remains ancestor of HEAD',ancestor,head)
 changed=set(subprocess.check_output(['git','diff','--name-only',BASE],cwd=ROOT,text=True).splitlines())|set(subprocess.check_output(['git','ls-files','--others','--exclude-standard'],cwd=ROOT,text=True).splitlines())
 check('repository scope only new docs',all(p.startswith('docs/jovian-design-discriminator-suite/')for p in changed),sorted(changed))
 predpath=a.predictions if a.predictions else a.suite/('design-predictions-sealed.json'if(a.suite/'design-predictions-sealed.json').exists()else'predictions-sealed.json')
 casepath=a.cases if a.cases else a.suite/('design-discriminator-cases.json'if(a.suite/'design-discriminator-cases.json').exists()else'cases.json')
 if not predpath.exists() or not casepath.exists():
  report={'status':'prepared_waiting_for_draft','checks':checks,'failures':failures,'note':'Model verification script prepared; no new predictions present yet'}
  a.output.parent.mkdir(parents=True,exist_ok=True);a.output.write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2));return
 predictions=read(predpath);cases=read(casepath)['cases'];pred={x['id']:x for x in predictions['cases']}
 check('case IDs and counts',len(cases)==len(pred) and {c['id']for c in cases}==set(pred))
 utcs=[c['birthUtc']for c in cases];check('unique suite UTC',len(utcs)==len(set(utcs)))
 fresh={};maxlon=0;maxroot=0;maxarc=0;count=0;extensiondiff=[]
 for k in MODELS:
  p=subprocess.run([sys.executable,str(Path(__file__).resolve()),'--worker',k,'--runtime',str(a.runtime)],input=json.dumps(utcs),text=True,capture_output=True,check=True)
  fresh[k]=json.loads(p.stdout);check('native flags '+k,fresh[k]['returnedFlags']==[MODELS[k][3]])
  for c in cases:
   stored=pred[c['id']]['models'][k];actual=fresh[k]['rows'][c['birthUtc']];diff=[]
   for side in ['personality','design']:
    for b in ORDER:
     count+=1
     if actual[side][b]['gateLine']!=stored[side][b]['gateLine']:diff.append(side+'.'+b+'.GateLine')
     delta=abs(signed(actual[side][b]['longitude'],stored[side][b]['longitude']));maxlon=max(maxlon,delta)
     if delta>1e-8:diff.append(side+'.'+b+'.longitude')
   root=abs(actual['designTtJd']-stored['designTtJd'])*86400;maxroot=max(root,maxroot)
   if root>0.0001:diff.append('design root TT')
   if actual['profile']!=stored['profile']:diff.append('Profile')
   if actual['stability']!=stored['stability']:diff.append('+-1/+-5 classifications')
   arc=abs(actual['verification']['88degreeArcResidualDegrees']);maxarc=max(maxarc,arc)
   if arc>1e-8:diff.append('88degree residual')
   if not actual['verification']['extensionRootBitIdenticalToPriorModel']:extensiondiff.append({'id':c['id'],'model':k,**actual['verification']})
   check('fresh recomputation '+c['id']+' '+k,not diff,diff)
 for c in cases:
  stability1=all(fresh[k]['rows'][c['birthUtc']]['stability'][sec]['all26Stable']for k in MODELS for sec in ['-1','1'])
  stability5=all(fresh[k]['rows'][c['birthUtc']]['stability'][sec]['all26Stable']for k in MODELS for sec in ['-5','5'])
  check('suite sensitivity metadata '+c['id'],c['allModelsStableAtPlusMinus1s']==stability1 and c['allModelsStableAtPlusMinus5s']==stability5 and c['sensitive']==(not stability5))
 check('research extension root algorithm preserves prior exact TT',not extensiondiff,extensiondiff)
 report={'status':('passed'if(a.suite/'SHA256SUMS.json').exists()else'draft_verified_new_seal_pending')if not failures else'failed','evaluationType':'independent_recomputation_of_model_predictions_no_official_test','caseCount':len(cases),'modelCount':len(MODELS),'activationFieldsVerified':count,'maxLongitudeDeltaDegrees':maxlon,'maxRootTtDeltaSeconds':maxroot,'max88degreeResidualDegrees':maxarc,'checks':checks,'failures':failures,'freshRecomputationByModel':fresh,'clockLimitation':'Official DesignDate display timezone UNKNOWN. Native UT1 numeric calendar and UTC-from-TT are both saved without fitted offsets. Clock labels are not exact UTC observed evidence.'}
 a.output.parent.mkdir(parents=True,exist_ok=True);a.output.write_text(json.dumps(report,indent=2)+'\n');print(json.dumps({k:v for k,v in report.items()if k not in ['checks','freshRecomputationByModel']},indent=2))
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--suite',type=Path,default=NEW);p.add_argument('--runtime',type=Path,default=Path('/tmp/ra-era-research'));p.add_argument('--output',type=Path,default=Path('/tmp/jdd-independent-verification.json'));p.add_argument('--require-seal',action='store_true');p.add_argument('--predictions',type=Path);p.add_argument('--cases',type=Path);p.add_argument('--worker',choices=list(MODELS));a=p.parse_args()
 if a.worker:print(json.dumps(worker(a.worker,a.runtime,json.loads(sys.stdin.read()))))
 else:main(a)
