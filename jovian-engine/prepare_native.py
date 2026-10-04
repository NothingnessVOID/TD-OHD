#!/usr/bin/env python3
"""Acquire and build the pinned historical backend entirely outside Git.

The historical Swiss license applies to the downloaded code and built library;
the repository's license does not relicense those external assets.
"""
import argparse
import hashlib
import json
import platform
import re
import shutil
import subprocess
import tarfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
REPO = HERE.parent
CFILES = ['swedate.c', 'sweph.c', 'swephlib.c', 'swejpl.c', 'swemmoon.c',
          'swemplan.c', 'swehouse.c', 'swecl.c', 'swehel.c']


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def prepare(runtime, asset_cache=None):
    runtime = Path(runtime).resolve()
    if runtime.is_relative_to(REPO):
        raise ValueError('Third-party runtime must be outside the repository')
    runtime.mkdir(parents=True, exist_ok=True)
    pinned = json.loads((HERE / 'native-assets.json').read_text())
    for asset in pinned['assets']:
        dest = runtime / asset['name']
        dest.parent.mkdir(parents=True, exist_ok=True)
        if not dest.exists() or sha(dest) != asset['sha256']:
            temporary = dest.with_suffix(dest.suffix + '.download')
            cached = Path(asset_cache) / asset['name'] if asset_cache else None
            if cached and cached.is_file() and sha(cached) == asset['sha256']:
                shutil.copyfile(cached, temporary)
            else:
                subprocess.run(['curl', '-fSL', '--retry', '2', '--max-time', '300',
                                asset['url'], '-o', str(temporary)], check=True)
            if sha(temporary) != asset['sha256']:
                raise ValueError('Downloaded asset hash mismatch: ' + asset['name'])
            temporary.replace(dest)
        if dest.stat().st_size != asset['bytes']:
            raise ValueError('Asset size mismatch: ' + asset['name'])
    archive = next(a for a in pinned['assets'] if a['kind'] == 'source-archive')
    source_root = runtime / 'source-1.76.00'
    with tarfile.open(runtime / archive['name']) as package:
        package.extractall(source_root, filter='data')
    source = source_root / archive['sourceSubdir']
    if not re.search(r'#define\s+SE_VERSION\s+"1\.76\.00"',
                     (source / 'sweph.h').read_text(encoding='latin1')):
        raise ValueError('Incorrect Swiss source version')
    compiler = shutil.which('clang') or shutil.which('cc')
    if not compiler:
        raise RuntimeError('Install a C compiler to build the native prototype')
    darwin = platform.system() == 'Darwin'
    library = runtime / ('jovian-swiss176.' + ('dylib' if darwin else 'so'))
    files = [source / f for f in CFILES]
    command = [compiler, '-dynamiclib' if darwin else '-shared', '-fPIC', '-O2',
               '-I', str(source), '-o', str(library), *map(str, files),
               str(HERE / 'native_state.c'), '-lm']
    build = subprocess.run(command, capture_output=True, text=True)
    if build.returncode:
        raise RuntimeError(build.stderr)
    manifest = {
        'schemaVersion': 1, 'sourceVersion': '1.76.00', 'sourcePatched': False,
        'sourceArchiveSha256': archive['sha256'],
        'sourceFilesSha256': {f.name: sha(f) for f in files + [
            source / 'sweph.h', source / 'swephlib.h', source / 'swephexp.h']},
        'instrumentationSha256': sha(HERE / 'native_state.c'),
        'library': library.name, 'librarySha256': sha(library),
        'assets': pinned['assets'], 'system': platform.system(),
        'architecture': platform.machine(),
        'compiler': subprocess.check_output([compiler, '--version'], text=True).splitlines()[0],
        'compilerFlags': command[1:4] + ['-lm'],
        'warnings': build.stderr.strip(),
    }
    manifest['buildIdentity'] = hashlib.sha256(
        json.dumps(manifest, sort_keys=True, separators=(',', ':')).encode()).hexdigest()
    (runtime / 'native-build.json').write_text(json.dumps(manifest, indent=2) + '\n')
    return manifest


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--runtime', type=Path, required=True)
    parser.add_argument('--asset-cache', type=Path)
    args = parser.parse_args()
    print(json.dumps(prepare(args.runtime, args.asset_cache), indent=2))
