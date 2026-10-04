#!/usr/bin/env python3
"""Derive comparison tables from measured outputs; never fit a constant."""
import json
from pathlib import Path

HERE = Path(__file__).resolve().parents[1]
def load(name): return json.loads((HERE/name).read_text())
def save(name, data): (HERE/name).write_text(json.dumps(data, ensure_ascii=False, indent=2)+'\n')


def main():
    time = load('time-scale-results.json')
    legacy = load('legacy-results.json')['groups']
    components = load('component-matrix.json')['groups']
    horizons = load('jpl-horizons-results.json')['groups']
    base = {r['id']:r for r in time['cases']}
    for g in components:
        for r in g['cases']:
            r['properMinusDefaultMas'] = (r['proper']['longitude']-base[r['id']]['proper']['longitude'])*3600000
            r['naiveMinusDefaultMas'] = (r['naive']['longitude']-base[r['id']]['naive']['longitude'])*3600000
    matrix = load('component-matrix.json')
    matrix['groups'] = components
    save('component-matrix.json', matrix)
    groups = [time]+legacy+components+horizons
    transitions = []
    for left, right in zip(legacy, legacy[1:9]):
        cells = []
        for l, r in zip(left['cases'], right['cases']):
            cells.append({'id':l['id'], 'properLeft':l['proper']['gateLine'], 'properRight':r['proper']['gateLine'],
                          'properShiftMas':(r['proper']['longitude']-l['proper']['longitude'])*3600000,
                          'naiveLeft':l['naive']['gateLine'], 'naiveRight':r['naive']['gateLine'],
                          'naiveShiftMas':(r['naive']['longitude']-l['naive']['longitude'])*3600000,
                          'deltaTShiftSeconds':r['clocks']['deltaTSeconds']-l['clocks']['deltaTSeconds']})
        transitions.append({'from':left['model']['request'], 'to':right['model']['request'],
                            'reportedSelectorsFrom':left['model']['reportedSelectors'],
                            'reportedSelectorsTo':right['model']['reportedSelectors'], 'cases':cells})
    results = {g['label']:{'proper':g['summary']['proper'], 'naiveDiagnostic':g['summary']['naiveDiagnostic'],
                         'requestedFlags':g['requestedFlags'], 'actualFlagsObserved':g['actualFlagsObserved']} for g in groups}
    cases = []
    for row in time['cases']:
        cells = {}
        for g in groups:
            r = next(c for c in g['cases'] if c['id']==row['id'])
            cells[g['label']] = {path:{k:r[path][k] for k in ['gateLine','longitude','longitudeDecimal17',
                                  'signedLongitudeMinusExpectedStartMas','signedSecondsPastExpectedStart',
                                  'returnedFlags','matchesJovian']} for path in ['proper','naive']}
        cases.append({'id':row['id'], 'birthUtc':row['birthUtc'], 'role':row['role'], 'jovian':row['jovian'], 'groups':cells})
    best = max(groups, key=lambda g: g['summary']['proper']['mismatchMatches'] if g['summary']['proper']['controlsCorrect']==2 else -1)
    save('comparison.json', {'schemaVersion':1, 'diagnosticOnly':True, 'scope':'Personality Sun Gate.Line, not full chart parity',
         'summary':results, 'cases':cases, 'adjacentLegacyTransitions':transitions,
         'bestMeasuredControlledGroup':best['label'], 'bestMeasuredControlledSummary':best['summary']['proper'],
         'fullRootCauseFound':any(g['summary']['proper']['validFullGoldenParity'] for g in groups),
         'historicalKernels':{'status':'not-executed', 'reason':'All named official presets tie current proper UTC model at 4/7; no superior or near-7/7 named preset. Component hybrid reaches 5/7 but is not a historical preset.'},
         'actualHistoricalSwissSource':{'status':'not-triggered', 'reason':'No official preset reaches full or near-full 7/7 + two controls. Current preset simulation does not restore old numerical code or historical delta-T tables.'},
         'rootCauseAssessment':{'established':'Prior Sharp frame-bias omission retained; UTC scale and astronomical model choices measurably change individual cases.',
                               'unresolved':'No tested public Swiss/JPL configuration reproduces the nine observed Jovian Personality Sun results simultaneously; Jovian backend remains unknown.'}})
    lines = ['# Measured Sun comparison', '', 'Proper columns use Swiss UTC→TT/UT1. All Gate/Line values use the unchanged frozen Mandala mapping.', '',
             '| Case | Jovian | Current naive | Current proper | SE1.64 proper | P+N hybrid proper | Horizons APPROX | Horizons full |',
             '|---|---|---|---|---|---|---|---|']
    columns = [('time-default','naive'),('time-default','proper'),('legacy-SE1.64','proper'),
               ('component-precession-nutation','proper'),('horizons-approx','proper'),('horizons-full','proper')]
    for row in cases:
        lines.append('| '+' | '.join([row['id'], row['jovian']]+[row['groups'][g][p]['gateLine'] for g,p in columns])+' |')
    lines += ['', '## Named legacy presets', '', '| Preset | Proper matches /7 | Proper controls /2 | Naive matches /7 | Naive controls /2 |', '|---|---:|---:|---:|---:|']
    for g in legacy:
        p, n = g['summary']['proper'],g['summary']['naiveDiagnostic']
        lines.append(f"| {g['model']['request'] or 'default'} | {p['mismatchMatches']} | {p['controlsCorrect']} | {n['mismatchMatches']} | {n['controlsCorrect']} |")
    lines += ['', '## Component substitutions toward SE1.64', '', '| Group | Proper matches /7 | Proper controls /2 | Naive matches /7 | Naive controls /2 |', '|---|---:|---:|---:|---:|']
    for g in components:
        p, n = g['summary']['proper'],g['summary']['naiveDiagnostic']
        lines.append(f"| {g['label']} | {p['mismatchMatches']} | {p['controlsCorrect']} | {n['mismatchMatches']} | {n['controlsCorrect']} |")
    lines += ['', '## Adjacent preset shifts (proper path)', '', '| Transition | Gate/Line changed cases | Max absolute shift mas |', '|---|---|---:|']
    for t in transitions:
        changed = ', '.join(c['id'] for c in t['cases'] if c['properLeft']!=c['properRight']) or 'none'
        lines.append(f"| {t['from']} → {t['to']} | {changed} | {max(abs(c['properShiftMas']) for c in t['cases']):.9f} |")
    (HERE/'comparison-table.md').write_text('\n'.join(lines)+'\n')
    print('Comparison generated; full root cause found:', any(g['summary']['proper']['validFullGoldenParity'] for g in groups))


if __name__ == '__main__': main()
