#!/usr/bin/env python3
"""Fetch pinned historical sources/data outside Git, build, and rerun research.

Requires Python 3.12+, curl, clang/cc. No production imports or writes.
All changed model builds are explicitly ARTIFICIAL EXPERIMENT.
"""
import argparse
import hashlib
import json
import os
import platform
import re
import shutil
import subprocess
import sys
import tarfile
from pathlib import Path

HERE=Path(__file__).resolve().parent
DOC=HERE.parent
REPO=DOC.parents[1]
CFILES=['swedate.c','sweph.c','swephlib.c','swejpl.c','swemmoon.c',
        'swemplan.c','swehouse.c','swecl.c','swehel.c']
EXPERIMENTS={
    'pre1976':({'PREC_IAU_1976':'TRUE','PREC_IAU_2003':'FALSE'},False),
    'nut1980':({'NUT_IAU_1980':'TRUE','NUT_IAU_2000B':'FALSE'},False),
    'nut2000a':({'NUT_IAU_2000A':'TRUE','NUT_IAU_2000B':'FALSE'},False),
    'no-bias':({},True),
    'pre1976-nut1980':({'PREC_IAU_1976':'TRUE','PREC_IAU_2003':'FALSE',
                      'NUT_IAU_1980':'TRUE','NUT_IAU_2000B':'FALSE'},False),
    'legacy-jpl-style':({'PREC_IAU_1976':'TRUE','PREC_IAU_2003':'FALSE',
                        'NUT_IAU_1980':'TRUE','NUT_IAU_2000B':'FALSE'},True),
}

def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()

def prepare(runtime, skip_jpl):
    manifest=json.loads((DOC/'acquisition-manifest.json').read_text())
    for a in manifest['assets']:
        if skip_jpl and a['kind']=='jpl-binary':continue
        dest=runtime/a['name'];dest.parent.mkdir(parents=True,exist_ok=True)
        if not dest.exists() or sha(dest)!=a['sha256']:
            temporary=dest.with_suffix(dest.suffix+'.download')
            subprocess.run(['curl','-fSL','--retry','2','--max-time','300',
                            a['url'],'-o',str(temporary)],check=True)
            assert sha(temporary)==a['sha256'],a['name']
            temporary.replace(dest)
        assert dest.stat().st_size==a['bytes'],a['name']
        if a['kind']=='source-archive':
            folder=runtime/('source-'+a['versionMacro'])
            with tarfile.open(dest) as t:t.extractall(folder,filter='data')
            src=folder/a['sourceSubdir']
            header=(src/'sweph.h').read_text(encoding='latin1')
            assert re.search(r'#define\s+SE_VERSION\s+"'+re.escape(a['versionMacro'])+'"',header)
    # Check published DSC hashes; this does not authenticate its PGP signature.
    for archive,dsc in [('maitreya7.tar.bz2','maitreya7.dsc'),('libswe-177.tar.bz2','libswe177.dsc')]:
        assert sha(runtime/archive) in (runtime/dsc).read_text()
    return {v:runtime/('source-'+v)/next(a['sourceSubdir'] for a in manifest['assets'] if a.get('versionMacro')==v)
            for v in ['1.76.00','1.77.00','2.10.03']}

