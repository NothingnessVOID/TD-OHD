#!/usr/bin/env python3
"""Instrument temporary C/Sharp copies only; do not alter production equations."""
import argparse, ctypes as C, hashlib, json, math, os, shutil, subprocess, tempfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[3]
BASE='fb5743b87346e8d16810b7c4e15a3e5d01a0f3a9'
NAMES=['rawMoon','sampleEpoch','lightTimeMoon','bias','precession','nutation','meanEcliptic','ecliptic','nodeDirection','elements','correctedNode','finalNode']
def insert(s,a,b):
 assert s.count(a)==1,(a,s.count(a))
 return s.replace(a,b,1)
def main():
 parser=argparse.ArgumentParser();parser.add_argument('--c-source',type=Path,required=True);parser.add_argument('--library',type=Path,required=True);parser.add_argument('--working',action='store_true');parser.add_argument('--experiment',action='store_true');parser.add_argument('--output',type=Path,required=True);args=parser.parse_args()
 tmp=Path(tempfile.mkdtemp(prefix='td-ohd-node-trace-')).resolve();cs=tmp/'c';cs.mkdir()
 manifest=json.loads((ROOT/'docs/sharp-swiss-parity-fix/oracle-build.json').read_text())
 for f in manifest['sourceFiles']:
  data=(args.c_source/f['filename']).read_bytes();assert hashlib.sha256(data).hexdigest()==f['sha256'];(cs/f['filename']).write_bytes(data)
 s=(cs/'sweph.c').read_text()
 helper='''
static double audit_slots[3][12][6];
static int audit_sample=2;
static void audit_save(int slot,const double *x){for(int k=0;k<6;k++)audit_slots[audit_sample][slot][k]=x[k];}
void audit_get(int sample,int slot,double *x){for(int k=0;k<6;k++)x[k]=audit_slots[sample][slot][k];}
'''
 s=insert(s,'static int lunar_osc_elem(double tjd, int ipl, int32 iflag, char *serr);',helper+'\nstatic int lunar_osc_elem(double tjd, int ipl, int32 iflag, char *serr);')
 start=s.index('static int lunar_osc_elem(double tjd, int ipl, int32 iflag, char *serr) \n{');end=s.index('int swi_plan_for_osc_elem(',start)
 lunar=s[start:end]
 needle='\tretc = swemoon(t, iflag | SEFLG_SPEED, NO_SAVE, xpos[i], serr);/**/'
 lunar=insert(lunar,needle,'\taudit_sample=i;\n'+needle+'\n\taudit_save(0,xpos[i]);\n\t{double info[6]={t,0,t,epheflag,swed.fidat[SEI_FILE_MOON].sweph_denum,speed_intv};audit_save(1,info);}')
 needle='\t  retc = swemoon(t-dt, iflag | SEFLG_SPEED, NO_SAVE, xpos[i], serr);/**/'
 lunar=insert(lunar,needle,needle+'\n\t  {double info[6]={t,dt,t-dt,epheflag,swed.fidat[SEI_FILE_MOON].sweph_denum,speed_intv};audit_save(1,info);}')
 # Record the actual state passed into the oscillator-frame transformation.
 needle='\tretc = swi_plan_for_osc_elem(iflag|SEFLG_SPEED, t, xpos[i]); /* retc is always ok */'
 assert lunar.count(needle)==3
 block=lunar.index('    case SEFLG_SWIEPH:'); stop=lunar.index('    case SEFLG_MOSEPH:',block)
 part=lunar[block:stop];part=insert(part,needle,'\taudit_save(2,xpos[i]);\n'+needle);lunar=lunar[:block]+part+lunar[stop:]
 needle='      xx[i][j] = (xpos[i][j] - fac * xpos[i][j+3]) * sgn;'
 lunar=insert(lunar,needle,needle+'\n    audit_sample=i; {double v[6]={xx[i][0],xx[i][1],xx[i][2],0,0,0};audit_save(8,v);}')
 needle='    ny = 2 * atan(sqrt((1+ecce)/(1-ecce)) * sinE / (1 + cosE));'
 lunar=insert(lunar,needle,needle+'\n    {double elem[6]={sema,ecce,sinincl,uu,ny,Gmsm};audit_sample=i;audit_save(9,elem);}')
 needle='      xx[i][j] *= r[0] / r[1];'
 lunar=insert(lunar,needle,needle+'\n    {double v[6]={xx[i][0],xx[i][1],xx[i][2],0,0,0};audit_save(10,v);}')
 needle='   * precession and nutation have already been taken into account'
 lunar=insert(lunar,needle,needle) # keep assertion; place trace before comment delimiter
 needle='  /**********************************************************************\n   * precession and nutation have already been taken into account'
 lunar=insert(lunar,needle,'  audit_sample=2; audit_save(11,ndnp->x);\n'+needle)
 s=s[:start]+lunar+s[end:]
 start=s.index('int swi_plan_for_osc_elem(int32 iflag, double tjd, double *xx)\n{');end=s.index('static const struct meff_ele',start)
 frame=s[start:end]
 needle='  /************************************************\n   * precession, equator 2000 -> equator of date'
 frame=insert(frame,needle,'  audit_save(3,xx);\n'+needle)
 needle='  /************************************************\n   * nutation'
 frame=insert(frame,needle,'  audit_save(4,xx);\n'+needle)
 needle='  /************************************************\n   * transformation to ecliptic'
 frame=insert(frame,needle,'  audit_save(5,xx);\n'+needle)
 needle='  swi_coortrf2(xx+3, xx+3, oe->seps, oe->ceps);'
 frame=insert(frame,needle,needle+'\n  audit_save(6,xx);')
 frame=insert(frame,'  return(OK);','  audit_save(7,xx);\n  return(OK);')
 s=s[:start]+frame+s[end:];(cs/'sweph.c').write_text(s)
 lib=tmp/'trace.dylib';subprocess.run(['cc','-dynamiclib','-O2','-fPIC','-o',str(lib),*[str(cs/x) for x in manifest['buildCommand'][6:-1]],'-lm'],check=True)
 archive=subprocess.check_output(['git','archive',BASE,'third_party/SharpAstrology.SwissEph','engine-core','docs/sharp-swiss-parity-fix/scripts/parity-harness'],cwd=ROOT)
 subprocess.run(['tar','-x','-C',str(tmp)],input=archive,check=True)
 if args.working:
  shutil.copytree(ROOT/'third_party/SharpAstrology.SwissEph',tmp/'third_party/SharpAstrology.SwissEph',dirs_exist_ok=True,ignore=shutil.ignore_patterns('obj','bin'))
 p=tmp/'third_party/SharpAstrology.SwissEph/Application/Bodies/BodyService.cs';s=p.read_text()
 needle='        var moon = source.Compute(CelestialBody.Moon, jd, resolvedFlags | EphemerisFlags.Speed);'
 tail='''
        NodeAudit.Epoch=jd.Value;
        NodeAudit.State("rawMoon",moon);
        var diagnosticDelay=moon.Position.Length*AstronomicalConstants.LightTimeAuPerDay;
        NodeAudit.Values("sampleEpoch",new[]{jd.Value,0.0,jd.Value,(double)source.Kind,(double)moon.DeNumber,LunarOsculatingElements.StepDaysFor(source.Kind)});
'''
 if args.experiment:
  tail+='''        if (source.Kind!=EphemerisSource.Moshier && (resolvedFlags & EphemerisFlags.TruePosition)==0) {
          moon=source.Compute(CelestialBody.Moon,new JulianDay(jd.Value-diagnosticDelay),resolvedFlags|EphemerisFlags.Speed);
          NodeAudit.Values("sampleEpoch",new[]{jd.Value,diagnosticDelay,jd.Value-diagnosticDelay,(double)source.Kind,(double)moon.DeNumber,LunarOsculatingElements.StepDaysFor(source.Kind)});
        }
'''
 if not args.working:
  tail+='        NodeAudit.State("lightTimeMoon",moon);'
 if args.working:
  marker='        return MoonToEclipticOfDate(moon, jd.Value, withNutation);'
  s=insert(s,marker,'        NodeAudit.State("lightTimeMoon",moon);\n        if (source.Kind!=EphemerisSource.Moshier && (resolvedFlags & EphemerisFlags.TruePosition)==0) NodeAudit.Values("sampleEpoch",new[]{jd.Value,diagnosticDelay,jd.Value-diagnosticDelay,(double)source.Kind,(double)moon.DeNumber,LunarOsculatingElements.StepDaysFor(source.Kind)});\n'+marker)
 s=insert(s,needle,needle+tail)
 # When tracing a working patch, its raw/retarded markers are recorded around the production refetch as well.
 needle='            Span<double> pos = stackalloc double[3] { state[0], state[1], state[2] };'
 s=insert(s,needle,'            NodeAudit.Values("bias",state.ToArray());\n'+needle)
 needle='            var meanEps = Precession.MeanObliquity(jdTt, _models);'
 s=insert(s,needle,'            NodeAudit.Vector("precession",pos,vel);\n'+needle)
 needle='        Nutation.Apply(vel, nut, meanEps);'
 s=insert(s,needle,needle+'\n        NodeAudit.Vector("nutation",pos,vel);')
 needle='        FrameTransform.EquatorialToEcliptic(vel, meanEps);\n        FrameTransform.EquatorialToEcliptic(pos, nut.DeltaEpsilonRad);\n        FrameTransform.EquatorialToEcliptic(vel, nut.DeltaEpsilonRad);\n    }\n\n    /// <summary>\n    /// Compute the mean lunar node'
 s=insert(s,needle,needle.replace('        FrameTransform.EquatorialToEcliptic(pos, nut.DeltaEpsilonRad);','        NodeAudit.Vector("meanEcliptic",pos,vel);\n        FrameTransform.EquatorialToEcliptic(pos, nut.DeltaEpsilonRad);').replace('        FrameTransform.EquatorialToEcliptic(vel, nut.DeltaEpsilonRad);','        FrameTransform.EquatorialToEcliptic(vel, nut.DeltaEpsilonRad);\n        NodeAudit.Vector("ecliptic",pos,vel);'))

 s+='''
internal static class NodeAudit {
 internal static double Epoch;
 internal static void Values(string stage,double[] vector)=>Console.Error.WriteLine(System.Text.Json.JsonSerializer.Serialize(new{stage,epoch=Epoch,vector}));
 internal static void State(string stage,BodyState state)=>Values(stage,new[]{state.Position.X,state.Position.Y,state.Position.Z,state.Velocity.X,state.Velocity.Y,state.Velocity.Z});
 internal static void Pair(string stage,Vec3 p,Vec3 v)=>Values(stage,new[]{p.X,p.Y,p.Z,v.X,v.Y,v.Z});
 internal static void Vector(string stage,ReadOnlySpan<double> p,ReadOnlySpan<double> v)=>Values(stage,new[]{p[0],p[1],p[2],v[0],v[1],v[2]});
}
''';p.write_text(s)
 p=tmp/'third_party/SharpAstrology.SwissEph/Application/Bodies/LunarOsculatingElements.cs';s=p.read_text()
 needle='            nodes[i] = ComputeNodeDirection(sample.Position, sample.Velocity);'
 s=insert(s,needle,'            NodeAudit.Epoch=i;\n'+needle+'\n            NodeAudit.Pair("nodeDirection",nodes[i].Position,Vec3.Zero);')
 needle='            apogees[i] = ComputeApogeeAndCorrectNode(ref nodes[i], sample.Position, sample.Velocity);'
 s=insert(s,needle,needle+'\n            NodeAudit.Pair("correctedNode",nodes[i].Position,Vec3.Zero);')
 needle='        // Apogee polar (in orbital plane)'
 s=insert(s,needle,'        NodeAudit.Values("elements",new[]{sema,ecce,sinIncl,u,nu,GmsmAuPerDay2});\n'+needle)
 needle='        return new Result('
 s=insert(s,needle,'        NodeAudit.Epoch=2; NodeAudit.Pair("finalNode",nodes[2].Position,nodeVel);\n'+needle);p.write_text(s)
 project=tmp/'docs/sharp-swiss-parity-fix/scripts/parity-harness/ParityHarness.csproj'
 project.write_text(project.read_text().replace('../../../../engine-core/SharpTransitCore.csproj','../../../../third_party/SharpAstrology.SwissEph/SharpAstrology.SwissEph.csproj'))
 (project.parent/'Program.cs').write_text('''using System.Text.Json;
using SharpAstrology.SwissEphemerides;
using SharpAstrology.SwissEphemerides.Domain.Time;
using SharpAstrology.SwissEphemerides.Application.Bodies;
using var context=new EphemerisContextBuilder().UseSwissEphFiles(args[0]).DisableMoshier().Build();
var state=context.Bodies.Compute(CelestialBody.TrueNode,new JulianDay(double.Parse(args[1],System.Globalization.CultureInfo.InvariantCulture)),(EphemerisFlags)int.Parse(args[2]));
var p=state.Position;var v=state.Velocity;var lon=Math.Atan2(p.Y,p.X)*180/Math.PI;if(lon<0)lon+=360;
var speed=(p.X*v.Y-p.Y*v.X)/(p.X*p.X+p.Y*p.Y)*180/Math.PI;
Console.WriteLine(JsonSerializer.Serialize(new{longitude=lon,speed,source=state.Source.ToString(),vector=new[]{p.X,p.Y,p.Z,v.X,v.Y,v.Z}}));
''')
 dotnet=os.environ.get('DOTNET','dotnet');subprocess.run([dotnet,'build',str(project),'-c','Release','-v','quiet','-m:1'],check=True)
 dll=project.parent/'bin/Release/net10.0/SharpAstrology.SwissEphemerides.IntegrationTests.dll'
 original=C.CDLL(str(args.library))
 original.swe_set_ephe_path.argtypes=[C.c_char_p];original.swe_set_ephe_path(str(ROOT/'public/engine/ephe').encode())
 original.swe_calc.argtypes=[C.c_double,C.c_int,C.c_int,C.POINTER(C.c_double),C.c_char_p]
 cl=C.CDLL(str(lib));cl.swe_set_ephe_path.argtypes=[C.c_char_p];cl.swe_set_ephe_path(str(ROOT/'public/engine/ephe').encode())
 cl.swe_utc_to_jd.argtypes=[C.c_int]*5+[C.c_double,C.c_int,C.POINTER(C.c_double),C.c_char_p];pair=(C.c_double*2)();err=C.create_string_buffer(1024)
 assert cl.swe_utc_to_jd(2015,2,4,6,56,0,1,pair,err)==0
 cl.swe_calc.argtypes=[C.c_double,C.c_int,C.c_int,C.POINTER(C.c_double),C.c_char_p];cl.audit_get.argtypes=[C.c_int,C.c_int,C.POINTER(C.c_double)]
 modes=[]
 for flags in [258,274]:
  cl.swe_close();cl.swe_set_ephe_path(str(ROOT/'public/engine/ephe').encode());v=(C.c_double*6)();ret=cl.swe_calc(pair[0],11,flags,v,err);assert ret>=0 and ret&7==2 and not err.value,(ret,flags,err.value)
  unmodified=(C.c_double*6)();original.swe_close();original.swe_set_ephe_path(str(ROOT/'public/engine/ephe').encode());assert original.swe_calc(pair[0],11,flags,unmodified,err)>=0;assert list(unmodified)==list(v),"instrumentation changed C result"
  oracle=[]
  for sample in range(3):
   d={}
   for slot,name in enumerate(NAMES):
    a=(C.c_double*6)();cl.audit_get(sample,slot,a);d[name]=list(a)
   oracle.append(d)
  run=subprocess.run([dotnet,str(dll),str(ROOT/'public/engine/ephe'),str(pair[0]),str(flags)],capture_output=True,text=True,check=True)
  events=[json.loads(l) for l in run.stderr.splitlines()];sharp=[{} for _ in range(3)]
  for row in events:
   ix=int(row['epoch']) if row['epoch'] in [0,1,2] else (2 if row['epoch']==pair[0] else (0 if row['epoch']<pair[0] else 1))
   sharp[ix][row['stage']]=row['vector']
  result=json.loads(run.stdout);modes.append({'flags':flags,'sharp':sharp,'swissC':oracle,'sharpFinal':result,'swissCFinal':{'longitude':v[0],'speed':v[3]},'longitudeResidualMas':(result['longitude']-v[0])*3600000,'speedResidualDegreesPerDay':result['speed']-v[3],'centralStagePositionMaxDifference':{n:max(abs(a-b) for a,b in zip(sharp[2][n][:3],oracle[2][n][:3])) for n in sharp[2] if n not in ['sampleEpoch','elements']},'centralStageVelocityMaxDifference':{n:max(abs(a-b) for a,b in zip(sharp[2][n][3:],oracle[2][n][3:])) for n in sharp[2] if n not in ['sampleEpoch','elements']}})
 args.output.parent.mkdir(parents=True,exist_ok=True)
 args.output.write_text(json.dumps({'baseline':BASE,'case':'G2015-feb','birthUtc':'2015-02-04T06:56:00Z','tt':pair[0],'ut1':pair[1],'workingPatch':args.working,'temporaryRefetchExperiment':args.experiment,'cCommit':manifest['commit'],'cSourceOriginalHashesVerified':True,'instrumentedCFinalExactlyEqualsUnmodifiedC':True,'oracleLibrarySha256':hashlib.sha256(args.library.read_bytes()).hexdigest(),'instrumentation':'Temporary source copies; tracing does not alter C equations. Optional Sharp refetch experiment explicitly marked.','cInstrumentedSha256':hashlib.sha256((cs/'sweph.c').read_bytes()).hexdigest(),'units':'positions AU, velocities AU/TT-day; sampleEpoch: reception TT, delay days, emission TT, source enum, DE number, finite-difference days; elements: a AU, eccentricity, sin inclination, u rad, true anomaly rad, GM AU^3/day^2','modes':modes},indent=2)+'\n')
 print(json.dumps([{k:m[k] for k in ['flags','longitudeResidualMas','speedResidualDegreesPerDay','centralStagePositionMaxDifference','centralStageVelocityMaxDifference']} for m in modes],indent=2))
if __name__=='__main__':main()
