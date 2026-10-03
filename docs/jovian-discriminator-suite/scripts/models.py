"""Sealed research models; imports only prior audit utilities, never production."""
import sys,math
from pathlib import Path
from datetime import datetime,timezone
ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/'ra-era-astronomy-stack/scripts'))
from run_stack import Native,utc_jd,tt_offset,tt_to_utc,signed,ORDER,BODIES
from frozen_mapping import gate_line,boundary
MODELS={
 'C1':('swiss177','de406','utc-as-ut1',258,None,'HISTORICAL STACK'),
 'C2':('swiss176','de406','utc-as-ut1',258,None,'HISTORICAL STACK'),
 'C3':('swiss177','de406','tt',258,None,'HISTORICAL STACK'),
 'C4':('swiss210','de441','tt',258,None,'MODERN REFERENCE'),
 'C5':('swiss177-pre1976-nut1980','de406','tt',258,None,'ARTIFICIAL EXPERIMENT'),
 'C6':('swiss177',None,'utc-as-ut1',257,'de406.eph','HISTORICAL STACK'),
}
class Model:
 def __init__(self,key,runtime):
  stem,ephe,mode,flags,jpl,label=MODELS[key]
  ext='dylib' if sys.platform=='darwin' else 'so'
  self.native=Native(runtime/f'{stem}.{ext}',runtime/ephe if ephe else runtime,flags,jpl)
  self.key=key;self.mode=mode;self.label=label
 def tt(self,uj):return uj+(self.native.s.swe_deltat(uj)if self.mode=='utc-as-ut1' else tt_offset(uj)/86400)
 def body(self,uj,body):return self.native.calc(self.tt(uj),BODIES[body])
 def activation(self,lon,speed):
  x=(lon-3.875)%360;near=(3.875+round(x/.9375)*.9375)%360;dist=signed(lon,near)
  return {'longitude':lon,'gateLine':gate_line(lon),'speedDegreesPerDay':speed,
          'nearestBoundaryLongitude':near,'signedMinusNearestBoundaryDegrees':dist,
          'signedMinusNearestBoundaryArcsec':dist*3600,'signedMinusNearestBoundaryMas':dist*3600000,
          'secondsToNearestBoundaryLinear':abs(dist/speed*86400)if speed else None}
 def epoch(self,t):
  vals={}
  for b in ORDER:
   if b=='earth':v=list(vals['sun']);v[0]=(v[0]+180)%360
   elif b=='southNode':v=list(vals['northNode']);v[0]=(v[0]+180)%360
   else:v=self.native.calc(t,BODIES[b])
   vals[b]=v
  return {b:self.activation(v[0],v[3])for b,v in vals.items()}
 def chart(self,uj):
  t=self.tt(uj);d=self.native.design(t);p=self.epoch(t);des=self.epoch(d)
  return {'personality':p,'design':des,'ttJd':t,'modelUt1Jd':self.native.ut1(t),
          'designTtJd':d,'designUtcFromTt':tt_to_utc(d),'profile':p['sun']['gateLine'].split('.')[1]+'/'+des['sun']['gateLine'].split('.')[1],
          'solarArcDegrees':(p['sun']['longitude']-des['sun']['longitude'])%360}

def iso(j):return datetime.fromtimestamp(round((j-2440587.5)*86400),timezone.utc).isoformat().replace('+00:00','Z')
def minute(j):return 2440587.5+round((j-2440587.5)*1440)/1440
