#!/usr/bin/env python3
"""Reproduce a seconds-level regression fixture from unmodified Swiss C.
The 318.875 degree gate boundary is unchanged; no mapping code is patched.
"""
import argparse, ctypes as C, json
from pathlib import Path
from datetime import datetime,timezone
ROOT=Path(__file__).resolve().parents[3]
p=argparse.ArgumentParser();p.add_argument('--library',required=True);a=p.parse_args()
s=C.CDLL(a.library);s.swe_set_ephe_path.argtypes=[C.c_char_p];s.swe_set_ephe_path(str(ROOT/'public/engine/ephe').encode())
s.swe_calc.argtypes=[C.c_double,C.c_int,C.c_int,C.POINTER(C.c_double),C.c_char_p]
s.swe_utc_to_jd.argtypes=[C.c_int]*5+[C.c_double,C.c_int,C.POINTER(C.c_double),C.c_char_p]
def position(sec):
 d=datetime.fromtimestamp(sec,timezone.utc);pair=(C.c_double*2)();err=C.create_string_buffer(1024)
 assert s.swe_utc_to_jd(d.year,d.month,d.day,d.hour,d.minute,d.second+d.microsecond/1e6,1,pair,err)==0
 x=(C.c_double*6)();assert s.swe_calc(pair[0],1,258,x,err)==258
 return x[0]
lo=datetime.fromisoformat('2026-09-23T06:10:20+00:00').timestamp();hi=lo+40
for _ in range(40):
 mid=(lo+hi)/2
 if position(mid)<318.875:lo=mid
 else:hi=mid
before=int(hi);after=before+1
iso=lambda t:datetime.fromtimestamp(t,timezone.utc).isoformat().replace('+00:00','Z')
j={'oracle':'unmodified Swiss C 2.10.03, locked production SE1, apparent geocentric, UTC->TT','boundaryLongitude':318.875,'transitionUtc':iso(hi),'before':{'utc':iso(before),'longitude':position(before),'gate':13,'line':6},'after':{'utc':iso(after),'longitude':position(after),'gate':49,'line':1}}
(ROOT/'docs/moon-apparent-parity/boundary.json').write_text(json.dumps(j,indent=2)+'\n');print(json.dumps(j))
