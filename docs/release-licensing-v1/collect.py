#!/usr/bin/env python3
"""Read built artifacts and public HTTP GET evidence; write release metadata only."""
import argparse,base64,hashlib,json,pathlib,re,subprocess,urllib.request,xml.etree.ElementTree as ET
ROOT=pathlib.Path(__file__).resolve().parents[2];OUT=ROOT/'docs/release-licensing-v1'
BASE='4cc718f2ba6aaadc74b3c4036a0191fa9791d657';URL='https://td-ohd.netlify.app'
sha=lambda b:hashlib.sha256(b).hexdigest()
def save(name,data): (OUT/name).write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
def fetch(url):return subprocess.check_output(['curl','--fail','--location','--silent','--show-error','--retry','3',url])
def config(b):return json.loads(b.decode().split('/*json-start*/',1)[1].split('/*json-end*/',1)[0])
def artifacts(c):
 return [dict(x,resourceGroup=k) for k,v in c['resources'].items() if isinstance(v,list) for x in v if isinstance(x,dict) and 'name' in x]
def package(name,version):
 p=pathlib.Path.home()/'.nuget/packages'/name.lower()/version;n=ET.parse(p/(name.lower()+'.nuspec')).getroot();ns={'n':'http://schemas.microsoft.com/packaging/2012/06/nuspec.xsd'};repo=n.find('.//n:repository',ns);lic=n.find('.//n:license',ns)
 return {'component':name,'version':version,'repository':repo.attrib if repo is not None else None,'license':lic.text if lic is not None else 'NOASSERTION','nuspecSha256':sha((p/(name.lower()+'.nuspec')).read_bytes()),'nupkgSha256':sha((p/(name.lower()+'.'+version+'.nupkg')).read_bytes())}
args=argparse.ArgumentParser();args.add_argument('--sourcemap-dir',required=True);a=args.parse_args()
framework=ROOT/'dist/engine/_framework';local=artifacts(config((framework/'dotnet.js').read_bytes()))
for x in local:
 p=framework/x['name'];x['path']='engine/_framework/'+x['name'];x['sha256']=sha(p.read_bytes());x['bytes']=p.stat().st_size
 if x.get('hash'):assert base64.b64decode(x['hash'].removeprefix('sha256-')).hex()==x['sha256']
liveconfig=config(fetch(URL+'/engine/_framework/dotnet.js'));live=[]
for x in artifacts(liveconfig):
 if x['name'].startswith(('Sharp','System.Numerics.Tensors','dotnet.native.','icudt_')):
  b=fetch(URL+'/engine/_framework/'+x['name']);x['sha256']=sha(b);x['path']='engine/_framework/'+x['name'];x['bytes']=len(b)
  if x.get('hash'):assert base64.b64decode(x['hash'].removeprefix('sha256-')).hex()==x['sha256']
  live.append(x)
modules=[]
for p in pathlib.Path(a.sourcemap_dir).glob('assets/*.map'):
 for s in json.loads(p.read_text())['sources']:
  # Strip every local absolute prefix before recording public evidence.
  if '/node_modules/' in s: modules.append('node_modules/'+s.split('/node_modules/',1)[1])
modules=sorted(set(modules));assert modules and all('/html-to-image/' in s for s in modules)
patch=json.loads((ROOT/'third_party/SharpAstrology.SwissEph/patch-manifest.json').read_text());ephe=json.loads((ROOT/'engine-wasm/ephemeris-manifest.json').read_text());assert patch['signature']=='59b90e629033cc7faf95'
licenses={str(p.relative_to(ROOT)):sha(p.read_bytes()) for p in sorted((ROOT/'engine-wasm/licenses').glob('*')) if p.is_file()}
packages=[package(n,v) for n,v in [('SharpAstrology.Base','0.14.0'),('SharpAstrology.HumanDesign','1.2.0'),('System.Numerics.Tensors','10.0.7'),('Microsoft.NETCore.App.Runtime.Mono.browser-wasm','10.0.12')]]
components=[]
def add(name,version,upstream,license,modified,source,prefixes,notices,data=False,notes=''):
 matches=[x for x in local if any(x['name'].startswith(p) for p in prefixes)];ls=[x for x in live if any(x['name'].startswith(p) for p in prefixes)]
 row={'component':name,'version':version,'upstream':upstream,'license':license,'modifiedByTdOhd':modified,'sourceLocation':source,'distributedArtifact':[x['path'] for x in matches], 'noticeLocation':notices,'includedInBrowser':True,'includedAtRuntime':True,'dataAsset':data,'sha256':{x['path']:x['sha256'] for x in matches},'liveArtifacts':ls,'scope':'runtime','notes':notes}
 components.append(row);return row
