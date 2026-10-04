#!/usr/bin/env python3
"""Diagnostic only. Direct ctypes calls to unmodified, pinned official Swiss C.
No production imports/changes, no ephemeris fallback, no fitted mapping values.
"""
import argparse, ctypes, hashlib, json, math, os, platform, subprocess
from pathlib import Path
from datetime import datetime, timezone

ROOT=Path(__file__).resolve().parents[2]
CASE_IDS=['G1995-feb','G1995-jun','G2005-jul20','G2015-tight','G2015-feb','G2025-tight','G2025-mar','G1985-tight','G2005-jul11']
MISMATCH_IDS=CASE_IDS[:7]
from frozen_mapping import gate_line as activation, boundary
UJD=2440587.5
PLANETS={'sun':0,'moon':1,'northNode':11,'mercury':2,'venus':3,'mars':4,'jupiter':5,'saturn':6,'uranus':7,'neptune':8,'pluto':9}
ORDER=['sun','earth','moon','northNode','southNode','mercury','venus','mars','jupiter','saturn','uranus','neptune','pluto']
def jd(ut):return UJD+datetime.fromisoformat(ut.replace('Z','+00:00')).timestamp()/86400

class SwissC:
 def __init__(self,path):
  self.s=ctypes.CDLL(str(path));self.count=0;self.observed=set();self.warnings=[]
  for name,args,ret in [
   ('swe_version',[ctypes.c_char_p],ctypes.c_char_p),
   ('swe_set_ephe_path',[ctypes.c_char_p],None),
   ('swe_set_jpl_file',[ctypes.c_char_p],None),
   ('swe_set_tid_acc',[ctypes.c_double],None),
   ('swe_get_tid_acc',[],ctypes.c_double),
   ('swe_calc_ut',[ctypes.c_double,ctypes.c_int,ctypes.c_int,ctypes.POINTER(ctypes.c_double),ctypes.c_char_p],ctypes.c_int),
   ('swe_deltat_ex',[ctypes.c_double,ctypes.c_int,ctypes.c_char_p],ctypes.c_double),
   ('swe_close',[],None),
   ('swe_get_current_file_data',[ctypes.c_int,ctypes.POINTER(ctypes.c_double),ctypes.POINTER(ctypes.c_double),ctypes.POINTER(ctypes.c_int)],ctypes.c_char_p),
   ('swi_get_jpl_denum',[],ctypes.c_int),
  ]:
   f=getattr(self.s,name);f.argtypes=args;f.restype=ret
  self.version=self.s.swe_version(ctypes.create_string_buffer(256)).decode();assert self.version=='2.10.03',self.version
 def setup(self,ephe,jpl,flags):
  self.s.swe_close();self.s.swe_set_ephe_path(str(ephe).encode());self.s.swe_set_tid_acc(999999);self.flags=flags
  if jpl:self.s.swe_set_jpl_file(jpl.encode())
 def calc(self,j,body):
  xx=(ctypes.c_double*6)();serr=ctypes.create_string_buffer(1024);r=self.s.swe_calc_ut(j,body,self.flags,xx,serr);self.count+=1;self.observed.add(r)
  if r!=self.flags:raise RuntimeError(f'Forbidden fallback/flag change: requested {self.flags}, returned {r}, body {body}, jd {j}: {serr.value.decode()}')
  if serr.value:self.warnings.append(serr.value.decode())
  return list(xx),r
 def epoch(self,j,expected_sun=None):
  sun,ret=self.calc(j,0);serr=ctypes.create_string_buffer(1024);dt=self.s.swe_deltat_ex(j,self.flags,serr)*86400
  if serr.value:raise RuntimeError(serr.value.decode())
  entries={}
  for name in ORDER:
   if name=='sun':x=sun;origin='Swiss C Sun'
   elif name=='earth':x=list(sun);x[0]=(sun[0]+180)%360;origin='exact Sun antipode, not geocentric physical Earth'
   elif name=='southNode':x,_=self.calc(j,11);x[0]=(x[0]+180)%360;origin='exact true North Node antipode'
   else:x,_=self.calc(j,PLANETS[name]);origin='Swiss C planet/true node'
   entries[name]={'longitude':x[0],'longitudeDecimal17':format(x[0],'.17f'),'longitudeSpeedDegreesPerDay':x[3],'gateLine':activation(x[0]),'requestedFlags':self.flags,'returnedFlags':ret,'origin':origin,'rawPositionVector':x if name not in ['earth','southNode'] else None}
  return {'julianDayUt':j,'deltaTSeconds':dt,'julianDayEt':j+dt/86400,'sun':{**entries['sun'],**boundary(sun[0],sun[3],expected_sun)},'activations':entries}
 def design(self,j):
  target=(self.calc(j,0)[0][0]-88)%360;lo=j-110;hi=j-70
  for _ in range(75):
   m=lo+(hi-lo)/2
   if m in (lo,hi):break
   if (self.calc(m,0)[0][0]-target+180)%360-180>=0:hi=m
   else:lo=m
  return (lo+hi)/2
 def files(self):
  files=[]
  for i in range(5):
   start=ctypes.c_double();end=ctypes.c_double();de=ctypes.c_int();name=self.s.swe_get_current_file_data(i,ctypes.byref(start),ctypes.byref(end),ctypes.byref(de))
   if name:files.append({'index':i,'filename':Path(name.decode()).name,'startJulianDay':start.value,'endJulianDay':end.value,'deNumber':de.value})
  return files

