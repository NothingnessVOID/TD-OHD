#!/usr/bin/env python3
"""Run pinned Sharp 0.5.1 current/bias diagnostics outside production.

Required inputs are external .se1 and raw DE441 files. This script does not
obtain them, upgrade packages, change application sources, or install output.
"""
import argparse,hashlib,io,json,platform,shutil,subprocess,tarfile,sys
sys.dont_write_bytecode=True
from pathlib import Path
from frozen_mapping import gate_line,boundary

COMMIT='342a57997c1b987e7949acc98897c8b73d05939a'
IDS=['G1995-feb','G1995-jun','G2005-jul20','G2015-tight','G2015-feb','G2025-tight','G2025-mar','G1985-tight','G2005-jul11']
PINNED_ASSETS={
 'sepl_18.se1':(484061,'ca1393ceab3a44fbc895887cf789c68819ae6a1cbc9b22225872dbe4ccd99a66'),
 'semo_18.se1':(1304771,'1ca07bd67c24374d77226180c20a4f9996cba013697894810518e7eb582ca4f7'),
 'de441.eph':(2788676624,'476096486def4e41bfceb29aa27f50784da0bce318902bcf7b88caad058cd4da'),
}
SCRIPT=Path(__file__).resolve().parent
AUDIT=SCRIPT.parents[1]

def run(cmd,**kw):
    return subprocess.run([str(v) for v in cmd],check=True,text=True,capture_output=True,**kw)
def digest(p):
    h=hashlib.sha256()
    with open(p,'rb') as f:
        for b in iter(lambda:f.read(4*1024*1024),b''):h.update(b)
    return h.hexdigest()
def finalize(rows,cases):
    for row in rows:
        if 'error' in row:raise RuntimeError(row['error'])
        c=cases[row['id']]
        assert row['birthUtc']==c['birthUtc']
        expected=c['expected']['activations']['personality']
        acts={name:gate_line(p['longitude']) for name,p in row['personalityRawPositions'].items()}
        assert acts==row['nativePersonalityActivationOracle'],'Frozen mapping disagreement'
        row['personalityActivations']=acts
        row['sunGateLine']=acts['sun'];row['earthGateLine']=acts['earth']
        row['sunBoundary']=boundary(row['sunLongitude'],row['sunLongitudeSpeedDegreesPerDay'],expected['sun'])
        row['expectedJovianSun']=expected['sun']
        row['personalitySunMatchesJovian']=acts['sun']==expected['sun']
        row['personality13MatchesJovian']=acts==expected
        row['personalityMismatches']=[{'point':n,'actual':acts[n],'expected':expected[n]} for n in acts if acts[n]!=expected[n]]
        row['mapping']='root-cause-v2/scripts/frozen_mapping.py; production oracle asserted identical'
    return rows

