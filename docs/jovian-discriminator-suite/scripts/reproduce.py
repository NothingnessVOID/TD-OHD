"""Verify sealed 28-chart predictions using fresh native processes. Never edit sealed files."""
import argparse,json,sys,subprocess,hashlib,os,ctypes
from pathlib import Path
HERE=Path(__file__).resolve().parent
DOC=HERE.parent
sys.path.insert(0,str(HERE))
from models import Model,MODELS,utc_jd,BODIES,ORDER,signed

def worker(key,runtime,out):
 sealed=json.loads((DOC/'predictions-sealed.json').read_text());m=Model(key,runtime)
 assert m.native.version==sealed['models'][key]['swissVersion']
 records=[];maxdiff=0.;stabilityOK=True;utEquivalent=0.;sameTT=[]
 for entry in sealed['cases']:
  uj=utc_jd(entry['birthUtc']);a=m.chart(uj);b=entry['models'][key]
  for side in ['personality','design']:
   for body in ORDER:
    x,y=a[side][body],b[side][body];assert x['gateLine']==y['gateLine'],(key,entry['id'],side,body)
    maxdiff=max(maxdiff,abs(signed(x['longitude'],y['longitude'])))
  assert a['profile']==b['profile']
  for seconds in [-5,-1,1,5]:
   shifted=m.chart(uj+seconds/86400)
   stable=all(shifted[side][body]['gateLine']==a[side][body]['gateLine']for side in ['personality','design']for body in ORDER)
   # Capture actual sensitivity separately from stored metadata representation.
   records.append({'id':entry['id'],'offsetSeconds':seconds,'all26Stable':stable})
  if m.mode=='utc-as-ut1':
   for body in BODIES:
    v=(ctypes.c_double*6)();err=ctypes.create_string_buffer(1024)
    flags=m.native.s.swe_calc_ut(uj,BODIES[body],m.native.flags,v,err)
    assert flags==m.native.flags and not err.value
    utEquivalent=max(utEquivalent,abs(signed(v[0],a['personality'][body]['longitude'])))
  if key in ['C1','C2']:
   t=entry['models']['C2']['ttJd']
   sameTT.append({'id':entry['id'],'ttJd':t,'longitudes':{body:m.native.calc(t,BODIES[body])[0]for body in BODIES}})
 assert maxdiff<1e-10
 assert utEquivalent<1e-10
 out.write_text(json.dumps({'model':key,'cases':28,'activations':728,'maxReproductionResidualDegrees':maxdiff,'sweCalcUtEquivalentMaxDegrees':utEquivalent if m.mode=='utc-as-ut1'else None,'returnedFlags':sorted(m.native.returns),'sensitivity':records,'commonC2TtDiagnostic':sameTT},indent=2)+'\n')

def main():
 p=argparse.ArgumentParser();p.add_argument('--runtime',type=Path,required=True);p.add_argument('--output',type=Path,required=True);p.add_argument('--prepare',action='store_true');p.add_argument('--model',choices=MODELS);a=p.parse_args()
 if a.prepare:
  sys.path.insert(0,str(DOC.parent/'ra-era-astronomy-stack/scripts'))
  # Import by filename to avoid this script's same-name module.
  import importlib.util
  spec=importlib.util.spec_from_file_location('historical_acquisition',DOC.parent/'ra-era-astronomy-stack/scripts/reproduce.py');old=importlib.util.module_from_spec(spec);spec.loader.exec_module(old)
  a.runtime.mkdir(parents=True,exist_ok=True);old.build(a.runtime,old.prepare(a.runtime,False))
 if a.model:worker(a.model,a.runtime,a.output);return
 a.output.mkdir(parents=True,exist_ok=True)
 env=dict(os.environ);env['PYTHONDONTWRITEBYTECODE']='1';env.pop('SE_EPHE_PATH',None)
 for key in MODELS:subprocess.run([sys.executable,'-B',str(HERE/'reproduce.py'),'--runtime',str(a.runtime),'--output',str(a.output/(key+'.json')),'--model',key],check=True,env=env)
 results={key:json.loads((a.output/(key+'.json')).read_text())for key in MODELS}
 summary={'status':'passed','freshNativeProcesses':6,'differentUtc':28,'predictedActivationsVerified':4368,'models':{k:{x:v for x,v in r.items()if x not in ['sensitivity','commonC2TtDiagnostic']}for k,r in results.items()},'sensitivity':{}}
 cases=json.loads((DOC/'cases.json').read_text())['cases']
 for c in cases:
  one=all(x['all26Stable']for r in results.values()for x in r['sensitivity']if x['id']==c['id']and abs(x['offsetSeconds'])==1)
  five=all(x['all26Stable']for r in results.values()for x in r['sensitivity']if x['id']==c['id']and abs(x['offsetSeconds'])==5)
  assert one==c['allModelsStableAtPlusMinus1s'] and five==c['allModelsStableAtPlusMinus5s'],c['id']
  summary['sensitivity'][c['id']]={'allModelsStable1s':one,'allModelsStable5s':five}
 # Asset integrity is checked against archived acquisition hashes, outside Git.
 manifest=json.loads((DOC.parent/'ra-era-astronomy-stack/acquisition-manifest.json').read_text());assets=[]
 for asset in manifest['assets']:
  f=a.runtime/asset['name']
  assert f.exists() and hashlib.sha256(f.read_bytes()).hexdigest()==asset['sha256'],asset['name']
  assets.append({'name':asset['name'],'sha256':asset['sha256'],'bytes':f.stat().st_size})
 summary['acquisitionAssetsVerified']=assets
 aa={x['id']:x for x in results['C1']['commonC2TtDiagnostic']};bb={x['id']:x for x in results['C2']['commonC2TtDiagnostic']}
 common=max(abs(signed(aa[c]['longitudes'][b],bb[c]['longitudes'][b]))*3600000 for c in aa for b in BODIES)
 summary['C1C2CommonTtMaxResidualMas']=common
 (a.output/'native-reproduction.json').write_text(json.dumps(summary,indent=2)+'\n');print(json.dumps({k:v for k,v in summary.items()if k not in ['sensitivity','acquisitionAssetsVerified']},indent=2))
if __name__=='__main__':main()
