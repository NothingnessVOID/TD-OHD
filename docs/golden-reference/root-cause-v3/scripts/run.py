#!/usr/bin/env python3
"""Read-only Sun diagnostics against pinned, unmodified Swiss C 2.10.03.

Every model group is a separate process. HD mapping is imported unchanged from
v2; the floating-point parity bound below never changes a Gate/Line decision.
"""
import argparse
import ctypes as C
import hashlib
import importlib.util
import json
import math
import os
from pathlib import Path
import re
import subprocess
import sys
from datetime import datetime

HERE = Path(__file__).resolve().parents[1]
ROOT = HERE.parent
V2 = ROOT / 'root-cause-v2'
sys.path.insert(0, str(V2 / 'scripts'))
spec = importlib.util.spec_from_file_location('swiss_c_v2', V2 / 'scripts/swiss-c.py')
v2 = importlib.util.module_from_spec(spec)
spec.loader.exec_module(v2)
from frozen_mapping import gate_line, boundary

IDS = v2.CASE_IDS
PRESETS = ['SE1.00', 'SE1.64', 'SE1.70', 'SE1.72', 'SE1.77',
           'SE1.78', 'SE1.80', 'SE2.00', 'SE2.06', 'default']
BASE_FLAGS = 257
JPLHOR, APPROX, ICRS = 262144, 524288, 131072


