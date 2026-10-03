"""Read-only checks for published audit data; never requests remote chart services."""
from pathlib import Path
import hashlib
import json
import re
import struct

ROOT = Path(__file__).resolve().parent

def read(name):
    return json.loads((ROOT / name).read_text())

def activation_map(activations):
    aliases = {'Sun':'sun','Earth':'earth','Moon':'moon','North Node':'northNode',
               'South Node':'southNode','Mercury':'mercury','Venus':'venus','Mars':'mars',
               'Jupiter':'jupiter','Saturn':'saturn','Uranus':'uranus',
               'Neptune':'neptune','Pluto':'pluto'}
    result = {}
    for side in ('personality', 'design'):
        assert len(activations[side]) == 13, side
        result[side] = {}
        for name, value in activations[side].items():
            value = value['gateLine'] if isinstance(value, dict) else value
            gate, line = map(int, value.split('.'))
            assert 1 <= gate <= 64 and 1 <= line <= 6, value
            result[side][aliases.get(name, name)] = value
    return result

cases = read('golden-cases.json')['cases']
assert [case['case'] for case in cases] == list('ABCDE')
mbg = read('mybodygraph/blind-results.json')
assert len(mbg['cases']) == 5
comparison = read('mybodygraph/comparison.json')
void = read('void/results.json')
lock = read('mybodygraph/blind-collection-lock.json')
assert lock['completedBeforeReferenceRead']
assert lock['sha256'] == hashlib.sha256((ROOT/'mybodygraph/blind-results.json').read_bytes()).hexdigest()
assert comparison['blindFileSha256'] == lock['sha256']

for i, case in enumerate(cases):
    observed = activation_map(case['myBodyGraph']['activations'])
    assert observed == activation_map(case['jovian']['activations'])
    assert observed == activation_map(mbg['cases'][i]['activations'])
    assert case['myBodyGraph']['profile'] == case['jovian']['profile']
    assert comparison['cases'][i]['Jovian']['all26Match']
    assert comparison['cases'][i]['Jovian']['profileMatch']
    assert len(case['modernSwissComparison']['mismatches']) == (2 if i < 3 else 0)
    assert activation_map(case['void']['activations']) == activation_map(void['cases'][i]['activations'])
    observations = [read(f"void/iab/{case['case']}-repeat-{n}.json") for n in (1,2,3)]
    for repeat in observations[1:]:
        assert repeat['data']['metadata'] == observations[0]['data']['metadata']
        assert repeat['data']['planets'] == observations[0]['data']['planets']
    assert len({item['id'] for item in observations[0]['data']['planets']}) == len(observations[0]['data']['planets'])

utc0 = read('void/iab/timezone-C-UTC0.json')['data']
utc8 = read('void/iab/timezone-C-UTC8.json')['data']
assert utc0['metadata'] == utc8['metadata']
assert utc0['planets'] == utc8['planets']

# Public code may contain generic field/header names, but not actual credentials.
private_patterns = [r'/Users/', r'/home/[A-Za-z0-9_.-]+/', r'[A-Z]:\\Users\\',
                    r'\b[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\b',
                    r'\beyJ[A-Za-z0-9_-]{30,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{15,}\b',
                    r'[A-Za-z0-9_.+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}']
for path in ROOT.rglob('*'):
    if path.is_file() and path.suffix in ('.json', '.md', '.txt'):
        text = path.read_text()
        for pattern in private_patterns:
            assert not re.search(pattern, text), f'Privacy pattern match in {path.relative_to(ROOT)}'

# Reject EXIF/XMP/IPTC comments; screenshots were separately reviewed visually.
image_count = 0
for path in ROOT.rglob('*.jpg'):
    data = path.read_bytes()
    assert data[:2] == b'\xff\xd8'
    offset = 2
    while offset < len(data):
        assert data[offset] == 255
        while data[offset] == 255:
            offset += 1
        marker = data[offset]
        offset += 1
        if marker in (0xDA, 0xD9):
            break
        if marker in range(0xD0, 0xD8):
            continue
        size = struct.unpack('>H', data[offset:offset+2])[0]
        assert marker not in (0xE1, 0xED, 0xFE), f'Unreviewed metadata in {path.name}'
        offset += size
    image_count += 1
assert image_count == 7

manifest = read('evidence-manifest.json')
for row in manifest:
    data = (ROOT / row['file']).read_bytes()
    assert len(data) == row['bytes'], row['file']
    assert hashlib.sha256(data).hexdigest() == row['sha256'], row['file']
assert {row['file'] for row in manifest} == {
    p.relative_to(ROOT).as_posix() for p in ROOT.rglob('*')
    if p.is_file() and p.name != 'evidence-manifest.json'
}
print('PASS: myBodyGraph 130/130 Jovian activations, 5/5 Profiles; VOID 15 stable runs; UTC equivalence; hashes and privacy checks; 7 reviewed screenshots.')
