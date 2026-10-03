"""Research extension of immutable six models; no fitted offsets or epsilons."""
import sys
sys.dont_write_bytecode=True
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[2]/'jovian-discriminator-suite/scripts'))
from models import *

def solar_root(native,target,guess):
    t=guess
    for _ in range(12):
        v=native.calc(t,0); nxt=t-signed(v[0],target)/v[3]
        if nxt==t:break
        t=nxt
    return t

def design_root(model,birth_tt):
    target=(model.native.calc(birth_tt,0)[0]-88)%360
    t=solar_root(model.native,target,birth_tt-90)
    assert 70<birth_tt-t<110
    return t

def numeric_clock(j):
    return datetime.fromtimestamp((j-2440587.5)*86400,timezone.utc).replace(tzinfo=None).isoformat(timespec='microseconds')

def chart(model,uj):
    # Immutable comparison path: Model.chart calls Native.design bisection (64).
    original=model.chart(uj)
    t=original['ttJd'];d=original['designTtJd'];p=original['personality'];des=original['design']
    residual=signed(p['sun']['longitude'],des['sun']['longitude']+88)
    du=model.native.ut1(d)
    return dict(original, birthUtc=iso(uj),utcJd=uj,birthTtJd=t,
      birthModelUt1Jd=original['modelUt1Jd'],birthUtcFromTt=tt_to_utc(t),
      designModelUt1Jd=du,designModelUt1NumericClock=numeric_clock(du),
      designModelUt1ClockMeaning='TT root inverted with library delta-T; numerical UTC-as-UT1 inverse input clock, not civil UTC or measured IERS UT1',
      designCivilUtcFromTt=tt_to_utc(d),
      designCivilUtcClockMeaning='TT root converted with complete civil UTC leap-second table; future leap seconds are unknown',
      designRootAlgorithm='immutable Model.chart -> Native.design: original 64-iteration bisection',
      **{'88degreeArcResidualDegrees':residual,'88degreeArcResidualArcsec':residual*3600})
