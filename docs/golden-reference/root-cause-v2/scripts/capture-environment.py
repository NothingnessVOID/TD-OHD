#!/usr/bin/env python3
"""Capture small provenance manifests. Read the installation, never write it."""
import argparse,hashlib,json,platform,subprocess
from pathlib import Path

HERE=Path(__file__).resolve().parents[1]
REPO=HERE.parents[2]
START='4ffff9cc2941782c6189f1a32d8b575d5429b748'
def load(path):return json.loads(path.read_text())
def save(name,value):(HERE/name).write_text(json.dumps(value,indent=2)+'\n')
def sha(path):return hashlib.sha256(path.read_bytes()).hexdigest()

def main():
    p=argparse.ArgumentParser();p.add_argument('--installation-dist',type=Path,required=True);a=p.parse_args()
    original=load(HERE.parent/'final-baseline-verification.json')
    assets=[]
    for old in original['installedAssetsUnchanged']:
        actual=sha(a.installation_dist/old['path'])
        assets.append({'path':old['path'],'expectedSha256':old['sha256'],'actualSha256':actual,'unchanged':actual==old['sha256']})
    diff=subprocess.check_output(['git','diff','--name-only',START,'--','src','engine-core','engine-wasm','public'],cwd=REPO,text=True).splitlines()
    save('installation-verification.json',{'installationOrigin':'TD-OHD frozen 8787 installed dist, read only','comparisonTo':'../final-baseline-verification.json','assets':assets,'productionDiffFromStartingHead':diff,'startingAuditHead':START})
    c=load(HERE/'environment-c.json');sharp=load(HERE/'environment-sharp.json');raw=load(HERE/'asset-hashes-c.json')
    scripts=[{'path':str(f.relative_to(HERE)),'sha256':sha(f),'bytes':f.stat().st_size} for f in sorted((HERE/'scripts').rglob('*')) if f.is_file() and '__pycache__' not in f.parts and f.suffix not in ['.pyc']]
    save('asset-hashes.json',{'schemaVersion':1,'ephemerisAssets':raw['assets'],'officialCSourceFiles':c['sourceFiles'],'sharpPackageHashes':sharp['packageDependencies'],'sharpFrozenSourceArchiveSha256':sharp['fullFrozenSourceArchiveSha256'],'originalCorrectionPipelineSha256':sharp['originalCorrectionPipelineSha256'],'diagnosticCorrectionPipelineSha256':sharp['patchedCorrectionPipelineSha256'],'frozenGoldenJsonSha256':sha(HERE.parent/'golden-cases.json'),'scripts':scripts,'binaryPolicy':'No kernels, .se1, SDK, NuGet packages or binaries are committed; hashes and URLs only.'})
    save('environment.json',{'schemaVersion':1,'diagnosticOnly':True,'auditBranch':'audit/natal-golden-reference','startingAuditHead':START,'os':platform.platform(),'pythonVersion':platform.python_version(),'originalSwissC':c,'sharp':sharp,'timeInput':'exact frozen birthUtc, no local/IANA conversion rerun','mappingSource':'scripts/frozen_mapping.py copied verbatim from ../tools/compare-ephemerides.py','mappingSha256':sha(HERE/'scripts/frozen_mapping.py'),'mmi':'blocked by actual access requirement; no chart result','productionModified':False,'installationModified':False,'sources':{'golden':'../golden-cases.json','officialWebAppEvidence':'../sharp-webapp/comparison.json','ephemerisManifest':'asset-hashes.json','dynamicCFrameBiasProof':'c-frame-bias-execution.json','installationVerification':'installation-verification.json'},'scopeLimit':'New Sharp groups measure Personality13 only; new C groups independently solve Design88 and measure26. No new Sharp Profile/Cross/Design claim.'})
    print('Captured environment, asset hashes and eight installation asset checks.')

if __name__=='__main__':main()
