#!/usr/bin/env python3
"""Isolated, arbitrary-input C2 astronomy provider; no fixtures or HD mechanics.

Personality passes civil UTC's numeric JD directly to historical swe_calc_ut.
Design solves the original 88-degree TT root and calls historical swe_calc.
Each native process owns a single pinned Swiss instance. Calls are serialized
because the historical library has process-global state.
"""
import argparse
import ctypes as C
from datetime import datetime, timezone
import hashlib
import json
import math
import os
from pathlib import Path
import threading

HERE = Path(__file__).resolve().parent
ORDER = ['sun', 'earth', 'moon', 'northNode', 'southNode', 'mercury', 'venus',
         'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto']
BODIES = dict(sun=0, moon=1, northNode=11, mercury=2, venus=3, mars=4,
              jupiter=5, saturn=6, uranus=7, neptune=8, pluto=9)
FLAGS = 258  # Historical defaults: Swiss compressed ephemeris + speed.
_LOCK = threading.RLock()
_RUNTIME = None


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def signed(a, b):
    return (a - b + 180) % 360 - 180


def utc_jd(stamp):
    civil = datetime.fromisoformat(stamp.replace('Z', '+00:00'))
    if civil.tzinfo is None or civil.utcoffset() is None:
        raise ValueError('UTC input must include Z or an explicit UTC offset')
    return 2440587.5 + civil.timestamp() / 86400


