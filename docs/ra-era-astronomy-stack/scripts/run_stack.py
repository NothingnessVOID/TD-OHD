#!/usr/bin/env python3
"""Research-only native Swiss runner. No production imports or fitted constants.

One process per shared library: historical Swiss uses process-global state.
TT mode supplies independently defined civil UTC->TT; archived-utc exercises
the original library's frozen leap-second and delta-T handling unchanged.
"""
import argparse
import ctypes as C
import json
import math
from datetime import datetime, timezone
from pathlib import Path
import sys

HERE = Path(__file__).resolve()
AUDIT = HERE.parents[2] / 'golden-reference'
sys.path.insert(0, str(AUDIT / 'root-cause-v2/scripts'))
from frozen_mapping import gate_line, boundary

J1970 = 2440587.5
LEAPS = ['1972-07-01','1973-01-01','1974-01-01','1975-01-01',
         '1976-01-01','1977-01-01','1978-01-01','1979-01-01','1980-01-01',
         '1981-07-01','1982-07-01','1983-07-01','1985-07-01','1988-01-01',
         '1990-01-01','1991-01-01','1992-07-01','1993-07-01','1994-07-01',
         '1996-01-01','1997-07-01','1999-01-01','2006-01-01','2009-01-01',
         '2012-07-01','2015-07-01','2017-01-01']
LEAP_JDS = [J1970 + datetime.fromisoformat(d).replace(tzinfo=timezone.utc).timestamp()/86400 for d in LEAPS]
ORDER = ['sun','earth','moon','northNode','southNode','mercury','venus','mars','jupiter','saturn','uranus','neptune','pluto']
BODIES = dict(sun=0,moon=1,northNode=11,mercury=2,venus=3,mars=4,jupiter=5,saturn=6,uranus=7,neptune=8,pluto=9)
TARGETS = ['G2005-jul20','G2015-tight','G2015-feb','G2025-tight','G1985-tight']
NINE = ['G1995-feb','G1995-jun','G2005-jul20','G2015-tight','G2015-feb',
        'G2025-tight','G2025-mar','G1985-tight','G2005-jul11']

def utc_jd(s):
    return J1970 + datetime.fromisoformat(s.replace('Z','+00:00')).timestamp()/86400

def tt_offset(j):
    return 32.184 + 10 + sum(j >= t for t in LEAP_JDS)

def tt_to_utc(j):
    u = j - tt_offset(j)/86400
    return datetime.fromtimestamp((u-J1970)*86400, timezone.utc).isoformat().replace('+00:00','Z')

def signed(a,b):
    return (a-b+180)%360-180

class Native:
    def __init__(self, lib, ephe, flags, jpl=None):
        self.s=C.CDLL(str(lib)); self.flags=flags; self.returns=set()
        signatures = {
            'swe_version':([C.c_char_p], C.c_char_p),
            'swe_set_ephe_path':([C.c_char_p],None),
            'swe_set_jpl_file':([C.c_char_p],None),
            'swe_calc':([C.c_double,C.c_int,C.c_int,C.POINTER(C.c_double),C.c_char_p],C.c_int),
            'swe_calc_ut':([C.c_double,C.c_int,C.c_int,C.POINTER(C.c_double),C.c_char_p],C.c_int),
            'swe_deltat':([C.c_double],C.c_double),
            'swe_get_tid_acc':([],C.c_double),
            'swe_utc_to_jd':([C.c_int,C.c_int,C.c_int,C.c_int,C.c_int,C.c_double,C.c_int,C.POINTER(C.c_double),C.c_char_p],C.c_int),
        }
        for name,(args,restype) in signatures.items():
            if hasattr(self.s,name):
                f=getattr(self.s,name); f.argtypes=args; f.restype=restype
        self.version=self.s.swe_version(C.create_string_buffer(256)).decode()
        self.s.swe_set_ephe_path(str(ephe).encode())
        if jpl:self.s.swe_set_jpl_file(jpl.encode())
        self.calc(2451545.0,0)  # Resolve data source before delta-T-dependent calls.

    def calc(self,t,body,flags=None):
        f=self.flags if flags is None else flags
        x=(C.c_double*6)(); err=C.create_string_buffer(1024)
        r=self.s.swe_calc(t,body,f,x,err)
        if r != f or err.value:raise RuntimeError((t,body,f,r,err.value.decode()))
        self.returns.add(r)
        return list(x)

    def ut1(self,t):
        u=t
        for _ in range(5):u=t-self.s.swe_deltat(u)
        return u

    def archived_time(self,s):
        d=datetime.fromisoformat(s.replace('Z','+00:00'))
        x=(C.c_double*2)();err=C.create_string_buffer(1024)
        r=self.s.swe_utc_to_jd(d.year,d.month,d.day,d.hour,d.minute,d.second,1,x,err)
        if r or err.value:raise RuntimeError(err.value.decode())
        return list(x)

    def epoch(self,t,expected):
        sun=self.calc(t,0); entries={}
        for name in ORDER:
            if name=='earth':x=list(sun);x[0]=(x[0]+180)%360
            elif name=='southNode':x=self.calc(t,11);x[0]=(x[0]+180)%360
            elif name=='sun':x=sun
            else:x=self.calc(t,BODIES[name])
            entries[name]={'longitude':x[0],'gateLine':gate_line(x[0]),'speedDegreesPerDay':x[3]}
        u=self.ut1(t)
        b=boundary(sun[0],sun[3],expected)
        # Signed residual to the nearest fixed line boundary, not an offset.
        x=(sun[0]-3.875)%360
        near=(3.875+round(x/0.9375)*0.9375)%360
        dist=signed(sun[0],near)
        return {'ttJd':t,'ut1JdModel':u,'deltaTSeconds':(t-u)*86400,
                'sunBoundary':b,'nearestBoundaryLongitude':near,
                'signedMinusNearestBoundaryDegrees':dist,
                'signedMinusNearestBoundaryArcsec':dist*3600,
                'signedMinusNearestBoundaryMas':dist*3600000,
                'activations':entries}

    def design(self,t):
        target=(self.calc(t,0)[0]-88)%360
        lo=t-110; hi=t-70
        for _ in range(64):
            m=(lo+hi)/2
            if m in (lo,hi):break
            if signed(self.calc(m,0)[0],target)>=0:hi=m
            else:lo=m
        return (lo+hi)/2