def build(runtime,sources):
    compiler=shutil.which('clang') or shutil.which('cc')
    assert compiler,'C compiler required'
    extension='dylib' if platform.system()=='Darwin' else 'so'
    linkflag='-dynamiclib' if platform.system()=='Darwin' else '-shared'
    libs={};records=[]
    builds={'176':sources['1.76.00'],'177':sources['1.77.00'],'210':sources['2.10.03']}
    for label,(defs,omit_bias) in EXPERIMENTS.items():
        src=runtime/('experiment-'+label)
        shutil.copytree(sources['1.77.00'],src,dirs_exist_ok=True)
        h=src/'swephlib.h';text=h.read_text(encoding='latin1')
        for key,val in defs.items():
            text,n=re.subn(r'(#define\s+'+key+r'\s+)\w+',r'\g<1>'+val,text)
            assert n==1
        h.write_text(text,encoding='latin1')
        if omit_bias:
            f=src/'swephlib.c';text=f.read_text(encoding='latin1')
            needle='void swi_bias(double *x, int32 iflag, AS_BOOL backward)\n{'
            assert text.count(needle)==1
            text=text.replace(needle,needle+'\n  return; /* ARTIFICIAL EXPERIMENT: omit frame rotation, no longitude offset. */',1)
            f.write_text(text,encoding='latin1')
        builds['177-'+label]=src
    for label,src in builds.items():
        lib=runtime/('swiss'+label+'.'+extension)
        files=[src/f for f in CFILES]
        cmd=[compiler,linkflag,'-fPIC','-O2','-I',str(src),'-o',str(lib),
             *map(str,files),str(HERE/'native_state.c'),'-lm']
        proc=subprocess.run(cmd,capture_output=True,text=True)
        if proc.returncode:raise RuntimeError(proc.stderr)
        libs[label]=lib
        records.append({'build':label,'sourceFilesSha256':{p.name:sha(p) for p in files+[src/'sweph.h',src/'swephlib.h',src/'swephexp.h']},
                        'librarySha256':sha(lib),'compilerFlags':[linkflag,'-fPIC','-O2','-lm'],
                        'warningSummary':'swehel.c existing array-vs-NULL warning' if 'warning:' in proc.stderr else None,
                        'classification':'ARTIFICIAL EXPERIMENT' if '-' in label else 'MODERN REFERENCE' if label=='210' else 'HISTORICAL STACK'})
        print('built',label,flush=True)
    compiler_text=subprocess.run([compiler,'--version'],capture_output=True,text=True,check=True).stdout.splitlines()[0]
    return libs,{'system':platform.system(),'machine':platform.machine(),'compiler':compiler_text,
                 'instrumentation':'read-only native_state.c, no modifications to historical default code',
                 'builds':records}

def run(runtime,libs,output,skip_jpl):
    jobs=[]
    for ver in ['176','177','210']:
        for mode in ['tt','archived-utc','utc-as-ut1']:
            jobs.append((f'{ver}-de406-{mode}',ver,406,mode,258,None,False))
    for ver in ['176','177']:
        jobs.append((f'{ver}-de406-extended-utc-as-ut1',ver,406,'utc-as-ut1',258,None,True))
    jobs.append(('210-de441-extended-tt','210',441,'tt',258,None,True))
    for de in [431,441]:
        for ver in ['177','210']:jobs.append((f'{ver}-de{de}-tt',ver,de,'tt',258,None,False))
    if not skip_jpl:
        for ver in ['177','210']:
            for mode in ['tt','utc-as-ut1']:jobs.append((f'{ver}-jpl406-{mode}',ver,406,mode,257,'de406.eph',False))
    for label in EXPERIMENTS:jobs.append(('experiment-'+label,'177-'+label,406,'tt',258,None,False))
    for label,flags in [('true',1810),('j2000',354),('no-nutation',322)]:
        jobs.append(('experiment-'+label,'177',406,'tt',flags,None,False))
    # Same old-model pair over direct DE406, explicitly not an authenticated JPL pipeline.
    if not skip_jpl:jobs.append(('experiment-pre1976-nut1980-jpl406','177-pre1976-nut1980',406,'tt',257,'de406.eph',False))
    env=dict(os.environ);env.pop('SE_EPHE_PATH',None)
    output.mkdir(parents=True,exist_ok=True)
    for stack,lib,de,mode,flags,jpl,all_cases in jobs:
        kind=('ARTIFICIAL EXPERIMENT' if stack.startswith('experiment') or (lib=='177' and de!=406)
              else 'MODERN REFERENCE' if lib=='210' else 'HISTORICAL STACK')
        cmd=[sys.executable,str(HERE/'run_stack.py'),'--library',str(libs[lib]),
             '--ephe',str(runtime if jpl else runtime/f'de{de}'),'--stack',stack,
             '--flags',str(flags),'--time-mode',mode,'--classification',kind,
             '--expected-de',str(de),'--output',str(output/(stack+'.json'))]
        if jpl:cmd+=['--jpl',jpl]
        if all_cases:cmd+=['--all-cases']
        subprocess.run(cmd,check=True,env=env)

def main():
    p=argparse.ArgumentParser();p.add_argument('--runtime',type=Path,required=True)
    p.add_argument('--output',type=Path,default=DOC/'results')
    p.add_argument('--skip-jpl',action='store_true',help='Skip 190 MiB direct JPL experiment, record skipped.')
    a=p.parse_args();runtime=a.runtime.resolve()
    assert not runtime.is_relative_to(REPO),'Keep third-party sources/data outside the repository'
    runtime.mkdir(parents=True,exist_ok=True)
    sources=prepare(runtime,a.skip_jpl);libs,record=build(runtime,sources)
    run(runtime,libs,a.output,a.skip_jpl)
    record['directJplSkipped']=a.skip_jpl
    (a.output/'build-manifest.json').write_text(json.dumps(record,indent=2)+'\n')

if __name__=='__main__':main()
