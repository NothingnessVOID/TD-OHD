"""Verify the published evidence package; does not test engine accuracy."""
from pathlib import Path
import hashlib, json
root = Path(__file__).resolve().parents[1]
manifest = json.loads((root / 'SHA256SUMS.json').read_text())
expected = set()
for item in manifest['files']:
    path = (root / item['path']).resolve()
    assert root in path.parents, 'Invalid manifest path'
    assert path.is_file(), 'Missing: ' + item['path']
    assert path.stat().st_size == item['bytes'], 'Size changed: ' + item['path']
    assert hashlib.sha256(path.read_bytes()).hexdigest() == item['sha256'], 'Hash changed: ' + item['path']
    expected.add(item['path'])
actual = {str(p.relative_to(root)) for p in root.rglob('*') if p.is_file() and p.name != 'SHA256SUMS.json'}
assert actual == expected, 'File set changed'
print(json.dumps({'publishedFilesVerified': len(expected), 'hashFailures': 0}))
