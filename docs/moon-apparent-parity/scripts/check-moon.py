#!/usr/bin/env python3
"""Same-TT Swiss C checks for Moon center/observer and flag semantics. No annual files."""
import ctypes as C, json, subprocess, argparse, os, hashlib, tempfile, shutil
from pathlib import Path
ROOT=Path(__file__).resolve().parents[3]
def main():
 p=argparse.ArgumentParser();p.add_argument('--library',type=Path,required=True);p.add_argument('--jpl',type=Path);p.add_argument('--baseline',action='store_true');args=p.parse_args()
 s=C.CDLL(str(args.library));s.swe_set_ephe_path.argtypes=[C.c_char_p];s.swe_set_ephe_path(str(ROOT/'public/engine/ephe').encode())
 s.swe_set_topo.argtypes=[C.c_double]*3
 s.swe_calc.argtypes=[C.c_double,C.c_int,C.c_int,C.POINTER(C.c_double),C.c_char_p]
 if args.jpl:
  s.swe_set_jpl_file.argtypes=[C.c_char_p];s.swe_set_ephe_path((str(ROOT/'public/engine/ephe')+':'+str(args.jpl.parent)).encode());s.swe_set_jpl_file(args.jpl.name.encode())
 requests=[];oracle=[]
 cases=json.loads((ROOT/'docs/moon-apparent-parity/results.json').read_text())['cases']
 # 18 epochs; both source-specific paths and true/no-aberration/J2000/no-speed.
 modes=[('apparent',256,None),('no-speed',0,None),('true',256|16,None),('astrometric',256|1024,None),('J2000',256|32,None),('topo-Shanghai',256|32768,[121.4737,31.2304,20]),('topo-London',256|32768,[-.1278,51.5074,30]),('topo-true-Shanghai',256|32768|16,[121.4737,31.2304,20])]
 for source in ([2,1] if args.jpl else [2]):
  for c in cases:
   for side,field in [('personality','tt'),('design','designTt')]:
    for mode,extra,obs in modes:
     flags=source|extra;tt=c['oracle'][field];v=(C.c_double*6)();err=C.create_string_buffer(1024)
     if obs:s.swe_set_topo(*obs)
     returned=s.swe_calc(tt,1,flags|4096,v,err)
     assert returned>=0 and (returned&7)==source,(returned,err.value)
     assert not err.value,err.value
     w=(C.c_double*6)();assert s.swe_calc(tt,1,flags,w,err)>=0
     r={'case':c['id'],'side':side,'mode':mode,'tt':tt,'flags':flags}
     if obs:r['observer']=obs
     requests.append(r);oracle.append({'vector':list(v),'longitude':w[0],'speed':w[3],'returnedFlags':returned})
 dotnet=os.environ.get('DOTNET','dotnet');project=ROOT/'docs/moon-apparent-parity/scripts/moon-harness/MoonHarness.csproj'
 if args.baseline:
  temp=Path(tempfile.mkdtemp(prefix='td-ohd-moon-api-baseline-')).resolve()
  archive=subprocess.check_output(['git','archive','4054166c5284a729f093e160daafdab01cbf52f3','third_party/SharpAstrology.SwissEph'],cwd=ROOT)
  subprocess.run(['tar','-x','-C',str(temp)],input=archive,check=True)
  dest=temp/'docs/moon-apparent-parity/scripts/moon-harness';dest.mkdir(parents=True)
  shutil.copy2(project,dest/project.name)
  program=(project.parent/'Program.cs').read_text();start=program.index('var flags=');end=program.index('using var swiss=')
  (dest/'Program.cs').write_text(program[:start]+program[end:]);project=dest/project.name
 subprocess.run([dotnet,'build',str(project),'-c','Release','-v','quiet','-m:1'],check=True)
 dll=project.parent/'bin/Release/net10.0/SharpAstrology.SwissEphemerides.IntegrationTests.dll'
 run=subprocess.run([dotnet,str(dll),str(ROOT/'public/engine/ephe'),*([str(args.jpl)] if args.jpl else [])],input='\n'.join(json.dumps(r) for r in requests)+'\n',capture_output=True,text=True,check=True)
 sharp=[json.loads(l) for l in run.stdout.splitlines()];assert len(sharp)==len(oracle)
 rows=[]
 for r,a,b in zip(requests,sharp,oracle):
  assert 'error' not in a,a
  residual=((a['longitude']-b['longitude']+180)%360-180)*3600000
  vector=max(abs(x-y) for x,y in zip(a['vector'][:3],b['vector'][:3]))
  rows.append({**r,'sharp':a,'swissC':b,'longitudeResidualMas':residual,'maxPositionVectorResidualAu':vector,'speedResidualDegreesPerDay':a['speed']-b['speed']})
 # Geocentric/J2000/true paths should be roundoff-scale. Topocentric port
 # may have existing observer-model residuals; explicitly report and bound,
 # never correct another subsystem in this lunar patch.
 ordinary=[r for r in rows if not r['mode'].startswith('topo')]
 topo=[r for r in rows if r['mode'].startswith('topo')]
 summary={'comparisons':len(rows),'centerObserverSyntheticGuards':'not run on baseline' if args.baseline else 'PASS','geocentricMaxResidualMas':max(abs(r['longitudeResidualMas']) for r in ordinary),'topocentricMaxResidualMas':max(abs(r['longitudeResidualMas']) for r in topo),'topocentricMaxPositionResidualAu':max(r['maxPositionVectorResidualAu'] for r in topo),'maxSpeedResidualDegreesPerDay':max(abs(r['speedResidualDegreesPerDay']) for r in rows)}
 (ROOT/('docs/moon-apparent-parity/api-before.json' if args.baseline else 'docs/moon-apparent-parity/api-results.json')).write_text(json.dumps({'oracleLibrarySha256':hashlib.sha256(args.library.read_bytes()).hexdigest(),'summary':summary,'comparisons':rows},indent=2)+'\n')
 print(json.dumps(summary))
 if args.baseline:return
 assert summary['geocentricMaxResidualMas']<.001
 assert summary['topocentricMaxResidualMas']<1.0
if __name__=='__main__':main()
