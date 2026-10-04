#!/usr/bin/env python3
"""Read-only tracing in temporary source copies; baseline production files never edited.
Usage: DOTNET=/path/dotnet python3 trace.py --c-source /path/pinned-swiss-c
"""
import argparse, subprocess, tempfile, json, hashlib, ctypes as C, math, shutil
from pathlib import Path
ROOT=Path(__file__).resolve().parents[3]
BASE='4054166c5284a729f093e160daafdab01cbf52f3'
def replace(s,a,b):
 assert a in s,a
 return s.replace(a,b,1)
def main():
 import os
 p=argparse.ArgumentParser();p.add_argument('--c-source',type=Path,required=True);p.add_argument('--working',action='store_true',help='Trace current lunar patch instead of baseline');p.add_argument('--output',type=Path,default=ROOT/'docs/moon-apparent-parity/trace-before.json');args=p.parse_args()
 tmp=Path(tempfile.mkdtemp(prefix='td-ohd-moon-trace-')).resolve();cs=tmp/'c';cs.mkdir()
 manifest=json.loads((ROOT/'docs/sharp-swiss-parity-fix/oracle-build.json').read_text())
 for f in manifest['sourceFiles']:
  b=(args.c_source/f['filename']).read_bytes();assert hashlib.sha256(b).hexdigest()==f['sha256'];(cs/f['filename']).write_bytes(b)
 s=(cs/'sweph.c').read_text()
 # Export raw trace slots, with no changes to equations.
 s += '\nstatic double audit_slots[12][6];\nstatic void audit_save(int k, const double *x){for(int i=0;i<6;i++)audit_slots[k][i]=x[i];}\nvoid audit_get(int k,double *x){for(int i=0;i<6;i++)x[i]=audit_slots[k][i];}\n'
 s=replace(s,'static int app_pos_etc_moon(int32 iflag, char *serr);','static int app_pos_etc_moon(int32 iflag, char *serr);\nstatic void audit_save(int k, const double *x);')
 start=s.index('static int app_pos_etc_moon(int32 iflag, char *serr)\n{');end=s.index('static int app_pos_etc_sbar',start)
 m=s[start:end]
 m=replace(m,'  /***********************************\n   * to solar system barycentric','  audit_save(0,xx); audit_save(1,pedp->x);\n  /***********************************\n   * to solar system barycentric')
 m=replace(m,'    t = pdp->teval - dt;','    t = pdp->teval - dt;\n    {double v[6]={dt,t,pdp->teval,0,0,0};audit_save(2,v);}')
 # Both Swiss and JPL have this same re-lift. Record raw Moon before it.
 needle='\tfor (i = 0; i <= 5; i++)\n\t  xx[i] += xe[i];'
 assert m.count(needle)==2
 m=m.replace(needle,'    audit_save(3,xx); audit_save(4,xe);\n'+needle+'\n    audit_save(5,xx);')
 m=replace(m,'  /**********************************\n   * \'annual\' aberration of light','  audit_save(6,xx);\n  /**********************************\n   * \'annual\' aberration of light')
 m=replace(m,'  /* if !speedflag, speed = 0 */','  audit_save(7,xx);\n  /* if !speedflag, speed = 0 */')
 m=replace(m,'  /* save J2000 coordinates;','  audit_save(8,xx);\n  /* save J2000 coordinates;')
 m=replace(m,'  return app_pos_rest(pdp, iflag, xx, xxsv, oe, serr);','  audit_save(9,xx);\n  return app_pos_rest(pdp, iflag, xx, xxsv, oe, serr);')
 s=s[:start]+m+s[end:]
 s=replace(s,'  /* now we have equatorial cartesian coordinates; save them */','  if(pdp == &swed.pldat[SEI_MOON])audit_save(10,xx);\n  /* now we have equatorial cartesian coordinates; save them */')
 s=replace(s,'  /* now we have ecliptic cartesian coordinates */','  if(pdp == &swed.pldat[SEI_MOON])audit_save(11,xx);\n  /* now we have ecliptic cartesian coordinates */')
 (cs/'sweph.c').write_text(s)
 lib=tmp/'trace.dylib';subprocess.run(['cc','-dynamiclib','-O2','-fPIC','-o',str(lib),*[str(cs/x) for x in manifest['buildCommand'][6:-1]],'-lm'],check=True)
 # Restore only needed baseline tracked files, outside the checkout.
 archive=subprocess.check_output(['git','archive',BASE,'third_party/SharpAstrology.SwissEph','engine-core','docs/sharp-swiss-parity-fix/scripts/parity-harness'],cwd=ROOT)
 subprocess.run(['tar','-x','-C',str(tmp)],input=archive,check=True)
 if args.working:
  for name in ['CorrectionPipeline.cs','BodyService.cs']:
   relative=Path('third_party/SharpAstrology.SwissEph/Application/Bodies')/name
   shutil.copy2(ROOT/relative,tmp/relative)
 path=tmp/'third_party/SharpAstrology.SwissEph/Application/Bodies/CorrectionPipeline.cs';s=path.read_text()
 helper='''    private static void Trace(CelestialBody body,string stage, ReadOnlySpan<double> v) {
        if(body==CelestialBody.Moon) Console.Error.WriteLine(System.Text.Json.JsonSerializer.Serialize(new{stage,vector=v.ToArray()}));
    }
'''
 s=replace(s,'    private readonly AstronomicalModelOverrides _models;',helper+'    private readonly AstronomicalModelOverrides _models;')
 s=replace(s,'        // Geocentric raw frames','        Trace(body,"rawMoon",xx); Trace(body,"earth",xEarth);\n        // Geocentric raw frames')
 s=replace(s,'                ToJ2000Equator(refetched, tMinusDt, xx);','''                ToJ2000Equator(refetched, tMinusDt, xx);
                Trace(body,"refetchedMoon",xx);
                if(body==CelestialBody.Moon){
                  Trace(body,"lightTime",new double[]{dtsave,tMinusDt,jdEt.Value,0,0,0});
                  Span<double> auditEarth=stackalloc double[6];
                  ToJ2000Equator(fetcher.RefetchEarth(new JulianDay(tMinusDt),flags & ~EphemerisFlags.Topocentric),tMinusDt,auditEarth);
                  Trace(body,"refetchedEarth",auditEarth);
                }''')
 s=replace(s,'                    for (var i = 0; i < 6; i++) xx[i] += xEarthCenter[i];','                    for (var i = 0; i < 6; i++) xx[i] += xEarthCenter[i];\n                    Trace(body,"lifted",xx);')
 s=replace(s,'        // ---- Step 6: gravitational','        Trace(body,"geocentric",xx);\n        // ---- Step 6: gravitational')
 s=replace(s,'        // Swiss C 2.10.03','        Trace(body,"aberration",xx);\n        // Swiss C 2.10.03')
 s=replace(s,'        // ---- Step 8: precession','        Trace(body,"bias",xx);\n        // ---- Step 8: precession')
 s=replace(s,'        // ---- Step 9: nutation','        Trace(body,"precession",xx);\n        // ---- Step 9: nutation')
 s=replace(s,'        // At this point xx is equatorial','        Trace(body,"nutation",xx);\n        // At this point xx is equatorial')
 if args.working:
  s=replace(s,'                // Both raw Moon and Earth center', '                Trace(body,"refetchedMoon",xx); Trace(body,"lightTime",new double[]{dtsave,emission.Value,jdEt.Value,0,0,0});\n                // Both raw Moon and Earth center')
  s=replace(s,'                for (var i = 0; i < 6; i++) xx[i] += earthAtEmission[i];', '                Trace(body,"refetchedEarth",earthAtEmission);\n                for (var i = 0; i < 6; i++) xx[i] += earthAtEmission[i];\n                Trace(body,"lifted",xx);')
 s=replace(s,'        // Final BodyState frame label.','        Trace(body,"ecliptic",xx);\n        // Final BodyState frame label.')
 path.write_text(s)
 project=tmp/'docs/sharp-swiss-parity-fix/scripts/parity-harness/ParityHarness.csproj'
 prog=project.parent/'Program.cs'
 prog.write_text('''using SharpAstrology.SwissEphemerides;
using SharpAstrology.Ephemerides;
using SharpAstrology.Enums;
using System.Text.Json;
using var eph=new SwissEphemeridesService(args[0],EphType.Swiss,allowMoshierFallback:false).CreateContext();
var p=eph.PlanetsPosition(Planets.Moon,DateTime.Parse("2015-02-04T06:56:00Z").ToUniversalTime());
Console.WriteLine(JsonSerializer.Serialize(new{longitude=p.Longitude,speed=p.SpeedLongitude}));
''')
 dotnet=os.environ.get('DOTNET','dotnet');subprocess.run([dotnet,'build',str(project),'-c','Release','-v','quiet','-m:1'],check=True)
 run=subprocess.run([dotnet,str(project.parent/'bin/Release/net10.0/SharpAstrology.SwissEphemerides.IntegrationTests.dll'),str(ROOT/'public/engine/ephe')],capture_output=True,text=True,check=True)
 sharp={r['stage']:r['vector'] for r in [json.loads(l) for l in run.stderr.splitlines()]}
 cl=C.CDLL(str(lib));cl.swe_set_ephe_path.argtypes=[C.c_char_p];cl.swe_set_ephe_path(str(ROOT/'public/engine/ephe').encode())
 cl.swe_utc_to_jd.argtypes=[C.c_int]*5+[C.c_double,C.c_int,C.POINTER(C.c_double),C.c_char_p];pair=(C.c_double*2)();err=C.create_string_buffer(1024)
 assert cl.swe_utc_to_jd(2015,2,4,6,56,0,1,pair,err)==0
 cl.swe_calc.argtypes=[C.c_double,C.c_int,C.c_int,C.POINTER(C.c_double),C.c_char_p];v=(C.c_double*6)();assert cl.swe_calc(pair[0],1,258,v,err)==258
 cl.audit_get.argtypes=[C.c_int,C.POINTER(C.c_double)]
 names=['rawMoon','earth','lightTime','refetchedMoon','refetchedEarth','lifted','geocentric','aberration','bias','precession','nutation','ecliptic'];oracle={}
 for i,name in enumerate(names):w=(C.c_double*6)();cl.audit_get(i,w);oracle[name]=list(w)
 def lon(v):return math.degrees(math.atan2(v[1],v[0]))%360
 def diff(a,b):return (lon(a)-lon(b)+180)%360-180
 # Project onto J2000 ecliptic longitude (not true-of-date final longitude).
 # This independent geometric projection establishes the ~20.77 arcsec cause.
 eps=math.radians(23.439291111)
 def eclip(v):return [v[0],v[1]*math.cos(eps)+v[2]*math.sin(eps),-v[1]*math.sin(eps)+v[2]*math.cos(eps)]
 earthdelta=[oracle['earth'][i]-oracle['refetchedEarth'][i] for i in range(6)]
 wrong=[oracle['geocentric'][i]+earthdelta[i] for i in range(6)]
 result={'baseline':BASE,'workingPatch':args.working,'case':'G2015-feb','birthUtc':'2015-02-04T06:56:00Z','tt':pair[0],'ut1':pair[1],
 'units':'vectors: J2000 equator AU/AU-day until precession; after that equator-of-date; ecliptic: true-of-date; lightTime: days, epoch, TT',
 'sharp':sharp,'swissC':oracle,'sharpFinal':json.loads(run.stdout),'swissCFinal':{'longitude':v[0],'speed':v[3]},
 'earthDisplacement':earthdelta,'projectedEarthDisplacementArcsec':diff(eclip(wrong),eclip(oracle['geocentric']))*3600,
 'finalLongitudeResidualArcsec':(json.loads(run.stdout)['longitude']-v[0])*3600,
 'stageVectorMaxAbsDifference':{name:max(abs(a-b) for a,b in zip(sharp[name][:3],oracle[name][:3])) for name in names if name!='lightTime'},
 'instrumentation':'Temporary source copies, trace-only callbacks, equations unchanged. C source input hashes verified against oracle-build.json.',
 'cInstrumentedSha256':hashlib.sha256((cs/'sweph.c').read_bytes()).hexdigest(),'sharpInstrumentedSha256':hashlib.sha256(path.read_bytes()).hexdigest()}
 args.output.write_text(json.dumps(result,indent=2)+'\n');print(json.dumps({k:result[k] for k in ['projectedEarthDisplacementArcsec','finalLongitudeResidualArcsec','stageVectorMaxAbsDifference']}))
if __name__=='__main__':main()