def dump(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')


def constants(source):
    text = (source / 'swephexp.h').read_text()
    definitions = dict(re.findall(r'^\s*#\s*define\s+(SE(?:MOD|_MODEL)_\w+)\s+(\w+)', text, re.M))
    def resolve(name):
        value = definitions[name]
        return int(value) if value.isdigit() else resolve(value)
    return {name: resolve(name) for name in definitions}


def parse_presets(source):
    text = (source / 'swephlib.c').read_text()
    header = constants(source)
    indices = ['SE_MODEL_DELTAT', 'SE_MODEL_PREC_LONGTERM', 'SE_MODEL_PREC_SHORTTERM',
               'SE_MODEL_NUT', 'SE_MODEL_BIAS', 'SE_MODEL_JPLHOR_MODE',
               'SE_MODEL_JPLHORA_MODE', 'SE_MODEL_SIDT']
    defaults = ['SEMOD_DELTAT_DEFAULT', 'SEMOD_PREC_DEFAULT', 'SEMOD_PREC_DEFAULT_SHORT',
                'SEMOD_NUT_DEFAULT', 'SEMOD_BIAS_DEFAULT', 'SEMOD_JPLHOR_DEFAULT',
                'SEMOD_JPLHORA_DEFAULT', 'SEMOD_SIDT_DEFAULT']
    families = ['DELTAT', 'PREC', 'PREC', 'NUT', 'BIAS', 'JPLHOR', 'JPLHORA', 'SIDT']
    assert [header[n] for n in indices] == list(range(8))
    definitions = re.findall(r'^\s*#\s*define\s+(AMODELS_SE_\d_\d+)\s+"([\d,]+)"', text, re.M)
    rows = []
    for name, values in definitions:
        version = name.replace('AMODELS_SE_', '').split('_')
        preset = 'SE' + version[0] + '.' + version[1]
        selectors = [int(x) for x in values.split(',')]
        rows.append({'preset': preset, 'sourceMacro': name, 'sourceLine': text[:text.index('# define ' + name)].count('\n') + 1,
                     'sourceSelectors': selectors})
    rows.append({'preset': 'default', 'sourceMacro': None, 'sourceSelectors': [0]*8})
    for row in rows:
        effective = [x or header[d] for x, d in zip(row['sourceSelectors'], defaults)]
        row['effectiveSelectors'] = effective
        row['modelNames'] = {
            indices[i]: next(n for n, v in header.items()
                            if n.startswith('SEMOD_' + families[i] + '_') and v == value
                            and 'DEFAULT' not in n)
            for i, value in enumerate(effective)}
    assert [r['preset'] for r in rows] == PRESETS
    return {'parsedFrom': 'pinned official swephlib.c and swephexp.h, not hand-written presets',
            'selectorOrder': indices, 'defaultSymbols': defaults, 'presets': rows}


class Diagnostic(v2.SwissC):
    def __init__(self, path, allow_horizons_degradation=False):
        super().__init__(path)
        self.allow_degradation = allow_horizons_degradation
        for name, args, ret in [
            ('swe_calc', [C.c_double, C.c_int, C.c_int, C.POINTER(C.c_double), C.c_char_p], C.c_int),
            ('swe_utc_to_jd', [C.c_int]*5 + [C.c_double, C.c_int, C.POINTER(C.c_double), C.c_char_p], C.c_int),
            ('swe_set_astro_models', [C.c_char_p, C.c_int], None),
            ('swe_get_astro_models', [C.c_char_p, C.c_char_p, C.c_int], None),
        ]:
            f = getattr(self.s, name)
            f.argtypes, f.restype = args, ret

    def model(self, request, tidal=None):
        # swe_get_astro_models() re-applies its input and emits selectors inside
        # sdet; in this release samod itself is deliberately NOT an output.
        buf = C.create_string_buffer(request.encode(), 256)
        self.s.swe_set_astro_models(buf, self.flags)
        details = C.create_string_buffer(16384)
        self.s.swe_get_astro_models(buf, details, self.flags)
        if tidal is not None:
            self.s.swe_set_tid_acc(tidal)
            # Numeric selectors do not alter tidal acceleration on this call.
            self.s.swe_get_astro_models(buf, details, self.flags)
        text = details.value.decode()
        raw = [int(x) for x in re.search(r'-amod([\d,]+)', text)[1].strip(',').split(',')]
        return {'request': request, 'reportedSelectors': raw, 'description': text,
                'tidalAcceleration': self.s.swe_get_tid_acc()}

    def sun(self, jd, func, expected):
        xx = (C.c_double*6)()
        err = C.create_string_buffer(1024)
        returned = getattr(self.s, func)(jd, 0, self.flags, xx, err)
        warning = err.value.decode()
        allowed = {self.flags}
        if self.flags & JPLHOR:
            allowed.add(self.flags | ICRS)  # Full mode automatically adds ICRS.
            if self.allow_degradation:
                allowed.add((self.flags & ~JPLHOR) | APPROX)
        if returned not in allowed or returned & 7 != 1:
            raise RuntimeError((func, jd, self.flags, returned, warning))
        if warning and not (self.allow_degradation and 'default to SEFLG_JPLHOR_APPROX' in warning):
            raise RuntimeError(warning)
        self.observed.add(returned)
        return {'longitude': xx[0], 'longitudeDecimal17': format(xx[0], '.17f'),
                'speedDegreesPerDay': xx[3], 'gateLine': gate_line(xx[0]),
                'function': func, 'jd': jd, 'requestedFlags': self.flags,
                'returnedFlags': returned, 'actualEphemerisFlag': returned & 7,
                'fullHorizonsActive': bool(returned & JPLHOR),
                'approxHorizonsActive': bool(returned & APPROX), 'warning': warning or None,
                'matchesJovian': gate_line(xx[0]) == expected,
                **boundary(xx[0], xx[3], expected)}

    def clocks(self, utc):
        t = datetime.fromisoformat(utc.replace('Z', '+00:00'))
        dr = (C.c_double*2)()
        err = C.create_string_buffer(1024)
        r = self.s.swe_utc_to_jd(t.year, t.month, t.day, t.hour, t.minute,
                               t.second + t.microsecond/1e6, 1, dr, err)
        assert r == 0 and not err.value, (r, err.value)
        naive = v2.jd(utc)
        dt = self.s.swe_deltat_ex(dr[1], self.flags, err)*86400
        assert not err.value
        return {'utc': utc, 'naiveUtcJd': naive, 'ttJd': dr[0], 'ut1Jd': dr[1],
                'ut1MinusNaiveUtcSeconds': (dr[1]-naive)*86400,
                'ttMinusNaiveUtcSeconds': (dr[0]-naive)*86400,
                'deltaTSeconds': dt, 'conversionFunction': 'swe_utc_to_jd',
                'manuallySuppliedDut1': False}


def counts(rows, path):
    return {'mismatchMatches': sum(r[path]['matchesJovian'] for r in rows[:7]),
            'controlsCorrect': sum(r[path]['matchesJovian'] for r in rows[7:]),
            'matchIds': [r['id'] for r in rows[:7] if r[path]['matchesJovian']],
            'controlFailureIds': [r['id'] for r in rows[7:] if not r[path]['matchesJovian']],
            'validFullGoldenParity': all(r[path]['matchesJovian'] for r in rows)}


def worker(a):
    c = Diagnostic(a.library, a.allow_degradation)
    c.setup(a.ephe, a.jpl, a.flags)
    model = c.model('' if a.model == 'default' else a.model, a.tidal)
    cases = {r['id']: r for r in json.loads((ROOT/'golden-cases.json').read_text())['cases']}
    baseline = next(g for g in json.loads((V2/'swiss-c-results.json').read_text())['groups']
                    if g['group'] == 'A-JPL441')
    old = {r['id']: r['personality']['sun']['longitude'] for r in baseline['cases']}
    rows = []
    for caseid in IDS:
        case = cases[caseid]
        expected = case['expected']['activations']['personality']['sun']
        clocks = c.clocks(case['birthUtc'])
        naive = c.sun(clocks['naiveUtcJd'], 'swe_calc_ut', expected)
        proper = c.sun(clocks['ut1Jd'], 'swe_calc_ut', expected)
        tt = c.sun(clocks['ttJd'], 'swe_calc', expected)
        residual = tt['longitude']-proper['longitude']
        # Only an API parity check. No tolerance is supplied to HD mapping.
        bound = 4*math.ulp(clocks['ttJd'])*abs(tt['speedDegreesPerDay']) + 4*math.ulp(tt['longitude'])
        assert abs(residual) <= bound, (caseid, residual, bound)
        rows.append({'id': caseid, 'role': 'mismatch' if caseid in IDS[:7] else 'negative-control',
                     'birthUtc': case['birthUtc'], 'jovian': expected, 'clocks': clocks,
                     'naive': naive, 'proper': proper, 'viaTT': tt,
                     'ttVsUt1ResidualDegrees': residual, 'ttVsUt1ResidualMas': residual*3600000,
                     'ttVsUt1DoubleParityBoundDegrees': bound,
                     'naiveMinusV2BaselineMas': (naive['longitude']-old[caseid])*3600000,
                     'properMinusNaiveMas': (proper['longitude']-naive['longitude'])*3600000})
    de = c.s.swi_get_jpl_denum()
    assert de == int(re.search(r'\d+', a.jpl)[0]), (a.jpl, de)
    out = {'label': a.label, 'status': 'completed', 'diagnosticOnly': True,
           'processId': os.getpid(), 'swissVersion': c.version, 'jplFile': a.jpl,
           'runtimeDeNumber': de, 'requestedFlags': a.flags,
           'actualFlagsObserved': sorted(c.observed), 'ephemerisFallbackAllowed': False,
           'model': model, 'cases': rows,
           'summary': {'proper': counts(rows, 'proper'), 'naiveDiagnostic': counts(rows, 'naive')},
           'loadedFiles': c.files()}
    dump(a.output, out)
    c.s.swe_close()


def run_group(a, label, model='default', tidal=None, flags=257, ephe=None, jpl='de441.eph', allow=False):
    output = HERE/'evidence'/f'{label}.json'
    cmd = [sys.executable, str(Path(__file__)), '--worker', '--library', str(a.library),
           '--source', str(a.source), '--ephe', str(ephe or a.ephe), '--jpl', jpl,
           '--model', model, '--label', label, '--flags', str(flags), '--output', str(output)]
    if tidal is not None: cmd += ['--tidal', str(tidal)]
    if allow: cmd += ['--allow-degradation']
    subprocess.run(cmd, check=True, env={**os.environ, 'PYTHONDONTWRITEBYTECODE': '1'})
    result = json.loads(output.read_text())
    print(label, json.dumps(result['summary']))
    return result


def verify_eop_snapshot(ephe):
    provenance = json.loads((HERE/'eop-provenance.json').read_text())
    for filename, key in [('eop_1962_today.txt','c04Sha256'), ('eop_finals.txt','finalsSha256')]:
        assert hashlib.sha256((ephe/filename).read_bytes()).hexdigest() == provenance[key], 'EOP snapshot changed; run capture.py first'
    assert provenance['allNineBirthDatesCovered'] and len(provenance['cases']) == 9
    return {k:provenance[k] for k in ['c04Sha256','finalsSha256','c04MjdRange','allNineBirthDatesCovered']}


def main():
    p = argparse.ArgumentParser()
    p.add_argument('--library', type=Path, required=True)
    p.add_argument('--source', type=Path, required=True)
    p.add_argument('--ephe', type=Path, required=True)
    p.add_argument('--phase', choices=['time', 'legacy', 'components', 'horizons', 'kernels'])
    p.add_argument('--worker', action='store_true')
    p.add_argument('--label', default='worker')
    p.add_argument('--model', default='default')
    p.add_argument('--tidal', type=float)
    p.add_argument('--flags', type=int, default=257)
    p.add_argument('--jpl', default='de441.eph')
    p.add_argument('--allow-degradation', action='store_true')
    p.add_argument('--guard-ephe', type=Path)
    p.add_argument('--output', type=Path)
    a = p.parse_args()
    if a.worker: return worker(a)
    pinned = json.loads((V2/'environment-c.json').read_text())
    for row in pinned['sourceFiles']:
        assert hashlib.sha256((a.source/row['filename']).read_bytes()).hexdigest() == row['sha256']
    assert hashlib.sha256((ROOT/'golden-cases.json').read_bytes()).hexdigest() == pinned['timeInputGoldenJsonSha256']
    if a.phase == 'time':
        data = run_group(a, 'time-default')
        assert all(r['naiveMinusV2BaselineMas'] == 0 for r in data['cases'])
        dump(HERE/'time-scale-results.json', data)
    elif a.phase == 'legacy':
        assert (HERE/'time-scale-results.json').exists(), 'TIME experiment must complete first'
        presets = parse_presets(a.source)
        dump(HERE/'legacy-presets.json', presets)
        groups = [run_group(a, 'legacy-'+r['preset'], r['preset']) for r in presets['presets']]
        assert len({g['processId'] for g in groups}) == len(groups)
        dump(HERE/'legacy-results.json', {'status': 'completed', 'separateProcesses': True, 'groups': groups})
    elif a.phase == 'components':
        groups = json.loads((HERE/'legacy-results.json').read_text())['groups']
        valid = [g for g in groups if g['summary']['proper']['controlsCorrect'] == 2]
        best_count = max(g['summary']['proper']['mismatchMatches'] for g in valid)
        tied = [g for g in valid if g['summary']['proper']['mismatchMatches'] == best_count]
        # All presets tie in this experiment. SE1.64 has a different matched
        # subset and precedes the only Gate/Line-changing adjacent transition.
        best = next((g for g in tied if g['model']['request'] == 'SE1.64'), tied[0])
        if best['summary']['proper']['mismatchMatches'] < 4:
            dump(HERE/'component-matrix.json', {'status': 'not-triggered', 'reason': 'No valid preset >=4/7'})
            return
        presets = json.loads((HERE/'legacy-presets.json').read_text())['presets']
        default = next(r for r in presets if r['preset'] == 'default')['effectiveSelectors']
        target = next(r for r in presets if r['preset'] == best['label'][7:])['effectiveSelectors']
        replacements = {'precession-only': [1,2], 'nutation-only': [3], 'bias-only': [4],
                        'deltaT-only': [0], 'precession-nutation': [1,2,3],
                        'precession-bias': [1,2,4], 'nutation-bias': [3,4],
                        'precession-nutation-bias': [1,2,3,4]}
        rows = []
        for label, indices in replacements.items():
            selectors = list(default)
            for i in indices: selectors[i] = target[i]
            rows.append(run_group(a, 'component-'+label, ','.join(map(str, selectors))))
        rows.append(run_group(a, 'component-full-preset', best['model']['request']))
        dump(HERE/'component-matrix.json', {'status': 'completed', 'bestPreset': best['model']['request'],
             'tiedBestPresets': [g['model']['request'] or 'default' for g in tied],
             'selectionReason': 'Tied 4/7; SE1.64 chosen to decompose the distinct legacy match subset, not a superior/full-parity candidate',
             'defaultEndpoint': default, 'bestEndpoint': target, 'tidalPolicy': 'Held at default except full named preset',
             'groups': rows})
    elif a.phase == 'horizons':
        groups = [run_group(a, 'horizons-approx', flags=BASE_FLAGS|APPROX)]
        eop_verified = None
        if (a.ephe/'eop_1962_today.txt').exists():
            eop_verified = verify_eop_snapshot(a.ephe)
            groups.append(run_group(a, 'horizons-full', flags=BASE_FLAGS|JPLHOR))
        guard = None
        if a.guard_ephe:
            assert not (a.guard_ephe/'eop_1962_today.txt').exists()
            guard = run_group(a, 'horizons-missing-eop-guard', flags=BASE_FLAGS|JPLHOR,
                              ephe=a.guard_ephe, allow=True)
            assert all(r['proper']['approxHorizonsActive'] and not r['proper']['fullHorizonsActive']
                       for r in guard['cases'])
        dump(HERE/'jpl-horizons-results.json', {'status': 'completed', 'groups': groups,
             'fullModeEopSnapshotVerified': eop_verified,
             'missingEopDegradationGuard': guard,
             'fullModeStatus': 'completed-without-APPROX' if len(groups)==2 else 'not-executed-no-EOP'})
    elif a.phase == 'kernels':
        best = json.loads((HERE/'component-matrix.json').read_text())['bestPreset']
        groups = [run_group(a, 'kernel-DE'+str(de), model=best, jpl=f'de{de}.eph') for de in [405,406]]
        dump(HERE/'historical-kernel-results.json', {'status': 'completed', 'preset': best, 'groups': groups})
    else: p.error('--phase is required')


if __name__ == '__main__': main()
