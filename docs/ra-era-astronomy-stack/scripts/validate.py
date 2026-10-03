#!/usr/bin/env python3
"""Validate research artifacts and optional fresh native rerun; never alter production."""
import argparse
import ast
import hashlib
import json
import math
import re
import subprocess
from pathlib import Path

DOC=Path(__file__).resolve().parents[1]
REPO=DOC.parents[1]
BASE='f5e2a80cb85adcbf18b4d7b763429178881aa5bf'
CHECKS=[]

def check(ok,label):
    if not ok:raise AssertionError(label)
    CHECKS.append(label)

def read(p):return json.loads(p.read_text())
def sha(b):return hashlib.sha256(b).hexdigest()
def git(*args):return subprocess.check_output(['git',*args],cwd=REPO)

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--recheck-results',type=Path)
    parser.add_argument('--runtime',type=Path,help='Optional local third-party files: verify acquisition hashes/sizes.')
    parser.add_argument('--output',type=Path,default=DOC/'validation.json')
    a=parser.parse_args()
    for path in ['docs/golden-reference/golden-cases.json','docs/golden-reference/root-cause-v2/scripts/frozen_mapping.py','docs/golden-reference/platform-boundaries/golden-cases.json']:
        check((REPO/path).read_bytes()==git('show',f'{BASE}:{path}'),'baseline bytes unchanged: '+path)
    golden=read(REPO/'docs/golden-reference/golden-cases.json')
    check(golden['inputsAreSynthetic'] is True,'Golden inputs explicitly synthetic')
    expected={x['id']:x for x in golden['cases']}
    check(len(expected)==45 and len({x['birthUtc']for x in expected.values()})==40,'45 records / 40 unique UTC')
    matrices={p.stem:read(p) for p in (DOC/'results').glob('*.json') if p.name!='build-manifest.json'}
    check(len(matrices)==30,'30 actual stack results, direct JPL included')
    calculated=0;activation_count=0;max_arc=0
    for name,d in sorted(matrices.items()):
        check(d['returnedFlags']==[d['requestedFlags']],name+': strict flags, no fallback')
        de=406 if '406' in name or name.startswith('experiment') else 431 if '431' in name else 441
        meta=d['runtimeDeNumbers']
        # Modern SWIEPH leaves JPL state at zero; loaded file metadata is authoritative.
        if d['requestedFlags']&3==1:check(meta['runtime']==de,name+': JPL DE number')
        else:check(meta['moon_file']==meta['planet_file']==de,name+': actual file DE numbers')
        if name.startswith('177-de431') or name.startswith('177-de441'):
            check(d['classification']=='ARTIFICIAL EXPERIMENT',name+': anachronistic data swap labeled')
        check(d['caseCount']==len(d['cases']),name+': actual sample count')
        for r in d['cases']:
            calculated+=1;activation_count+=26
            check(r['birthUtc']==expected[r['id']]['birthUtc'],name+': UTC '+r['id'])
            check(abs(r['solarArcDegrees']-88)<1e-8,name+': exact solar arc '+r['id'])
            max_arc=max(max_arc,abs(r['solarArcDegrees']-88))
            if d['timeMode']=='utc-as-ut1':check(abs(r['directCalcUtSunDifferenceDegrees'])<1e-10,name+': native UT API identity '+r['id'])
            else:check(r['directCalcUtSunDifferenceDegrees'] is None,name+': no invented UT comparison '+r['id'])
            mismatch=[]
            for side in ['personality','design']:
                epoch=r[side];acts=epoch['activations']
                check(len(acts)==13,name+': body count '+side+' '+r['id'])
                for body,value in acts.items():
                    check(math.isfinite(value['longitude']) and 0<=value['longitude']<360,name+': finite longitude '+body)
                    check(re.fullmatch(r'(?:[1-9]|[1-5][0-9]|6[0-4])\.[1-6]',value['gateLine']) is not None,name+': valid gate/line '+body)
                    if value['gateLine']!=expected[r['id']]['expected']['activations'][side][body]:
                        mismatch.append({'side':side,'body':body,'actual':value['gateLine'],'official':expected[r['id']]['expected']['activations'][side][body]})
                for one,two in [('sun','earth'),('northNode','southNode')]:
                    check(abs((acts[two]['longitude']-acts[one]['longitude'])%360-180)<1e-10,name+': HD antipode '+one)
                check(math.isfinite(epoch['ut1JdModel']) and math.isfinite(epoch['ttJd']),name+': time fields')
                b=epoch['sunBoundary']
                check(0<=b['distanceNextDegrees']<=0.9375+1e-12,name+': unchanged boundary width')
                check(abs(b['distanceNextMas']-b['distanceNextDegrees']*3600000)<1e-7,name+': boundary units')
            check(mismatch==r['all26Mismatches'],name+': independently recounted mismatch list '+r['id'])
        check(d['allCasesAll26Matches']==sum(not r['all26Mismatches']for r in d['cases']),name+': match count')
    for ver in ['176','177']:
        check(matrices[ver+'-de406-tt']['fiveSunMatches']==2,'correct UTC/TT only 2/5: '+ver)
        check(matrices[ver+'-de406-utc-as-ut1']['nineAll26Matches']==9,'historical UT convention 9/9: '+ver)
        check(matrices[ver+'-de406-extended-utc-as-ut1']['allCasesAll26Matches']==45,'historical UT convention 45/45: '+ver)
        check(matrices[ver+'-de406-archived-utc']['fiveSunMatches']==4,'frozen leap handling 4/5: '+ver)
    check(matrices['experiment-pre1976-nut1980']['fiveSunMatches']==5 and matrices['experiment-pre1976-nut1980']['nineAll26Matches']==7,'model pair is not unique solution: 5/5 but 7/9')
    analysis=read(DOC/'analysis.json')
    check(analysis['constantOffsetFeasibility']['feasible'] is False,'fixed-offset interval has empty intersection')
    check(all(x['officialLongitudeResidual'] is None for x in analysis['bestHistoricalCandidate']),'undisclosed official exact longitude not invented')
    check(len(analysis['matrix'])==30,'analysis covers all stacks')
    check(all(x['classification']==matrices[x['stack']]['classification']for x in analysis['matrix']),'analysis classifications agree')
    for p in (DOC/'scripts').glob('*.py'):ast.parse(p.read_text())
    check(True,'Python source parses without generating cache')
    source=read(DOC/'source-evidence.json')
    check(sum(x['equal']for x in source['crossCheck']['fileComparisons'])==8,'eight source files independently identical, Moshier difference preserved')
    check(all(not x['containsSeVersionMacro']for x in source['excludedTags']),'misleading historical tags excluded')
    assets=read(DOC/'acquisition-manifest.json')['assets']
    check(all(not x['redistributed'] and len(x['sha256'])==64 for x in assets),'all acquired assets hash recorded, not redistributed')
    if a.runtime:
        for x in assets:
            p=a.runtime/x['name'];check(p.stat().st_size==x['bytes'] and sha(p.read_bytes())==x['sha256'],'acquired asset integrity: '+x['name'])
        for archive,dsc in [('maitreya7.tar.bz2','maitreya7.dsc'),('libswe-177.tar.bz2','libswe177.dsc')]:
            check(sha((a.runtime/archive).read_bytes())in(a.runtime/dsc).read_text(),'DSC archive hash: '+archive)
    if a.recheck_results:
        fresh={p.stem:read(p)for p in a.recheck_results.glob('*.json')if p.name!='build-manifest.json'}
        check(fresh==matrices,'fresh full native rerun: exact JSON equality across 30 stacks')
    # Scope and payload checks inspect only this research directory.
    for p in DOC.rglob('*'):
        if not p.is_file():continue
        check(p.suffix in {'.md','.json','.py','.c'},'permitted research artifact type: '+p.name)
        text=p.read_text()
        private_path='/'+'Users/'
        check(private_path not in text,'no home directory path: '+p.name)
        check(not re.search(r'(?i)(?:authorization\s*:\s*bearer|"(?:access_token|refresh_token|session_cookie)"\s*:)',text),'no credential payload: '+p.name)
        check(p.stat().st_size<1000000,'no large third-party asset: '+p.name)
    changed=git('diff',BASE,'--name-only').decode().splitlines()
    check(all(x.startswith('docs/ra-era-astronomy-stack/')for x in changed),'tracked diff restricted to research directory')
    report={'status':'PASSED','base':BASE,'stackCount':len(matrices),'caseEvaluations':calculated,
            'activationEvaluations':activation_count,'maxSolarArcErrorDegrees':max_arc,
            'checkCount':len(CHECKS),'acquisitionHashesChecked':bool(a.runtime),
            'freshRerunExactEquality':bool(a.recheck_results),'productionChanges':False,
            'limitations':['Swiss1.70 not acquired','authenticated historical Horizons/SOFA/EOP stack not reconstructed','official precise longitude unavailable','Linux build not tested'],
            'checkGroups':['baseline identity','native flags and DE source','times and exact Design arc','all26 comparisons and counts','historical source provenance','archive integrity','fresh native rerun','scope and privacy']}
    a.output.write_text(json.dumps(report,indent=2)+'\n')
    print(json.dumps({k:v for k,v in report.items()if k!='checks'},indent=2))

if __name__=='__main__':main()
