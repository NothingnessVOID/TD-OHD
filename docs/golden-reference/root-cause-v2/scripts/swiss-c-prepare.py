#!/usr/bin/env python3
"""Diagnostic only: fetch exact official source and compile outside the repo.
No upstream source patch is applied. Large raw kernels are never stored in Git.
"""
import argparse, hashlib, json, pathlib, platform, subprocess, concurrent.futures
COMMIT='175e1fcb3108bcd5c0d146c803f51dcf23508012'
FILES=['sweph.c','swephlib.c','swejpl.c','swemplan.c','swemmoon.c','swecl.c','swehel.c','swehouse.c','swedate.c','sweph.h','swephlib.h','swejpl.h','swephexp.h','sweodef.h','swemptab.h','swenut2000a.h','swehouse.h','swedate.h','LICENSE.TXT','LICENSE']
BUILD_FILES=['sweph.c','swephlib.c','swejpl.c','swemplan.c','swemmoon.c','swecl.c','swehel.c','swehouse.c','swedate.c']
def main():
 p=argparse.ArgumentParser();p.add_argument('--workdir',type=pathlib.Path,required=True);p.add_argument('--profile',action='store_true');a=p.parse_args(); repo=pathlib.Path(__file__).resolve().parents[4]; target_dir=a.workdir.expanduser().resolve(); assert target_dir!=repo and repo not in target_dir.parents, 'Diagnostic work directory must be outside repository'; a.workdir.mkdir(parents=True,exist_ok=True);src=a.workdir/'c-source';src.mkdir(exist_ok=True)
 def fetch(n):
  url=f'https://raw.githubusercontent.com/aloistr/swisseph/{COMMIT}/{n}'
  subprocess.run(['/usr/bin/curl','-fLsS','--retry','3','-o',str(src/n),url],check=True)
  data=(src/n).read_bytes();return {'filename':n,'sourceUrl':url,'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()}
 with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:files=list(pool.map(fetch,FILES))
 assert '#define SE_VERSION' in (src/'sweph.h').read_text() and '2.10.03' in (src/'sweph.h').read_text()
 system=platform.system();suffix='.dylib' if system=='Darwin' else '.so';output=a.workdir/('libswisseph21003'+('-profile' if a.profile else '')+suffix)
 command=['cc','-dynamiclib' if system=='Darwin' else '-shared','-O2','-fPIC']
 if a.profile:command+=['-fprofile-instr-generate','-fcoverage-mapping']
 command+=['-o',str(output)]+BUILD_FILES+['-lm'];subprocess.run(command,cwd=src,check=True)
 metadata={'officialRepository':'https://github.com/aloistr/swisseph','commit':COMMIT,'version':'2.10.03','sourcePatched':False,'compiler':subprocess.check_output(['cc','--version'],text=True),'os':platform.platform(),'architecture':platform.machine(),'sourceFiles':files,'buildCommand':command,'buildCwd':'<DIAGNOSTIC_WORKDIR>/c-source','coverageInstrumentation':a.profile,'localLibrarySha256':hashlib.sha256(output.read_bytes()).hexdigest()}
 (a.workdir/'c-build.json').write_text(json.dumps(metadata,indent=2)+'\n');print(output)
if __name__=='__main__':main()
