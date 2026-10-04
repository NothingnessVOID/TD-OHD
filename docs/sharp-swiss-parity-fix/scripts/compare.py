#!/usr/bin/env python3
"""Swiss C 2.10.03 oracle. Independent astronomy/root; unchanged HD mapping/mechanics.
Use --library built from the pinned official source; no binaries are committed.
"""
import argparse,ctypes as C,json,hashlib,subprocess,os
from pathlib import Path
from datetime import datetime,timezone
ROOT=Path(__file__).resolve().parents[3]
IDS=['G1995-feb','G1995-jun','G2005-jul20','G2015-tight','G2015-feb','G2025-tight','G2025-mar','G1985-tight','G2005-jul11']
BODIES={'sun':0,'earth':0,'moon':1,'northNode':11,'southNode':11,'mercury':2,'venus':3,'mars':4,'jupiter':5,'saturn':6,'uranus':7,'neptune':8,'pluto':9}
def dump(path,value):path.parent.mkdir(parents=True,exist_ok=True);path.write_text(json.dumps(value,indent=2,ensure_ascii=False)+'\n')
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def main():
 a=argparse.ArgumentParser();a.add_argument('--library',type=Path,required=True);a.add_argument('--ephe',type=Path,default=ROOT/'public/engine/ephe');a.add_argument('--output',type=Path,default=ROOT/'docs/sharp-swiss-parity-fix/results.json');args=a.parse_args()
 manifest=json.loads((ROOT/'engine-wasm/ephemeris-manifest.json').read_text())
 for name,digest in manifest['files'].items():assert sha(args.ephe/name)==digest,name
 s=C.CDLL(str(args.library))
 def bind(name,types,result):f=getattr(s,name);f.argtypes=types;f.restype=result;return f
 version=bind('swe_version',[C.c_char_p],C.c_char_p)(C.create_string_buffer(256)).decode();assert version=='2.10.03'
 bind('swe_set_ephe_path',[C.c_char_p],None)(str(args.ephe).encode())
 calc=bind('swe_calc',[C.c_double,C.c_int,C.c_int,C.POINTER(C.c_double),C.c_char_p],C.c_int)
 calcut=bind('swe_calc_ut',[C.c_double,C.c_int,C.c_int,C.POINTER(C.c_double),C.c_char_p],C.c_int)
 convert=bind('swe_utc_to_jd',[C.c_int]*5+[C.c_double,C.c_int,C.POINTER(C.c_double),C.c_char_p],C.c_int)
 inverse=bind('swe_jdet_to_utc',[C.c_double,C.c_int]+[C.POINTER(C.c_int)]*5+[C.POINTER(C.c_double)],None)
 def pair(utc):
  t=datetime.fromisoformat(utc.replace('Z','+00:00'));dr=(C.c_double*2)();err=C.create_string_buffer(1024)
  assert convert(t.year,t.month,t.day,t.hour,t.minute,t.second+t.microsecond/1e6,1,dr,err)==0,err.value
  return list(dr)
 def position(jd,body,fn=calc,flags=258):
  x=(C.c_double*6)();err=C.create_string_buffer(1024);r=fn(jd,body,flags,x,err)
  assert r==flags,(r,err.value);assert not err.value,err.value
  return {'longitude':x[0],'speed':x[3]}
 def epoch(tt,ut):
  out={}
  for name,body in BODIES.items():
   p=position(tt,body);q=position(ut,body,calcut)
   assert abs(p['longitude']-q['longitude'])<1e-10,(name,p,q)
   if name in ['earth','southNode']:p['longitude']=(p['longitude']+180)%360
   out[name]=p
  return out
 def utcfromtt(tt):
  ns=[C.c_int() for _ in range(5)];sec=C.c_double();inverse(tt,1,*[C.byref(n) for n in ns],C.byref(sec))
  return datetime(*[n.value for n in ns],int(sec.value),int((sec.value%1)*1e6),tzinfo=timezone.utc).isoformat().replace('+00:00','Z')
 goldenPath=ROOT/'docs/golden-reference/golden-cases.json';goldenHash=sha(goldenPath);golden={x['id']:x for x in json.loads(goldenPath.read_text())['cases']}
 oracles=[];requests=[]
 for id in IDS:
  birth=golden[id]['birthUtc'];tt,ut=pair(birth);p=epoch(tt,ut);target=(p['sun']['longitude']-88)%360;lo=tt-110;hi=tt-70
  for _ in range(75):
   mid=(lo+hi)/2
   if mid in [lo,hi]:break
   if (position(mid,0)['longitude']-target+180)%360-180>=0:hi=mid
   else:lo=mid
  dtt=(lo+hi)/2;dutc=utcfromtt(dtt);_,dut=pair(dutc)
  d=epoch(dtt,dut)
  frac=datetime.fromisoformat(birth.replace('Z','+00:00')).timestamp()+.1234567
  fracUtc=datetime.fromtimestamp(frac,timezone.utc).isoformat().replace('+00:00','Z')
  oracle={'id':id,'birthUtc':birth,'tt':tt,'ut1':ut,'fractionUt1':pair(fracUtc)[1],'designTt':dtt,'designUt1':dut,'designUtc':dutc,'solarArc':(p['sun']['longitude']-d['sun']['longitude'])%360,'personality':p,'design':d}
  oracles.append(oracle);requests.append({'id':id,'birthUtc':birth,'oracle':oracle})
 project=ROOT/'docs/sharp-swiss-parity-fix/scripts/parity-harness/ParityHarness.csproj';dotnet=os.environ.get('DOTNET','dotnet')
 subprocess.run([dotnet,'build',str(project),'-c','Release','-v','quiet'],check=True)
 dll=project.parent/'bin/Release/net10.0/SharpAstrology.SwissEphemerides.IntegrationTests.dll'
 run=subprocess.run([dotnet,str(dll),str(args.ephe)],input='\n'.join(json.dumps(r) for r in requests)+'\n',text=True,capture_output=True,check=True)
 sharp=[json.loads(line) for line in run.stdout.splitlines()];assert len(sharp)==9,run.stdout
 rows=[];allResiduals=[];sunSameEpoch=[];fullMatches=0
 for c,q in zip(oracles,sharp):
  assert 'error' not in q,q
  assert abs(q['ut1']-c['ut1'])*86400<.0001,(c['id'],'UTC/UT1',q['ut1'],c['ut1'])
  assert abs(q['fractionUt1']-c['fractionUt1'])*86400<.0001,(c['id'],'fraction')
  rootDiff=(datetime.fromisoformat(q['designUtc'])-datetime.fromisoformat(c['designUtc'].replace('Z','+00:00'))).total_seconds()
  assert abs(rootDiff)<.01,(c['id'],'Design root',rootDiff)
  diffs=[];acts=[]
  for side in ['personality','design']:
   for name in BODIES:
    actual=q[side][name];expected=q['oracle'+side.title()][name];sameEpoch=q['sharpAtOracleDesign'][name] if side=='design' else actual
    residual=((actual['longitude']-expected['longitude']+180)%360-180)*3600000
    sameResidual=((sameEpoch['longitude']-expected['longitude']+180)%360-180)*3600000
    fields=[f for f in ['gate','line','color','tone','base'] if actual[f]!=expected[f]]
    if fields:diffs.append({'side':side,'body':name,'fields':fields})
    record={'case':c['id'],'side':side,'body':name,'sharp':actual,'swissC':expected,'longitudeResidualMas':residual,'longitudeResidualArcsec':residual/1000,'sameEpochResidualMas':sameResidual,'speedResidualDegreesPerDay':actual['speed']-expected['speed'],'activationMismatches':fields}
    acts.append(record);allResiduals.append(record)
    if name=='sun':sunSameEpoch.append(abs(sameResidual));assert abs(sameResidual)<.001,(c['id'],side,'Sun parity',sameResidual)
  mechanics=['type','authority','profile','definition','incarnationCross','channels','centers']
  mechDiff=[f for f in mechanics if q['chart'][f]!=q['oracleChart'][f]]
  fullMatches+=not diffs and not mechDiff
  jovian=golden[c['id']]['expected']
  rows.append({'id':c['id'],'SWISS_PARITY':{'time':'PASS','sun':'PASS','designRoot':'PASS','mechanicsMismatches':mechDiff,'activationMismatches':diffs,'fullChartMatch':not diffs and not mechDiff},'JOVIAN_COMPATIBILITY':{'informationalOnly':True,'personalitySun':jovian['activations']['personality']['sun'],'profile':jovian['profile']},'designRootDifferenceSeconds':rootDiff,'oracle':c,'sharp':q,'comparisons':acts})
 worst=max(allResiduals,key=lambda r:abs(r['longitudeResidualMas']))
 summary={'targetedSwissParity':'PASS','sunMaxSameEpochResidualMas':max(sunSameEpoch),'sunMaxOwnRootResidualMas':max(abs(r['longitudeResidualMas']) for r in allResiduals if r['body']=='sun'),'all13MaxResidualMas':abs(worst['longitudeResidualMas']),'worstBody':{k:worst[k] for k in ['case','side','body']},'nineFullChartMatches':fullMatches,'nineGateLineMatches':sum(all(not any(f in x['fields'] for f in ['gate','line']) for x in r['SWISS_PARITY']['activationMismatches']) for r in rows),'nineMechanicsMatches':sum(not r['SWISS_PARITY']['mechanicsMismatches'] for r in rows),'allBodiesNumericalParity':False,'sunMaxSpeedResidualDegreesPerDay':max(abs(r['speedResidualDegreesPerDay']) for r in allResiduals if r['body']=='sun'),'comparisons':len(allResiduals),'maxDesignRootDifferenceSeconds':max(abs(r['designRootDifferenceSeconds']) for r in rows),'remainingBodyDifferences':'Recorded, not repaired in this two-bug patch'}
 dump(args.output,{'oracle':'unmodified Swiss C 2.10.03, production se1, proper UTC->TT/UT1; swe_calc(TT)==swe_calc_ut(UT1)','cCommit':'175e1fcb3108bcd5c0d146c803f51dcf23508012','cLibrarySha256':sha(args.library),'goldenSha256':goldenHash,'mechanicsOracle':'Both activation sets mapped/classified by unchanged HumanDesign 1.2.0; C astronomy and Design root independently calculated','summary':summary,'cases':rows})
 assert sha(goldenPath)==goldenHash
 print(json.dumps(summary,ensure_ascii=False))
if __name__=='__main__':main()
