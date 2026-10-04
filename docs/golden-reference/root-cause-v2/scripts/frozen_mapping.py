"""Diagnostic only: frozen audit mapping, never a production correction.

Gate/Line code and constants copied verbatim from tools/compare-ephemerides.py.
Numerical distances use unwrapped coordinates; no epsilon or tolerance is used.
"""
import math

GATES=[17,21,51,42,3,27,24,2,23,8,20,16,35,45,12,15,52,39,53,62,56,31,33,7,4,29,59,40,64,47,6,46,18,48,57,32,50,28,44,1,43,14,34,9,5,26,11,10,58,38,54,61,60,41,19,13,49,30,55,37,63,22,36,25]
O=3.875; GW=5.625; W=0.9375

def gate_line(lon):
    x=(lon-O)%360
    return f'{GATES[int(math.floor(x/GW))]}.{int(math.floor((x%GW)/W))+1}'

def boundary(lon, speed, expected=None):
    """speed in degrees/day; equivalent seconds is a local linear estimate."""
    x=(lon-O)%360
    gi=int(math.floor(x/GW))
    line=int(math.floor((x%GW)/W))+1
    index=6*gi+line-1
    start=O+index*W
    nxt=start+W
    longitude_unwrapped=O+x
    delta=nxt-longitude_unwrapped
    result={
        'gate':GATES[gi], 'line':line, 'gateLine':gate_line(lon),
        'globalLineIndex':index,
        'lineStartLongitude':start%360,
        'nextLineBoundaryLongitude':nxt%360,
        'nextLineBoundaryLongitudeUnwrapped':nxt,
        'distanceNextDegrees':delta,
        'distanceNextArcsec':delta*3600,
        'distanceNextMas':delta*3600000,
        'equivalentSeconds':delta/speed*86400 if speed>0 else None,
        'equivalentSecondsMeaning':'local linear estimate to next boundary, not root finding',
    }
    if expected is not None:
        eg,el=map(int,expected.split('.'))
        eb=(O+GATES.index(eg)*GW+(el-1)*W)%360
        signed=(lon-eb+180)%360-180
        result.update({
            'expectedGateLine':expected,
            'expectedLineStartLongitude':eb,
            'signedLongitudeMinusExpectedStartDegrees':signed,
            'signedLongitudeMinusExpectedStartMas':signed*3600000,
            'signedSecondsPastExpectedStart':signed/speed*86400 if speed>0 else None,
        })
    return result
