#!/usr/bin/env python3
"""Validate diagnostic evidence, not claim production Golden parity."""
import argparse
import hashlib
import importlib.util
import json
import math
from pathlib import Path
import re
import subprocess

HERE = Path(__file__).resolve().parents[1]
ROOT = HERE.parent
REPO = ROOT.parents[1]
spec = importlib.util.spec_from_file_location('v3_run', HERE/'scripts/run.py')
run = importlib.util.module_from_spec(spec)
spec.loader.exec_module(run)

def load(name): return json.loads((HERE/name).read_text())


def main():
    p = argparse.ArgumentParser()
    p.add_argument('--source', type=Path, required=True)
    a = p.parse_args()
    checks = 0
    def check(condition, message):
        nonlocal checks
        assert condition, message
        checks += 1
    time = load('time-scale-results.json')
    legacy = load('legacy-results.json')['groups']
    matrix = load('component-matrix.json')
    horizons = load('jpl-horizons-results.json')
    groups = [time]+legacy+matrix['groups']+horizons['groups']+[horizons['missingEopDegradationGuard']]
    parsed = run.parse_presets(a.source)
    check(parsed == load('legacy-presets.json'), 'Presets must be parsed exactly from pinned source')
    defaults = next(r for r in parsed['presets'] if r['preset']=='default')['effectiveSelectors']
    check([g['model']['request'] or 'default' for g in legacy] == run.PRESETS, 'All ten required presets')
    check(len(groups) == 23, '23 completed diagnostic groups including guard')
    check(len({g['processId'] for g in groups}) == len(groups), 'Independent subprocess per group')
    ref = {r['id']:r for r in json.loads((ROOT/'golden-cases.json').read_text())['cases']}
    raw_baseline = next(g for g in json.loads((ROOT/'root-cause-v2/swiss-c-results.json').read_text())['groups'] if g['group']=='A-JPL441')
    v2_sun = {r['id']:r['personality']['sun']['longitude'] for r in raw_baseline['cases']}
    leap_source = (a.source/'swedate.c').read_text()
    leap_table = leap_source.split('static TLS int leap_seconds',1)[1].split('};',1)[0]
    dates = [int(x) for x in re.findall(r'^\s*(\d{8})\s*,', leap_table, re.M)]
    check(dates[-1] == 20161231, 'Frozen leap-second table endpoint')
    for g in groups:
        check(g['status']=='completed' and g['swissVersion']=='2.10.03', g['label']+' version/status')
        check(g['runtimeDeNumber']==441 and not g['ephemerisFallbackAllowed'], g['label']+' raw DE441')
        check([r['id'] for r in g['cases']] == run.IDS, g['label']+' frozen case order')
        check(len(g['model']['reportedSelectors'])==8, g['label']+' getter selectors')
        for path, key in [('proper','proper'),('naive','naiveDiagnostic')]:
            check(run.counts(g['cases'],path)==g['summary'][key], g['label']+' automatic counts')
        for r in g['cases']:
            check(r['birthUtc']==ref[r['id']]['birthUtc'], r['id']+' unchanged UTC')
            check(r['jovian']==ref[r['id']]['expected']['activations']['personality']['sun'], r['id']+' frozen Jovian')
            check(not r['clocks']['manuallySuppliedDut1'], r['id']+' no external DUT1')
            ndat = int(r['birthUtc'][:10].replace('-',''))
            expected_tt_offset = 32.184+10+sum(d < ndat for d in dates)
            precision_seconds = 2*math.ulp(r['clocks']['ttJd'])*86400
            check(abs(r['clocks']['ttMinusNaiveUtcSeconds']-expected_tt_offset)<=precision_seconds, r['id']+' UTC branch (no outdated-table UT1 fallback)')
            check(r['viaTT']['jd']==r['clocks']['ttJd'] and r['proper']['jd']==r['clocks']['ut1Jd'], r['id']+' API timescale wiring')
            check(abs(r['ttVsUt1ResidualDegrees']) <= r['ttVsUt1DoubleParityBoundDegrees'], r['id']+' TT/UT1 parity')
            check(r['ttVsUt1ResidualDegrees']==r['viaTT']['longitude']-r['proper']['longitude'], r['id']+' parity residual')
            check(r['viaTT']['gateLine']==r['proper']['gateLine'], r['id']+' TT/UT1 same line')
            for path in ['naive','proper','viaTT']:
                cell = r[path]
                check(cell['actualEphemerisFlag']==cell['returnedFlags']&7==1, r['id']+' no ephemeris fallback')
                check(cell['gateLine']==run.gate_line(cell['longitude']), r['id']+' unchanged floor mapping')
                check(cell['matchesJovian']==(cell['gateLine']==r['jovian']), r['id']+' match classification')
                b = run.boundary(cell['longitude'], cell['speedDegreesPerDay'], r['jovian'])
                check(all(cell[k]==v for k,v in b.items()), r['id']+' signed boundary metrics')
        if g['label']=='time-default':
            check(all(r['naive']['longitude']==v2_sun[r['id']] and r['naiveMinusV2BaselineMas']==0 for r in g['cases']), 'TIME-A exact v2 parity')
        if g in legacy:
            preset = next(r for r in parsed['presets'] if r['preset']==(g['model']['request'] or 'default'))
            actual = [v or d for v,d in zip(g['model']['reportedSelectors'],defaults)]
            check(actual==preset['effectiveSelectors'], g['label']+' actual getters agree with source')
    check(time['summary']['proper']['mismatchMatches']==4 and time['summary']['proper']['controlsCorrect']==2, 'Current proper 4/7 +2')
    check(all(g['summary']['proper']['mismatchMatches']==4 and g['summary']['proper']['controlsCorrect']==2 for g in legacy), 'All official presets tie at 4/7 +2')
    best_hybrid = next(g for g in matrix['groups'] if g['label']=='component-precession-nutation')
    check(best_hybrid['summary']['proper']['mismatchMatches']==5 and best_hybrid['summary']['proper']['controlsCorrect']==2, 'Hybrid 5/7 +2, not a full preset')
    dt_only = next(g for g in matrix['groups'] if g['label']=='component-deltaT-only')
    check(all(r['properMinusDefaultMas']==0 and r['naiveMinusDefaultMas']==0 for r in dt_only['cases']), 'Legacy Delta-T selector no modern shift')
    for g in matrix['groups']:
        for r, base in zip(g['cases'], time['cases']):
            check(r['properMinusDefaultMas']==(r['proper']['longitude']-base['proper']['longitude'])*3600000, 'Component measured shift')
    for g in horizons['groups']:
        check(g['summary']['proper']['mismatchMatches']==0 and g['summary']['proper']['controlsCorrect']==2, 'Horizons 0/7 +2')
    full = next(g for g in horizons['groups'] if g['label']=='horizons-full')
    check(full['actualFlagsObserved']==[393473], 'Full Horizons retained JPLHOR and auto ICRS')
    check(all(r['proper']['fullHorizonsActive'] and not r['proper']['approxHorizonsActive'] and not r['proper']['warning'] for r in full['cases']), 'No full-mode degradation')
    guard = horizons['missingEopDegradationGuard']
    check(guard['actualFlagsObserved']==[524545], 'Missing EOP detected APPROX actual flags')
    # swe_calc_ut pre-normalizes flags before swe_calc and may erase serr;
    # direct TT calls preserve the warning. Actual flags guard all three paths.
    check(any('default to SEFLG_JPLHOR_APPROX' in r[path]['warning']
              for r in guard['cases'] for path in ['naive','proper','viaTT']
              if r[path]['warning']), 'Missing EOP warning captured')
    eop = load('eop-provenance.json')
    check(eop['allNineBirthDatesCovered'] and len(eop['cases'])==9, 'EOP all dates covered')
    check(eop['c04ContinuousDailyRows']==eop['c04MjdRange'][1]-eop['c04MjdRange'][0]+1, 'C04 contiguous range')
    check(all(not r['usedAsCalculationInput'] and len(r['c04BracketingDays'])==2 for r in eop['cases']), 'DUT1 evidence not an input override')
    env = load('environment.json')
    check(hashlib.sha256((ROOT/'golden-cases.json').read_bytes()).hexdigest()==env['goldenJsonSha256'], 'Golden JSON hash unchanged')
    check(hashlib.sha256((ROOT/'root-cause-v2/scripts/frozen_mapping.py').read_bytes()).hexdigest()==env['mappingSha256'], 'Frozen mapping hash unchanged')
    check(len(env['installation8787']['assets'])==8 and all(r['unchanged'] and r['sha256']==r['http8787Sha256'] for r in env['installation8787']['assets']), 'Installed+served assets unchanged')
    for r in env['swissC']['sourceFilesVerified']:
        check(hashlib.sha256((a.source/r['filename']).read_bytes()).hexdigest()==r['sha256'], 'Pinned C source '+r['filename'])
    comparison = load('comparison.json')
    check(not comparison['fullRootCauseFound'], 'No full root-cause overclaim')
    check(comparison['bestMeasuredControlledSummary']['mismatchMatches']==5, 'Best controlled group count')
    check(not (HERE/'historical-kernel-results.json').exists(), 'No fake unexecuted kernel output')
    for group in groups[:-1]:
        check(comparison['summary'][group['label']]['proper']==group['summary']['proper'], 'Comparison summary')
        for row in group['cases']:
            item = next(r for r in comparison['cases'] if r['id']==row['id'])
            for path in ['naive','proper']:
                check(all(row[path][k]==v for k,v in item['groups'][group['label']][path].items()), 'Comparison numerical cell')
    diff = subprocess.check_output(['git','-c','core.fsmonitor=false','diff','--name-only',env['startingAuditHead'],'--','src','engine-core','engine-wasm','public'],cwd=REPO,text=True)
    check(not diff, 'No production changes')
    for path in HERE.rglob('*'):
        if path.is_file(): check(path.suffix not in ['.eph','.se1','.dylib','.so','.dll','.wasm','.pyc'], 'No binary in public audit')
    result = {'status':'passed', 'assertionChecks':checks, 'diagnosticGroups':len(groups),
              'caseRows':len(groups)*9, 'sunApiCalculations':len(groups)*9*3,
              'ttUt1LongitudeResidualMaxMas':max(abs(r['ttVsUt1ResidualMas']) for g in groups for r in g['cases']),
              'failedChecks':0, 'productionGoldenMismatchesFixed':False,
              'fullJovianParityFound':False, 'npmAndE2E':'not run; no application changes',
              'scope':'Harness/source/evidence integrity; not a production accuracy acceptance pass'}
    (HERE/'validation.json').write_text(json.dumps(result,indent=2)+'\n')
    print(json.dumps(result))


if __name__ == '__main__': main()
