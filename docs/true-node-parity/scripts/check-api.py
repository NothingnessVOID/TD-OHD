#!/usr/bin/env python3
"""True Node API flags/sources; compare unchanged controls to exact baseline."""
import argparse,ctypes as C,hashlib,json,os,shutil,subprocess,tempfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[3]
BASE='fb5743b87346e8d16810b7c4e15a3e5d01a0f3a9'
def sha(path):
 h=hashlib.sha256()
 with path.open('rb') as file:
  for block in iter(lambda:file.read(1024*1024),b''):h.update(block)
 return h.hexdigest()
def main():
 p=argparse.ArgumentParser();p.add_argument('--library',type=Path,required=True);p.add_argument('--jpl',type=Path,required=True);a=p.parse_args()
 lib=C.CDLL(str(a.library));lib.swe_set_ephe_path.argtypes=[C.c_char_p];lib.swe_set_jpl_file.argtypes=[C.c_char_p];lib.swe_calc.argtypes=[C.c_double,C.c_int,C.c_int,C.POINTER(C.c_double),C.c_char_p]
 ephe=ROOT/'public/engine/ephe';lib.swe_set_ephe_path((str(ephe)+':'+str(a.jpl.parent)).encode());lib.swe_set_jpl_file(a.jpl.name.encode())
 requests=[];oracles=[]
 cases=json.loads((ROOT/'docs/true-node-parity/results.json').read_text())['cases']
 modes=[('apparent',256),('no-speed',0),('true',256|16),('no-aberration',256|1024),('no-nutation',256|64),('speed3',128)]
 for source in [2,1,4]:
  for c in cases:
   for side,field in [('personality','tt'),('design','designTt')]:
    for mode,flags in modes:
     flags|=source;tt=c['oracle'][field];v=(C.c_double*6)();err=C.create_string_buffer(1024);r=lib.swe_calc(tt,11,flags,v,err)
     assert r>=0 and r&7==source and not err.value,(r,err.value)
     requests.append({'case':c['id'],'side':side,'tt':tt,'flags':flags,'mode':mode,'body':11});oracles.append({'longitude':v[0],'speed':v[3]})
 project=ROOT/'docs/true-node-parity/scripts/node-harness/NodeHarness.csproj';dotnet=os.environ.get('DOTNET','dotnet')
 def run(project):
  subprocess.run([dotnet,'build',str(project),'-c','Release','-v','quiet','-m:1'],check=True)
  dll=project.parent/'bin/Release/net10.0/SharpAstrology.SwissEphemerides.IntegrationTests.dll'
  r=subprocess.run([dotnet,str(dll),str(ephe),str(a.jpl)],input='\n'.join(map(json.dumps,requests))+'\n',capture_output=True,text=True,check=True)
  rows=[json.loads(l) for l in r.stdout.splitlines()];assert len(rows)==len(requests);return rows
 now=run(project)
 temp=Path(tempfile.mkdtemp(prefix='td-ohd-node-api-base-')).resolve()
 archive=subprocess.check_output(['git','archive',BASE,'third_party/SharpAstrology.SwissEph'],cwd=ROOT);subprocess.run(['tar','-x','-C',str(temp)],input=archive,check=True)
 dest=temp/'docs/true-node-parity/scripts/node-harness';dest.mkdir(parents=True);shutil.copy2(project,dest/project.name)
 text=(project.parent/'Program.cs').read_text();start=text.index('// Source-spy tests');end=text.index('using var swiss=');text=text[:start]+'var guardCount=0;\n'+text[end:];(dest/'Program.cs').write_text(text)
 old=run(dest/project.name);rows=[];changed=controls=0
 for r,n,b,c in zip(requests,now,old,oracles):
  assert n['syntheticGuards']==24
  control=(r['flags']&7)==4 or (r['flags']&16)!=0
  if control:
   assert n['vector']==b['vector'],('control changed',r);controls+=1
  else:changed+=1
  delta=lambda lon:((lon-c['longitude']+180)%360-180)*3600000
  rows.append({**r,'sharp':n,'swissC':c,'beforeLongitudeResidualMas':delta(b['longitude']),'longitudeResidualMas':delta(n['longitude']),'speedResidualDegreesPerDay':n['speed']-c['speed'],'beforeSpeedResidualDegreesPerDay':b['speed']-c['speed'],'unchangedControl':control})
 apparent=[r for r in rows if not r['unchangedControl']];worst=max(abs(r['longitudeResidualMas']) for r in apparent);assert worst<.001,worst
 summary={'comparisons':len(rows),'sourceSpyGuards':24,'baselineControlsExactlyUnchanged':controls,'apparentSwissJplComparisons':changed,'apparentSwissJplMaxLongitudeResidualMas':worst,'standardSpeedMaxResidualDegreesPerDay':max(abs(r['speedResidualDegreesPerDay']) for r in apparent if r['mode']!='speed3'),'speed3MaxResidualDegreesPerDay':max(abs(r['speedResidualDegreesPerDay']) for r in apparent if r['mode']=='speed3'),'speed3BaselineMaxResidualDegreesPerDay':max(abs(r['beforeSpeedResidualDegreesPerDay']) for r in apparent if r['mode']=='speed3'),'speed3Note':'Existing Sharp Normalize maps SPEED3 to SPEED; Swiss C SPEED3 uses a separate finite-difference estimator. Not changed.','moshierResiduals':'Measured and exactly unchanged; not repaired in this task'}
 out={'oracleLibrarySha256':sha(a.library),'jplFile':a.jpl.name,'jplSha256':sha(a.jpl),'summary':summary,'comparisons':rows}
 (ROOT/'docs/true-node-parity/api-results.json').write_text(json.dumps(out,indent=2)+'\n');print(json.dumps(summary,indent=2))
if __name__=='__main__':main()