app=add('TD-OHD browser app','production@'+BASE,'https://github.com/NothingnessVOID/TD-OHD','NOASSERTION',True,['src/','index.html','package-lock.json'],[],['engine/THIRD_PARTY_NOTICES.md'],notes='Root/combined-release license not selected; inherited sources have separate notices. Vite is build tooling, not its entire npm dependency graph in runtime.')
app['distributedArtifact']=['assets/'+p.name for p in sorted((ROOT/'dist/assets').glob('*.js'))];app['sha256']={s:sha((ROOT/'dist'/s).read_bytes()) for s in app['distributedArtifact']}
for name,src in [('SharpChartEngine',['engine-wasm/Program.cs','engine-wasm/SharpChartEngine.csproj']),('SharpTransitCore',['engine-core/TransitCore.cs','engine-core/SharpTransitCore.csproj'])]:add(name,BASE,'https://github.com/NothingnessVOID/TD-OHD','NOASSERTION',True,src,[name+'.'],['engine/THIRD_PARTY_NOTICES.md'],notes='TD-OHD bridge/source snapshot; no new root license grant.')
for name,version,commit,lic,prefix in [('SharpAstrology.Base','0.14.0','b029ea0a57fabf84b0d0209aa8d6871b6e64a41c','MIT','SharpAstrology.Base'),('SharpAstrology.HumanDesign','1.2.0','8b78031ce9a4244b8eb0a4ce37e612b8d6782570','MIT','SharpAstrology.HumanDesign')]:
 add(name,version,'https://github.com/CReizner/'+name+'/tree/'+commit,lic,False,['NuGet/'+name+'/'+version], [prefix+'.'],['engine/licenses/'+name+'-MIT.txt'])
add('SharpAstrology.SwissEph','0.5.1@342a57997c1b987e7949acc98897c8b73d05939a','https://github.com/CReizner/SharpAstrology.SwissEph','AGPL-3.0 with Swiss Ephemeris notices',True,['third_party/SharpAstrology.SwissEph/'],['SharpAstrology.SwissEph.'],['engine/licenses/SharpAstrology.SwissEph-AGPL-3.0.txt','engine/licenses/SharpAstrology.SwissEph-SwissEph.txt'])
add('TD-OHD SwissEph parity patch',patch['identity']['patchRevision'],'https://github.com/NothingnessVOID/TD-OHD','AGPL-3.0 modified-port boundary',True,['third_party/SharpAstrology.SwissEph/patch-manifest.json'],['SharpAstrology.SwissEph.'],['engine/THIRD_PARTY_NOTICES.md'],notes='Provenance view of same assembly, not additional code payload; UTC/UT1, frame bias, Moon, True Node.')
add('System.Numerics.Tensors','10.0.7','https://github.com/dotnet/dotnet/tree/b16286c2284fecf303dbc12a0bb152476d662e44','MIT plus package third-party notices',False,['NuGet/System.Numerics.Tensors/10.0.7'],['System.Numerics.Tensors.'],['engine/licenses/System.Numerics.Tensors-MIT.txt','engine/licenses/System.Numerics.Tensors-THIRD-PARTY-NOTICES.txt'])
add('.NET WebAssembly runtime and framework','10.0.12','https://github.com/dotnet/dotnet/tree/95017c711e6afc1085133d440e42b4bd78155701','MIT plus package third-party notices',False,['Microsoft.NETCore.App.Runtime.Mono.browser-wasm/10.0.12'],['dotnet.','System.','Microsoft.','mscorlib.','netstandard.'],['engine/licenses/dotnet-runtime-MIT.txt','engine/licenses/dotnet-runtime-THIRD-PARTY-NOTICES.txt'],notes='Framework grouping overlaps Tensors provenance. Full package notices retained conservatively; not every listed dependency is asserted present.')
add('ICU/globalization data','ICU 68.2.0.9 / runtime-pack 10.0.12','https://github.com/dotnet/dotnet/tree/95017c711e6afc1085133d440e42b4bd78155701','Unicode/ICU and nested terms in pinned ICU LICENSE',False,['runtime-pack icudt*.dat'],['icudt_'],['engine/licenses/ICU-LICENSE.txt','engine/licenses/dotnet-runtime-THIRD-PARTY-NOTICES.txt'],True,notes='ICU source pin f3ce4639f5ad59da714912bb6209369d3fb2f5cd from dotnet runtime Version.Details.xml; bundled shard hashes match the runtime package.')
for name,h in ephe['files'].items():
 r=add('Modern '+name,'compressed DE441; 1800–2399',ephe['source']+'/tree/'+ephe['commit']+'/ephe','Swiss Ephemeris data notice; applicable AGPL/Professional route not selected here',False,['engine-wasm/ephemeris-manifest.json'],[],['engine/licenses/Swiss-Ephemeris-LICENSE.txt'],True)
 b=(ROOT/'dist/engine/ephe'/name).read_bytes();assert sha(b)==h;lb=fetch(URL+'/engine/ephe/'+name);assert sha(lb)==h;r['distributedArtifact']=['engine/ephe/'+name];r['sha256']={'engine/ephe/'+name:h};r['liveArtifacts']=[{'path':'engine/ephe/'+name,'sha256':h}]