def main():
    p=argparse.ArgumentParser()
    p.add_argument('--library',type=Path,required=True)
    p.add_argument('--ephe',type=Path,required=True)
    p.add_argument('--stack',required=True)
    p.add_argument('--flags',type=int,default=258)
    p.add_argument('--jpl')
    p.add_argument('--time-mode',choices=['tt','archived-utc','utc-as-ut1'],default='tt')
    p.add_argument('--output',type=Path,required=True)
    p.add_argument('--all-cases',action='store_true')
    p.add_argument('--classification',choices=['HISTORICAL STACK','MODERN REFERENCE','ARTIFICIAL EXPERIMENT'],required=True)
    p.add_argument('--expected-de',type=int,required=True)
    a=p.parse_args(); c=Native(a.library,a.ephe,a.flags,a.jpl)
    source_cases=json.loads((AUDIT/'golden-cases.json').read_text())['cases']
    cases=source_cases if a.all_cases else [next(r for r in source_cases if r['id']==i) for i in NINE]
    rows=[]
    for case in cases:
        uj=utc_jd(case['birthUtc']);exact_tt=uj+tt_offset(uj)/86400
        archived=c.archived_time(case['birthUtc']) if hasattr(c.s,'swe_utc_to_jd') else None
        if a.time_mode=='tt':t=exact_tt
        elif a.time_mode=='utc-as-ut1':t=uj+c.s.swe_deltat(uj)
        else:t=archived[0]
        exp=case['expected']['activations']
        per=c.epoch(t,exp['personality']['sun']);dt=c.design(t);des=c.epoch(dt,exp['design']['sun'])
        native_ut_check=None
        if a.time_mode=='utc-as-ut1':
            xx=(C.c_double*6)();err=C.create_string_buffer(1024)
            ret=c.s.swe_calc_ut(uj,0,a.flags,xx,err)
            assert ret==a.flags and not err.value
            native_ut_check=signed(xx[0],per['activations']['sun']['longitude'])
            assert abs(native_ut_check)<1e-10
        mismatches=[]
        for side,e in [('personality',per),('design',des)]:
            for n in ORDER:
                if e['activations'][n]['gateLine']!=exp[side][n]:
                    mismatches.append({'side':side,'body':n,'actual':e['activations'][n]['gateLine'],'official':exp[side][n]})
        rows.append({'id':case['id'],'birthUtc':case['birthUtc'],'utcJd':uj,
                     'ttMinusUtcSeconds':tt_offset(uj),'archivedUtcResult':archived,
                     'archivedTtMinusCorrectTtSeconds':(archived[0]-exact_tt)*86400 if archived else None,
                     'directCalcUtSunDifferenceDegrees':native_ut_check,
                     'effectiveTtMinusCorrectTtSeconds':(t-exact_tt)*86400,
                     'personality':per,'design':des,'designUtcFromTt':tt_to_utc(dt),
                     'solarArcDegrees':(per['activations']['sun']['longitude']-des['activations']['sun']['longitude'])%360,
                     'profile':per['activations']['sun']['gateLine'].split('.')[1]+'/'+des['activations']['sun']['gateLine'].split('.')[1],
                     'all26Mismatches':mismatches})
    indexed={r['id']:r for r in rows}
    runtime_de={}
    for key in ['runtime','planet_file','moon_file']:
        f=getattr(c.s,'audit_'+key+'_de'); f.restype=C.c_int;runtime_de[key]=f()
    if a.jpl:assert runtime_de['runtime']==a.expected_de
    else:assert runtime_de['planet_file']==runtime_de['moon_file']==a.expected_de
    out={'stack':a.stack,'classification':a.classification,'swissVersion':c.version,
         'runtimeDeNumbers':runtime_de,'requestedFlags':a.flags,'returnedFlags':sorted(c.returns),
         'timeMode':a.time_mode,'tidalAcceleration':c.s.swe_get_tid_acc(),
         'ut1Meaning':'inverted library delta-T model, not measured IERS UT1',
         'designUtcMeaning':'TT root independently converted to civil UTC with complete leap-second table',
         'fiveSunMatches':sum(indexed[i]['personality']['activations']['sun']['gateLine']==next(x for x in cases if x['id']==i)['expected']['activations']['personality']['sun'] for i in TARGETS),
         'nineAll26Matches':sum(not indexed[i]['all26Mismatches'] for i in NINE),
         'allCasesAll26Matches':sum(not r['all26Mismatches'] for r in rows),'caseCount':len(rows),'cases':rows}
    a.output.parent.mkdir(parents=True,exist_ok=True)
    a.output.write_text(json.dumps(out,indent=2)+'\n')
    print(a.stack,c.version,out['fiveSunMatches'],out['nineAll26Matches'])
    for i in TARGETS:
        r=indexed[i]; print(i,r['personality']['activations']['sun']['gateLine'],r['personality']['activations']['sun']['longitude'],r['personality']['signedMinusNearestBoundaryMas'])

if __name__=='__main__':main()
