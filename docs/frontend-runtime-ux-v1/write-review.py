#!/usr/bin/env python3
"""After npm run build, record exact frontend source/build hashes for review."""
from pathlib import Path
import subprocess, json, hashlib
root = Path(__file__).resolve().parents[2]
baseline = '2bc308b7a9037a10bae92fff6c9ff536a276b8ae'
hash_file = lambda file: hashlib.sha256(file.read_bytes()).hexdigest()
changed = subprocess.check_output(['git', 'diff', '--name-only', baseline], cwd=root, text=True).splitlines()
new = subprocess.check_output(['git', 'ls-files', '--others', '--exclude-standard'], cwd=root, text=True).splitlines()
sources = {file: hash_file(root/file) for file in sorted(set(changed+new)) if file.startswith('src/')}
distribution = {str(file.relative_to(root/'dist')): hash_file(file) for file in sorted((root/'dist').rglob('*')) if file.is_file()}
(root/'docs/frontend-runtime-ux-v1/review-hashes.json').write_text(json.dumps(dict(baseline=baseline, frontendSources=sources, distribution=distribution), indent=2)+'\n')