add('html-to-image','1.11.13','https://github.com/bubkoo/html-to-image','MIT',False,['node_modules/html-to-image','package-lock.json'],[],['engine/licenses/html-to-image-MIT.txt'],notes='Measured in static sourcemaps; ten ES modules. Compiled into TD-OHD app JS, not a separate file.')['distributedArtifact']=app['distributedArtifact']
vite=json.loads((ROOT/'node_modules/vite/package.json').read_text());assert any('modulepreload' in p.read_text() and 'MutationObserver' in p.read_text() for p in (ROOT/'dist/assets').glob('*.js'))
add('Vite generated browser helpers',vite['version'],'https://github.com/vitejs/vite','MIT core; complete package notices retained',False,['node_modules/vite/dist/node/chunks: modulePreloadPolyfillPlugin / polyfill'],[],['engine/licenses/Vite-generated-helpers-LICENSE.txt'],notes='Observed modulepreload polyfill emitted into app JS. Only generated browser helper is a runtime component; Vite executable and its dependency graph are build tooling.')['distributedArtifact']=app['distributedArtifact']
for name,repo,ver in [('OpenHumanDesign inherited application','Unforced-Dev/open-human-design','upstream lineage; exact whole-app revision needs confirmation'),('NatalEngine static data/adaptations','Unforced-Dev/natalengine','1.6.0 static lineage; no runtime astronomy package'),('hdkit geometry','jdempcy/hdkit','via NatalEngine; exact geometry source revision needs confirmation')]:
 add(name,ver,'https://github.com/'+repo,'MIT upstream attribution; later additions not blanket relicensed',True,['THIRD_PARTY_NOTICES.md','src/lib/human-design/'],[],['engine/THIRD_PARTY_NOTICES.md'],notes='Inherited material compiled into app; origin view overlaps app grouping. Ownership/content rights remain separate.')['distributedArtifact']=app['distributedArtifact']
sources={p:sha(subprocess.check_output(['git','show',BASE+':'+p],cwd=ROOT)) for p in subprocess.check_output(['git','ls-tree','-r','--name-only',BASE],cwd=ROOT,text=True).splitlines() if p.startswith(('engine-core/','engine-wasm/','engine-tools/','third_party/SharpAstrology.SwissEph/','src/lib/chart-engine/')) and pathlib.Path(p).suffix in ['.cs','.csproj','.json','.js']}
identity={'schemaVersion':1,'repository':'NothingnessVOID/TD-OHD','releaseCommit':BASE,'calculationBaselineCommit':BASE,'licensingMetadataCommit':None,'licensingMetadataRef':'chore/release-licensing-cleanup-v1','licensingMetadataCommitResolution':'git log -1 --format=%H -- docs/release-licensing-v1/production-identity.json; self-referential commit SHA cannot be embedded in its own commit','engineSignature':patch['signature'],**patch['identity'],'relevantSourceHashes':sources,'ephemerisHashes':ephe['files'],'buildCommand':'npm ci && npm run build:pages','buildEnvironment':{'node':subprocess.check_output(['node','--version'],text=True).strip(),'sdk':subprocess.check_output([__import__('os').environ.get('DOTNET','dotnet'),'--version'],text=True).strip(),'runtime':'10.0.12'},'distributionLicensePaths':['engine/THIRD_PARTY_NOTICES.md']+['engine/licenses/'+pathlib.Path(p).name for p in licenses],'licenseSourceHashes':licenses,'packages':packages,'byteForByteReproducibility':'NOT CLAIMED; fingerprints/assembly bytes may differ by build environment'}
save('production-identity.json',identity);save('release-components.json',{'schemaVersion':1,'calculationBaselineCommit':BASE,'runtimeComponentCount':len(components),'semantics':'Component/provenance groups overlap; count is not unique assemblies or packages. Runtime-only inventory, not all devDependencies.','components':components});save('artifact-evidence.json',{'schemaVersion':1,'checkedAt':__import__('datetime').datetime.now(__import__('datetime').timezone.utc).isoformat(),'liveUrl':URL,'http':'public GET without cookies/session/auth','liveArtifacts':live,'localArtifacts':local,'browserNpmModuleSources':modules})
print('Wrote',len(components),'runtime component/provenance groups')