def main():
 p=argparse.ArgumentParser();p.add_argument('--library',type=Path,required=True);p.add_argument('--group',choices=['A-SWISS','A-JPL441','A-JPL431'],required=True);p.add_argument('--ephe',type=Path,required=True);p.add_argument('--output',type=Path,required=True);a=p.parse_args()
 golden=json.loads((ROOT/'golden-cases.json').read_text());cases={r['id']:r for r in golden['cases']};c=SwissC(a.library)
 flags=258 if a.group=='A-SWISS' else 257;jpl=None if a.group=='A-SWISS' else 'de441.eph' if a.group=='A-JPL441' else 'de431.eph';c.setup(a.ephe,jpl,flags)
 rows=[]
 for caseid in CASE_IDS:
  case=cases[caseid];j=jd(case['birthUtc']);personality=c.epoch(j,case['expected']['activations']['personality']['sun']);d=c.design(j);design=c.epoch(d,case['expected']['activations']['design']['sun'])
  diffs=[]
  for side,actual in [('personality',personality),('design',design)]:
   for n in ORDER:
    expected=case['expected']['activations'][side][n];computed=actual['activations'][n]['gateLine']
    if expected!=computed:diffs.append({'side':side,'point':n,'computed':computed,'jovian':expected})
  profile=personality['sun']['gateLine'].split('.')[1]+'/'+design['sun']['gateLine'].split('.')[1]
  rows.append({'id':caseid,'birthUtc':case['birthUtc'],'julianDayInputUt':j,'personality':personality,'design':design,'designUtc':datetime.fromtimestamp((d-UJD)*86400,timezone.utc).isoformat().replace('+00:00','Z'),'solarArcDegrees':(personality['sun']['longitude']-design['sun']['longitude'])%360,'profile':profile,'expectedJovianProfile':case['expected']['profile'],'all26MismatchCount':len(diffs),'all26Mismatches':diffs,'personalitySunMatchesJovian':personality['sun']['gateLine']==case['expected']['activations']['personality']['sun']})
 loaded=c.files();jplde=c.s.swi_get_jpl_denum() if jpl else None
 if jpl:assert jplde==(441 if a.group=='A-JPL441' else 431),(a.group,jplde)
 else:assert {f['deNumber'] for f in loaded if f['index'] in [0,1]}=={441},loaded
 out={'group':a.group,'status':'completed','engine':'unmodified official Swiss Ephemeris C','swissVersion':c.version,'flagsRequested':flags,'flagsReturnedObserved':sorted(c.observed),'ephemerisFlagRequested':flags&7,'ephemerisFlagReturnedObserved':sorted({f&7 for f in c.observed}),'calcUtCallCount':c.count,'fallbackAllowed':False,'positionDefinition':'tropical geocentric apparent longitude, nutation, equinox/ecliptic of date, speed; not true/topocentric/sidereal/J2000/ICRS','timeConversion':'frozen birthUtc directly to JD UT via Unix epoch / 86400 + 2440587.5, identical to previous audit; no repeated local/timezone conversion; UTC-as-UT convention retained','earthImplementation':'Sun antipode, longitude (Sun + 180) mod 360; not a zero geocentric Earth coordinate','trueNodes':True,'rawJplRuntimeDeNumber':jplde,'loadedFiles':loaded,'tidalAcceleration':c.s.swe_get_tid_acc(),'warnings':list(set(c.warnings)),'cases':rows,'summary':{'ninePersonalitySunJovianMatches':sum(r['personalitySunMatchesJovian'] for r in rows),'sevenMismatchPersonalitySunJovianMatches':sum(r['personalitySunMatchesJovian'] for r in rows[:7]),'nineAll26JovianMatches':sum(r['all26MismatchCount']==0 for r in rows),'sevenMismatchAll26JovianMatches':sum(r['all26MismatchCount']==0 for r in rows[:7])}}
 a.output.write_text(json.dumps(out,indent=2)+'\n');c.s.swe_close();print(json.dumps(out['summary']));print('runtimeflags',out['flagsReturnedObserved'],'JPL DE',jplde)
if __name__=='__main__':main()