def main():
    p=argparse.ArgumentParser()
    p.add_argument('--dotnet',required=True);p.add_argument('--source-checkout',required=True)
    p.add_argument('--swiss-dir',required=True);p.add_argument('--jpl441-dir',required=True)
    p.add_argument('--workdir',required=True);p.add_argument('--output',required=True)
    a=p.parse_args()
    work=Path(a.workdir).expanduser().resolve();out=Path(a.output).expanduser().resolve()
    if work==AUDIT or AUDIT in work.parents:raise ValueError('Build workdir must be outside audit directory')
    work.mkdir(parents=True,exist_ok=True);out.mkdir(parents=True,exist_ok=True)
    assets=[]
    for name,(size,sha) in PINNED_ASSETS.items():
        path=Path(a.jpl441_dir if name.endswith('.eph') else a.swiss_dir)/name
        assert path.stat().st_size==size, 'Wrong size: '+name
        actual=digest(path)
        assert actual==sha, 'Wrong frozen ephemeris hash: '+name
        assets.append({'id':name,'bytes':size,'sha256':actual,'hashVerifiedBySharpRunner':True,
                       'sharedSourceProvenance':'asset-hashes-c.json'})
    golden=json.loads((AUDIT/'golden-cases.json').read_text())
    cases={c['id']:c for c in golden['cases']}
    payload=''.join(json.dumps({'id':i,'birthUtc':cases[i]['birthUtc']})+'\n' for i in IDS)
    source=work/'bias-source'
    if source.exists():raise ValueError('Use a fresh workdir to avoid stale/already patched source')
    source.mkdir()
    archive=subprocess.check_output(['git','-C',a.source_checkout,'archive',COMMIT])
    with tarfile.open(fileobj=io.BytesIO(archive)) as t:t.extractall(source,filter='data')
    before=digest(source/'Application/Bodies/CorrectionPipeline.cs')
    patchlog=run(['python3',SCRIPT/'sharp-bias-patch.py',source]).stdout
    current=work/'current';biased=work/'biased'
    for target in [current,biased]:
        shutil.copytree(SCRIPT/'sharp-harness',target)
    buildlogs={}
    for label,target in [('current',current),('biased',biased)]:
        cmd=[a.dotnet,'build',target/'SharpDiagnostic.csproj','-c','Release','-o',work/(label+'-out'),'--nologo']
        if label=='biased':cmd.extend(['-p:SharpDiagnosticSource='+str(source),'-p:SharpAstrologyBaseVersion=[0.14.0]'])
        buildlogs[label]=run(cmd).stdout
    groups={}
    for label,ephe in [('swiss',a.swiss_dir),('jpl',a.jpl441_dir)]:
        for kind in ['current','biased']:
            cmd=[a.dotnet,work/(kind+'-out')/'SharpDiagnostic.dll',label,ephe]
            if kind=='biased':cmd.append('bias')
            lines=run(cmd,input=payload).stdout.splitlines()
            rows=finalize([json.loads(l) for l in lines],cases)
            assert len(rows)==9
            groups[label+'-'+kind]=rows
    parity=[]
    for label,ephe in [('swiss',a.swiss_dir),('jpl',a.jpl441_dir)]:
        lines=run([a.dotnet,work/'biased-out'/'SharpDiagnostic.dll',label,ephe],input=payload).stdout.splitlines()
        rows=[json.loads(l) for l in lines]
        for x,y in zip(groups[label+'-current'],rows):
            assert x['id']==y['id'] and x['personalityRawPositions']==y['personalityRawPositions']
        parity.append({'source':label,'caseCount':len(rows),'longitudeSpeedPairsExactlyEqual':len(rows)*13,'comparison':'NuGet original versus rebuilt frozen source with diagnostic metadata disabled'})
    for label in ['current','biased']:
        for k,v in groups.items():
            if k.endswith(label):
                for row in v:
                    expectedsource='Jpl' if k.startswith('jpl') else 'SwissEph'
                    assert row['runtimeSource']==expectedsource
                    assert row['moshierEnabled'] is False
                    assert row['adapterEqualsActualDirectSource']
    base={'schemaVersion':1,'diagnosticOnly':True,'frozenCaseIds':IDS,'inputPolicy':'birthUtc only; no local-time reconversion',
          'fixedVersions':{'Base':'0.14.0','SwissEph':'0.5.1','HumanDesign':'1.2.0'},'sourceCommit':COMMIT}
    current={**base,'groups':{'Sharp-se1-current':groups['swiss-current'],'Sharp-JPL441-current':groups['jpl-current']}}
    bias={**base,'patchScope':'one ICRS -> J2000 frame-bias call after annual aberration and before precession; source-specific actual-reader-header DE metadata only',
          'groups':{'Sharp-se1-bias':groups['swiss-biased'],'Sharp-JPL441-bias':groups['jpl-biased']}}
    (out/'sharp-jpl-results.json').write_text(json.dumps(current,indent=2)+'\n')
    (out/'sharp-bias-results.json').write_text(json.dumps(bias,indent=2)+'\n')
    env={**base,'os':platform.platform(),'dotnetVersion':run([a.dotnet,'--version']).stdout.strip(),
         'originalCorrectionPipelineSha256':before,'patchedCorrectionPipelineSha256':digest(source/'Application/Bodies/CorrectionPipeline.cs'),
         'patchScriptSha256':digest(SCRIPT/'sharp-bias-patch.py'),'harnessSourceSha256':digest(SCRIPT/'sharp-harness'/'Program.cs'),
         'frozenMappingSha256':digest(SCRIPT/'frozen_mapping.py'),'goldenCasesSha256':digest(AUDIT/'golden-cases.json'),
         'fullFrozenSourceArchiveSha256':hashlib.sha256(archive).hexdigest(),
         'sourceParity':parity,'buildLogs':buildlogs,'patchLog':patchlog,'inputEphemerisAssets':assets,
         'originalPackageAssemblySha256':digest(work/'current-out'/'SharpAstrology.SwissEph.dll'),
         'patchedAssemblySha256':digest(work/'biased-out'/'SharpAstrology.SwissEph.dll'),
         'ordinaryPipelineCorrectedStateCache':'None in BodyService.Compute: every call resolves raw source and invokes pipeline; source coefficient/segment caches may be reused.',
         'outputsAreNotInstalled':True,'biasMetadataExplanation':'0.5.1 BodyState has no DE field. Harness verifies actual registered source reader header DE441 and injects AppContext metadata for that source only. Unknown metadata skips bias.',
         'packageDependencies':json.loads((work/'current-out'/'SharpDiagnostic.deps.json').read_text())['libraries'],
         'metadataGuardTests':'Every biased case checks DE402 skipped, ICRS skipped, Moshier unchanged, DE441 applied; original source + metadata disabled exactly equals package release.'}
    # Build directories are deliberately external. Publish sanitized logs only.
    env['buildLogs']={k:v.replace(str(work),'<EXTERNAL_BUILD>') for k,v in buildlogs.items()}
    (out/'environment-sharp.json').write_text(json.dumps(env,indent=2)+'\n')
    print(json.dumps({k:{'caseCount':len(v),'jovianSunMatches':sum(r['personalitySunMatchesJovian'] for r in v),'sunGateLines':[r['sunGateLine'] for r in v]} for k,v in groups.items()},indent=2))

if __name__=='__main__':main()
