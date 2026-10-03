#!/usr/bin/env python3
"""Capture provenance and EOP coverage without changing installed files."""
import argparse
import hashlib
import json
import math
import platform
from pathlib import Path
import subprocess
import sys
import urllib.request
from datetime import datetime, timezone

HERE = Path(__file__).resolve().parents[1]
ROOT = HERE.parent
REPO = ROOT.parents[1]
BASELINE = '35034e7531754dfa0f45eb4e1ac0fc77c1027272'
SOURCE_COMMIT = '175e1fcb3108bcd5c0d146c803f51dcf23508012'


def sha(path):
    h = hashlib.sha256()
    with path.open('rb') as f:
        for block in iter(lambda: f.read(8*1024*1024), b''): h.update(block)
    return h.hexdigest()


def load(path): return json.loads(path.read_text())
def save(name, data):
    (HERE/name).write_text(json.dumps(data, ensure_ascii=False, indent=2)+'\n')


def main():
    p = argparse.ArgumentParser()
    p.add_argument('--source', type=Path, required=True)
    p.add_argument('--library', type=Path, required=True)
    p.add_argument('--raw441', type=Path, required=True)
    p.add_argument('--c04', type=Path, required=True)
    p.add_argument('--finals', type=Path, required=True)
    p.add_argument('--installation-dist', type=Path, required=True)
    a = p.parse_args()
    old = load(ROOT/'root-cause-v2/environment-c.json')
    source_checks = []
    for row in old['sourceFiles']:
        actual = sha(a.source/row['filename'])
        assert actual == row['sha256'], row['filename']
        source_checks.append({**row, 'verifiedNowSha256': actual})
    raw = next(r for r in load(ROOT/'root-cause-v2/asset-hashes-c.json')['assets'] if r['id'] == 'de441.eph')
    assert a.raw441.stat().st_size == raw['bytes'] and sha(a.raw441) == raw['sha256']
    build_files = ['sweph.c','swephlib.c','swejpl.c','swemplan.c','swemmoon.c','swecl.c','swehel.c','swehouse.c','swedate.c']
    engine = {'version': '2.10.03', 'officialRepository': old['officialRepository'],
              'sourceCommit': SOURCE_COMMIT, 'sourcePatched': False,
              'sourceFilesVerified': source_checks, 'librarySha256': sha(a.library),
              'buildCommand': ['cc','-dynamiclib','-O2','-fPIC','-o','<outside-repo>/libswisseph21003.dylib']+build_files+['-lm'],
              'compiler': subprocess.check_output(['cc','--version'], text=True),
              'coverageInstrumentation': False}
    assets = []
    for row in load(ROOT/'final-baseline-verification.json')['installedAssetsUnchanged']:
        path = a.installation_dist/row['path']
        actual = sha(path)
        with urllib.request.urlopen('http://127.0.0.1:8787/'+row['path'], timeout=15) as r:
            http = hashlib.sha256(r.read()).hexdigest()
        assert actual == http == row['sha256'], row['path']
        assets.append({'path': row['path'], 'bytes': path.stat().st_size,
                       'sha256': actual, 'http8787Sha256': http, 'unchanged': True})
    production_diff = subprocess.check_output(['git','-c','core.fsmonitor=false','diff','--name-only',BASELINE,'--','src','engine-core','engine-wasm','public'], cwd=REPO, text=True).splitlines()
    assert not production_diff
    c04_rows = {}
    for line in a.c04.read_text().splitlines():
        v = line.split()
        if len(v) == 16 and v[0].isdigit() and len(v[0]) == 4:
            c04_rows[int(v[3])] = {'raw': line, 'date': '-'.join([v[0],v[1].zfill(2),v[2].zfill(2)]),
                                  'ut1MinusUtcSeconds': float(v[6]), 'dpsiArcseconds': float(v[8]), 'depsArcseconds': float(v[9])}
    mjds = sorted(c04_rows)
    assert all(b-a == 1 for a,b in zip(mjds,mjds[1:]))
    finals_rows = {}
    for line in a.finals.read_text().splitlines():
        try: mjd = int(float(line[7:15])); float(line[58:68])
        except ValueError: continue
        finals_rows[mjd] = line
    rows = []
    for case in load(HERE/'time-scale-results.json')['cases']:
        utc_mjd = case['clocks']['naiveUtcJd']-2400000.5
        day = math.floor(utc_mjd)
        assert day in c04_rows and day+1 in c04_rows and day in finals_rows
        first, second = c04_rows[day], c04_rows[day+1]
        interpolation = first['ut1MinusUtcSeconds'] + (utc_mjd-day)*(second['ut1MinusUtcSeconds']-first['ut1MinusUtcSeconds'])
        rows.append({'id':case['id'], 'birthUtc':case['birthUtc'], 'mjdUtc':utc_mjd,
                     'c04BracketingDays': [first,second], 'usnoFinalsBirthDayRaw': finals_rows[day],
                     'c04LinearInterpolatedDut1Seconds':interpolation,
                     'swissInferredDut1Seconds':case['clocks']['ut1MinusNaiveUtcSeconds'],
                     'swissMinusC04Dut1Seconds':case['clocks']['ut1MinusNaiveUtcSeconds']-interpolation,
                     'usedAsCalculationInput':False})
    eop = {'status':'verified', 'c04Series':'EOP IERS 14 C04 IAU1980, dPsi/dEps in arcseconds',
           'c04FilenameInEphe':'eop_1962_today.txt', 'finalsFilenameInEphe':'eop_finals.txt',
           'c04SourceUrl':'https://data.iers.org/products/eop/long-term/c04_14/iau1980/eopc04_14.62-now',
           'c04Bytes':a.c04.stat().st_size, 'c04Sha256':sha(a.c04),
           'c04Header':a.c04.read_text().splitlines()[:14], 'c04ContinuousDailyRows':len(mjds),
           'c04FirstDate':c04_rows[mjds[0]]['date'], 'c04LastDate':c04_rows[mjds[-1]]['date'],
           'c04MjdRange':[mjds[0],mjds[-1]],
           'finalsSourceUrl':'https://maia.usno.navy.mil/ser7/finals.all',
           'finalsBytes':a.finals.stat().st_size, 'finalsSha256':sha(a.finals),
           'finalsDut1DataMjdRange':[min(finals_rows),max(finals_rows)],
           'allNineBirthDatesCovered':True, 'cases':rows,
           'inputPolicy':'Independent DUT1 comparison only. swe_utc_to_jd remains the sole TIME-B conversion; no external DUT1 override.',
           'fullHorizonsPolicy':'Actual flags checked. This is Swiss compatibility mode with these EOP snapshots, not live Horizons or Jovian backend evidence.'}
    save('eop-provenance.json', eop)
    save('environment.json', {'schemaVersion':1, 'diagnosticOnly':True, 'startingAuditHead':BASELINE,
         'auditBranch':'audit/natal-golden-reference', 'capturedUtc':datetime.now(timezone.utc).isoformat(),
         'os':platform.platform(), 'architecture':platform.machine(), 'pythonVersion':platform.python_version(),
         'swissC':engine, 'raw441':raw, 'goldenJsonSha256':sha(ROOT/'golden-cases.json'),
         'mappingSource':'../root-cause-v2/scripts/frozen_mapping.py', 'mappingSha256':sha(ROOT/'root-cause-v2/scripts/frozen_mapping.py'),
         'installation8787':{'assets':assets, 'readOnly':True, 'unchanged':True},
         'productionDiffFromBaseline':production_diff, 'productionModified':False,
         'scope':'Personality Sun only. No new Design/Profile/Cross computations are inferred.',
         'excludedBinaries':'Kernels, EOP full downloads and compiled C libraries remain outside Git.'})
    print('Verified source files, raw DE441, eight installed/HTTP assets and nine EOP date ranges.')


if __name__ == '__main__': main()