class HistoricalC2Backend:
    def __init__(self, runtime):
        global _RUNTIME
        self.runtime = Path(runtime).resolve()
        if self.runtime.is_relative_to(HERE.parent):
            raise ValueError('Third-party runtime must be outside the repository')
        self.manifest = json.loads((self.runtime / 'native-build.json').read_text())
        pinned = json.loads((HERE / 'native-assets.json').read_text())
        if self.manifest['assets'] != pinned['assets']:
            raise ValueError('Runtime asset pins differ from the provider')
        for asset in pinned['assets']:
            path = self.runtime / asset['name']
            if path.stat().st_size != asset['bytes'] or sha(path) != asset['sha256']:
                raise ValueError('Runtime asset integrity failure: ' + asset['name'])
        ephe = self.runtime / 'de406'
        if set(p.name for p in ephe.iterdir()) != {'sepl_18.se1', 'semo_18.se1'}:
            raise ValueError('Unexpected ephemeris sidecar could change historical defaults')
        if self.manifest['instrumentationSha256'] != sha(HERE / 'native_state.c'):
            raise ValueError('Rebuild native runtime after instrumentation changes')
        source_asset = next(a for a in pinned['assets'] if a['kind'] == 'source-archive')
        source = self.runtime / 'source-1.76.00' / source_asset['sourceSubdir']
        for name, digest in self.manifest['sourceFilesSha256'].items():
            if sha(source / name) != digest:
                raise ValueError('Runtime source integrity failure: ' + name)
        library = self.runtime / self.manifest['library']
        if sha(library) != self.manifest['librarySha256']:
            raise ValueError('Native library hash mismatch; rebuild runtime')
        with _LOCK:
            if _RUNTIME is not None and _RUNTIME != self.runtime:
                raise ValueError('Use a fresh process for a different native runtime')
            _RUNTIME = self.runtime
            self.s = C.CDLL(str(library))
            signatures = {
                'swe_version': ([C.c_char_p], C.c_char_p),
                'swe_set_ephe_path': ([C.c_char_p], None),
                'swe_calc': ([C.c_double, C.c_int, C.c_int, C.POINTER(C.c_double), C.c_char_p], C.c_int),
                'swe_calc_ut': ([C.c_double, C.c_int, C.c_int, C.POINTER(C.c_double), C.c_char_p], C.c_int),
                'swe_deltat': ([C.c_double], C.c_double),
                'swe_get_tid_acc': ([], C.c_double),
                'jovian_runtime_de': ([], C.c_int),
                'jovian_planet_file_de': ([], C.c_int),
                'jovian_moon_file_de': ([], C.c_int),
            }
            for name, (args, result) in signatures.items():
                function = getattr(self.s, name)
                function.argtypes, function.restype = args, result
            self.version = self.s.swe_version(C.create_string_buffer(256)).decode()
            if self.version != '1.76.00':
                raise ValueError('Incorrect historical Swiss library version')
            # Swiss lets SE_EPHE_PATH override the explicit path. Remove this
            # only in the isolated provider process, before initialization.
            os.environ.pop('SE_EPHE_PATH', None)
            self.s.swe_set_ephe_path(str(ephe).encode())
            self._calc(2451545.0, 0)  # Resolve DE before delta-T calls.
            self._calc(2451545.0, 1)
            self._verify_de()
        identity = {
            'engine': 'jovian-compatible', 'compatibilityVersion': 'v1',
            'basis': 'Swiss Ephemeris 1.76 compatible historical stack',
            'ephemeris': 'DE406',
            'timeSemantics': 'legacy utc-as-ut1 compatibility semantics',
            'sourceVersion': self.version,
            'sourceHash': source_asset['sha256'],
            'ephemerisHashes': {a['name']: a['sha256'] for a in pinned['assets']
                                if a['kind'] == 'compressed-ephemeris'},
            'buildIdentity': self.manifest['buildIdentity'],
            'librarySha256': self.manifest['librarySha256'],
            'providerSha256': sha(Path(__file__)),
        }
        identity['engineSignature'] = hashlib.sha256(
            json.dumps(identity, sort_keys=True, separators=(',', ':')).encode()).hexdigest()
        self.identity = identity

    def _verify_de(self):
        if self.s.jovian_planet_file_de() != 406 or self.s.jovian_moon_file_de() != 406:
            raise RuntimeError('Compressed DE406 not active; fallback is prohibited')

    def _calc(self, jd, body, ut=False):
        values = (C.c_double * 6)()
        error = C.create_string_buffer(1024)
        function = self.s.swe_calc_ut if ut else self.s.swe_calc
        returned = function(jd, body, FLAGS, values, error)
        if returned != FLAGS or error.value:
            raise RuntimeError(f'Historical calculation failed at JD {jd}, body {body}: '
                               f'flags {returned}, {error.value.decode()}')
        if not all(math.isfinite(x) for x in values):
            raise RuntimeError('Non-finite historical position')
        return list(values)

    def _epoch(self, jd, ut=False):
        result = {}
        for body in ORDER:
            if body == 'earth':
                result[body] = dict(result['sun'])
                result[body]['longitude'] = (result[body]['longitude'] + 180) % 360
            elif body == 'southNode':
                result[body] = dict(result['northNode'])
                result[body]['longitude'] = (result[body]['longitude'] + 180) % 360
            else:
                position = self._calc(jd, BODIES[body], ut)
                result[body] = {'longitude': position[0], 'speedDegreesPerDay': position[3]}
        return result

    def _design(self, birth_tt):
        target = (self._calc(birth_tt, 0)[0] - 88) % 360
        low, high = birth_tt - 110, birth_tt - 70
        if signed(self._calc(low, 0)[0], target) >= 0 or signed(self._calc(high, 0)[0], target) <= 0:
            raise RuntimeError('Historical Design solar root is not bracketed')
        # Exact immutable C2 operation order, including its binary64 endpoint
        # termination. Never use an epsilon or a fixed date subtraction.
        for _ in range(64):
            middle = (low + high) / 2
            if middle in (low, high):
                break
            if signed(self._calc(middle, 0)[0], target) >= 0:
                high = middle
            else:
                low = middle
        return (low + high) / 2

    def calculate(self, input_utc_jd):
        jd = float(input_utc_jd)
        if not math.isfinite(jd):
            raise ValueError('UTC numeric JD must be finite')
        with _LOCK:
            personality = self._epoch(jd, ut=True)
            tt = jd + self.s.swe_deltat(jd)
            design_tt = self._design(tt)
            design = self._epoch(design_tt)
            self._verify_de()
            inverse = design_tt
            for _ in range(5):
                inverse = design_tt - self.s.swe_deltat(inverse)
            return {
                'utcJd': jd, 'ttJd': tt, 'designTtJd': design_tt,
                'designModelUt1Jd': inverse,
                'designModelNumericClock': datetime.fromtimestamp(
                    (inverse - 2440587.5) * 86400, timezone.utc).replace(tzinfo=None).isoformat(),
                'designClockMeaning': 'Historical inverse numeric UT1 clock; not asserted civil UTC',
                'solarArcDegrees': (personality['sun']['longitude'] - design['sun']['longitude']) % 360,
                'personality': personality, 'design': design,
                'requestedFlags': FLAGS, 'returnedFlags': FLAGS,
                'runtimeDe': {'planet': self.s.jovian_planet_file_de(), 'moon': self.s.jovian_moon_file_de()},
                'tidalAcceleration': self.s.swe_get_tid_acc(), 'identity': self.identity,
            }


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--runtime', type=Path, required=True)
    inputs = parser.add_mutually_exclusive_group(required=True)
    inputs.add_argument('--utc-jd', type=float)
    inputs.add_argument('--utc', help='ISO 8601 timestamp with Z or UTC offset')
    args = parser.parse_args()
    value = args.utc_jd if args.utc_jd is not None else utc_jd(args.utc)
    print(json.dumps(HistoricalC2Backend(args.runtime).calculate(value), indent=2))
