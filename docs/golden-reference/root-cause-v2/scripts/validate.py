#!/usr/bin/env python3
"""Verify audit integrity/provenance. No engine or application state is mutated."""
import ast, hashlib, importlib.util, json, subprocess
from pathlib import Path
from frozen_mapping import GATES,O,GW,W,gate_line,boundary

HERE=Path(__file__).resolve().parents[1]
GOLDEN=HERE.parent/'golden-cases.json'
IDS=['G1995-feb','G1995-jun','G2005-jul20','G2015-tight','G2015-feb','G2025-tight','G2025-mar','G1985-tight','G2005-jul11']
FROZEN_SHA='431dbbc6af5d14cade31538177a6677f692ba5001fda3d97d811cb3219b1d8bb'

def load(name):return json.loads((HERE/name).read_text())
def sha(path):return hashlib.sha256(path.read_bytes()).hexdigest()

def main():
    assert sha(GOLDEN)==FROZEN_SHA,'Golden input/reference evidence changed'
    golden={r['id']:r for r in json.loads(GOLDEN.read_text())['cases']}
    old=ast.parse((HERE.parent/'tools/compare-ephemerides.py').read_text())
    new=ast.parse((HERE/'scripts/frozen_mapping.py').read_text())
    def function(tree):return next(n for n in tree.body if isinstance(n,ast.FunctionDef) and n.name=='gate_line')
    assert ast.dump(function(old))==ast.dump(function(new))
    def constant(tree,name):
        return next(ast.literal_eval(n.value) for n in tree.body if isinstance(n,ast.Assign) and any(isinstance(t,ast.Name) and t.id==name for t in n.targets))
    for name,value in [('GATES',GATES),('O',O),('GW',GW),('W',W)]:assert constant(old,name)==value
    for i in range(384):
        lon=(O+i*W)%360;b=boundary(lon,1)
        assert b['gateLine']==f'{GATES[i//6]}.{i%6+1}'
        assert b['distanceNextDegrees']==W
    assert boundary(359.99,1)['nextLineBoundaryLongitude']==0.125
    assert boundary(0.125,1)['gateLine']=='25.3'
    c=load('swiss-c-results.json');cg=c['groups']
    if isinstance(cg,list):cg={g['group']:g for g in cg}
    counts={'frozenInputs':9,'exactMappingBoundaries':384,'cGroups':0,'cCases':0,'cActivations':0,'sharpGroups':0,'sharpCases':0,'sharpActivations':0,'biasGuardAssertions':0}
    for key,g in cg.items():
        if g.get('status')!='completed':continue
        counts['cGroups']+=1
        assert [r['id'] for r in g['cases']]==IDS
        flags=258 if key=='A-SWISS' else 257
        assert g['flagsRequested']==flags and g['flagsReturnedObserved']==[flags]
        assert g['fallbackAllowed'] is False and g['swissVersion']=='2.10.03'
        if key!='A-SWISS':assert g['rawJplRuntimeDeNumber']==(441 if key=='A-JPL441' else 431)
        for r in g['cases']:
            counts['cCases']+=1;assert r['birthUtc']==golden[r['id']]['birthUtc']
            for side in ['personality','design']:
                epoch=r[side];sun=epoch['sun']
                expected=golden[r['id']]['expected']['activations'][side]['sun']
                b=boundary(sun['longitude'],sun['longitudeSpeedDegreesPerDay'],expected)
                for k,v in b.items():assert sun[k]==v,(key,r['id'],side,k)
                for n,a in epoch['activations'].items():
                    assert a['gateLine']==gate_line(a['longitude'])
                    assert a['returnedFlags']==flags
                    counts['cActivations']+=1
            assert abs(r['solarArcDegrees']-88)<1e-8,'Design88 diagnostic root mismatch'
    sharp={**load('sharp-jpl-results.json')['groups'],**load('sharp-bias-results.json')['groups']}
    for key,rows in sharp.items():
        counts['sharpGroups']+=1;assert [r['id'] for r in rows]==IDS
        for r in rows:
            counts['sharpCases']+=1;assert r['birthUtc']==golden[r['id']]['birthUtc']
            source='Jpl' if 'JPL' in key else 'SwissEph';flags=257 if source=='Jpl' else 258
            assert r['runtimeSource']==source and r['runtimePreferredSource']==source
            assert r['sourceHeaderDeNumber']==441 and r['moshierEnabled'] is False
            assert r['resolvedFlags']==r['requestedFlags']==flags
            assert r['adapterEqualsActualDirectSource']
            acts={n:gate_line(a['longitude']) for n,a in r['personalityRawPositions'].items()}
            assert len(acts)==13 and acts==r['nativePersonalityActivationOracle']==r['personalityActivations']
            assert r['sunBoundary']==boundary(r['sunLongitude'],r['sunLongitudeSpeedDegreesPerDay'],golden[r['id']]['expected']['activations']['personality']['sun'])
            counts['sharpActivations']+=13
            if r['bias']:
                for k in ['de402SkipIdenticalToUnpatched','icrsSkipIdentical','moshierUnaffected','nonIcrsDe441BiasApplied']:
                    assert r['biasGuardTests'][k] is True;counts['biasGuardAssertions']+=1
    env=load('environment-sharp.json')
    assert sum(r['longitudeSpeedPairsExactlyEqual'] for r in env['sourceParity'])==234
    assert env['fixedVersions']=={'Base':'0.14.0','SwissEph':'0.5.1','HumanDesign':'1.2.0'}
    comp=load('comparison.json')
    assert comp['caseIds']==IDS
    pair=comp['numericalPairs']['SharpRawBiasMinusCRaw']
    assert len(pair['cases'])==9 and pair['maxAbsLongitudeDifferenceMas']<1e-6
    for r in pair['cases']:assert r['jdUtDifferenceDays']==r['deltaTDifferenceSeconds']==r['jdEtDifferenceDays']==0
    mmi=load('mmi-results.json')
    assert mmi['status']=='blocked' and mmi['chartResultsObserved'] is False
    assert len(mmi['cases'])==9 and all(r['personalitySun'] is None for r in mmi['cases'])
    for f in load('asset-hashes.json')['scripts']:
        assert sha(HERE/f['path'])==f['sha256'],f['path']
    verification=load('installation-verification.json')
    assert len(verification['assets'])==8 and all(r['unchanged'] for r in verification['assets'])
    assert verification['productionDiffFromStartingHead']==[]
    result={'status':'passed','checks':counts,'nugetSourceRebuildExactPairs':234,'rawJplBiasSunClockParityCases':9,'mmi':'blocked and explicitly null, not passed chart tests','production':'unchanged','installation':'8 assets unchanged','applicationTests':'not run; docs/diagnostic-only changes, no application source or build modified'}
    (HERE/'validation.json').write_text(json.dumps(result,indent=2)+'\n')
    print(json.dumps(result,indent=2))

if __name__=='__main__':main()
