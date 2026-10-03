#!/usr/bin/env python3
"""Summarize measured stacks without fitting or adopting corrections."""
import argparse
import json
import sys
from pathlib import Path

HERE=Path(__file__).resolve().parent
DOC=HERE.parent
sys.path.insert(0,str(DOC.parent/'golden-reference/root-cause-v2/scripts'))
from frozen_mapping import GATES, O, GW, W
IDS=['G2005-jul20','G2015-tight','G2015-feb','G2025-tight','G1985-tight']

def angle(x,y):return (x-y+180)%360-180
def sun(r):return r['personality']['activations']['sun']['longitude']
def index(stack):return {r['id']:r for r in stack['cases']}

def main():
    p=argparse.ArgumentParser();p.add_argument('--results',type=Path,default=DOC/'results')
    p.add_argument('--output',type=Path,default=DOC/'analysis.json');a=p.parse_args()
    stacks={f.stem:json.loads(f.read_text()) for f in a.results.glob('*.json') if f.name!='build-manifest.json'}
    raw={k:index(v) for k,v in stacks.items()}
    modern=raw['210-de441-tt'];old=raw['177-de406-tt']
    golden=json.loads((DOC.parent/'golden-reference/golden-cases.json').read_text())
    expected={r['id']:r['expected'] for r in golden['cases']}
    matrix=[]
    for k,v in stacks.items():
        matrix.append({'stack':k,'classification':v['classification'],'timeMode':v['timeMode'],
                       'caseCount':v['caseCount'],'fiveSunMatches':v['fiveSunMatches'],
                       'nineAll26Matches':v['nineAll26Matches'],'allCasesAll26Matches':v['allCasesAll26Matches'],
                       'ABCDE':[raw[k][i]['personality']['activations']['sun']['gateLine'] for i in IDS],
                       'sunResidualVersusModernMas':[angle(sun(raw[k][i]),sun(modern[i]))*3600000 for i in IDS]})
    effects={}
    pairs={
        'DE406_minus_DE441_same_modern_code_TT':('210-de406-tt','210-de441-tt'),
        'DE431_minus_DE441_same_modern_code_TT':('210-de431-tt','210-de441-tt'),
        'Historical_code_minus_modern_same_DE406_TT':('177-de406-tt','210-de406-tt'),
        'Direct_JPL406_minus_compressed406_same_historical_code_TT':('177-jpl406-tt','177-de406-tt'),
        'UTC_numeric_as_UT1_minus_correct_TT_177':('177-de406-utc-as-ut1','177-de406-tt'),
        'IAU1976_minus_P03_ARTIFICIAL':('experiment-pre1976','177-de406-tt'),
        'IAU1980_minus_IAU2000B_ARTIFICIAL':('experiment-nut1980','177-de406-tt'),
        'IAU2000A_minus_IAU2000B_ARTIFICIAL':('experiment-nut2000a','177-de406-tt'),
        'Bias_omitted_minus_enabled_ARTIFICIAL':('experiment-no-bias','177-de406-tt'),
    }
    for name,(left,right) in pairs.items():
        if left not in raw:continue
        effects[name]=[{'id':i,'differenceDegrees':angle(sun(raw[left][i]),sun(raw[right][i])),
                       'differenceArcsec':angle(sun(raw[left][i]),sun(raw[right][i]))*3600,
                       'differenceMas':angle(sun(raw[left][i]),sun(raw[right][i]))*3600000} for i in IDS]
    detailed=[]
    for i in IDS:
        r=raw['177-de406-utc-as-ut1'][i];per=r['personality'];des=r['design']
        detailed.append({'case':'ABCDE'[IDS.index(i)],'id':i,'birthUtc':r['birthUtc'],
                         'ttJd':per['ttJd'],'ut1JdModel':per['ut1JdModel'],'deltaTSeconds':per['deltaTSeconds'],
                         'correctTtOffsetSeconds':r['ttMinusUtcSeconds'],
                         'effectiveTtMinusCorrectTtSeconds':r['effectiveTtMinusCorrectTtSeconds'],
                         'personalitySun':per['activations']['sun'],'personalityEarth':per['activations']['earth'],
                         'designSun':des['activations']['sun'],'designEarth':des['activations']['earth'],
                         'profile':r['profile'],'designUtcFromTt':r['designUtcFromTt'],
                         'sunMinusNearestBoundaryMas':per['signedMinusNearestBoundaryMas'],
                         'sunResidualVersusModernMas':angle(sun(r),sun(modern[i]))*3600000,
                         'officialLongitudeResidual':None,
                         'officialLongitudeResidualReason':'Jovian/myBodyGraph exact longitude is not disclosed in saved evidence; Gate.Line is an interval.'})
    # Feasibility of one additive longitude shift, diagnostics only. No fit/use.
    bounds=[]
    for i in IDS:
        g,l=map(int,expected[i]['activations']['personality']['sun'].split('.'))
        start=(O+GATES.index(g)*GW+(l-1)*W)%360
        lower=angle(start,sun(modern[i]));upper=lower+W
        bounds.append({'id':i,'lowerInclusiveMas':lower*3600000,'upperExclusiveMas':upper*3600000})
    lo=max(b['lowerInclusiveMas']for b in bounds);hi=min(b['upperExclusiveMas']for b in bounds)
    out={'units':'mas = milliarcseconds; 1000 mas = 1 arcsec',
         'matrix':sorted(matrix,key=lambda r:r['stack']),'measuredEffects':effects,'bestHistoricalCandidate':detailed,
         'constantOffsetFeasibility':{'reference':'2.10.03 + DE441 + correct TT','bounds':bounds,
                                      'lowerInclusiveMas':lo,'upperExclusiveMas':hi,'feasible':lo<hi,
                                      'purpose':'Analytical rejection only; no offset introduced.'}}
    a.output.write_text(json.dumps(out,indent=2)+'\n')
    print('matrix',len(matrix),'constant-offset-feasible',lo<hi)

if __name__=='__main__':main()
