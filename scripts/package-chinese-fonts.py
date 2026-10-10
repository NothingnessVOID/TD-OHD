#!/usr/bin/env python3
"""Publish rebuild inputs and refresh complete public resource checksum inventory."""
import hashlib
import json
from pathlib import Path
import shutil

root=Path(__file__).resolve().parents[1]
fonts=root/'public/fonts'
rebuild=fonts/'rebuild'
rebuild.mkdir(exist_ok=True)
for source,name in [(root/'scripts/build-chinese-fonts.py','build-chinese-fonts.py'),(root/'docs/fonts/requirements.txt','requirements.txt'),(root/'docs/fonts/README.md','README.md'),(root/'docs/fonts/priority.txt','priority.txt')]:
    shutil.copyfile(source,rebuild/name)
public_readme=rebuild/'README.md'
public_readme.write_text(public_readme.read_text(encoding='utf-8').replace('../development/FONT-PREFERENCE.md', 'https://github.com/NothingnessVOID/TD-OHD/blob/main/docs/development/FONT-PREFERENCE.md'),encoding='utf-8',newline='\n')
files=sorted(p for p in fonts.rglob('*') if p.is_file() and p.name not in ('SHA256SUMS','resource-sizes.json'))
sizes={'files':[{'path':p.relative_to(fonts).as_posix(),'bytes':p.stat().st_size} for p in files],'payloadBytes':sum(p.stat().st_size for p in files),'note':'Payload excludes this size inventory and SHA256SUMS; both are included in repository total.'}
(fonts/'resource-sizes.json').write_text(json.dumps(sizes,indent=2)+'\n',encoding='utf-8',newline='\n')
files=sorted(p for p in fonts.rglob('*') if p.is_file() and p.name!='SHA256SUMS')
(fonts/'SHA256SUMS').write_text(''.join(f'{hashlib.sha256(p.read_bytes()).hexdigest()}  {p.relative_to(fonts).as_posix()}\n' for p in files),encoding='utf-8',newline='\n')
print('Public resource bytes:',sum(p.stat().st_size for p in fonts.rglob('*') if p.is_file()))
