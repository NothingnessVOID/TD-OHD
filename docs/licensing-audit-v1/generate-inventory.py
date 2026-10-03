#!/usr/bin/env python3
"""Inventory the pinned baseline and installed build metadata; no production writes."""
import collections, hashlib, json, pathlib, re, subprocess, xml.etree.ElementTree as ET
ROOT = pathlib.Path(__file__).resolve().parents[2]
OUT = ROOT / 'docs/licensing-audit-v1'
BASE = '1add60c36b469e0d5dc84bd7ca38b0984a446363'
def readj(p): return json.loads(p.read_text())
def sha(b): return hashlib.sha256(b).hexdigest()
def git(*args): return subprocess.check_output(['git', '-c', 'core.quotepath=false', *args], cwd=ROOT)
upstream = readj(OUT/'evidence/open-human-design-paths.json')
upaths = {x['path']: x['sha'] for x in upstream['files']}
browsers = readj(OUT/'evidence/browser-sources.json')
bpaths = {s.removeprefix('../../') for s in browsers if s.startswith('../../')}
patch = readj(ROOT/'third_party/SharpAstrology.SwissEph/patch-manifest.json')
pchanged = {x['file'] for x in patch['changedFiles']}
adapted = {'src/lib/gene-keys.js','src/lib/transit-analysis.js','src/lib/profile-storage.js','src/lib/timezone.js','src/lib/human-design/catalog.js','src/lib/human-design/english-readings.js','src/lib/human-design/connection.js','src/lib/human-design/penta.js','src/lib/human-design/svg-renderer.js'}
items=[]
def item(path,component,origin,author,version,license,modified,distributed,browser,build,source,notice,concern,evidence,**extra):
 r={'path':path,'component':component,'origin':origin,'author_upstream':author,'version':version,'license':license,'modified':modified,'distributed':distributed,'included_in_browser':browser,'included_in_build':build,'source_available':source,'notice_required':notice,'known_compatibility_concern':concern,'evidence':evidence};r.update(extra);items.append(r);return r
# Git index object ids give a complete, deterministic file list without following symlinks or account files.
for line in git('ls-tree','-r',BASE).decode().splitlines():
 meta,p=line.split('\t'); oid=meta.split()[-1]; b=(ROOT/p).read_bytes()
 text=b[:12000].decode('utf8',errors='replace'); ext=pathlib.Path(p).suffix.lower()
 browser=p in bpaths or p=='index.html' or p.startswith('public/')
 build=browser or p.startswith(('engine-core/','engine-wasm/','third_party/SharpAstrology.SwissEph/'))
 version='baseline '+BASE; license='NOASSERTION'; notice='review'; modified='unknown'; concern='Ownership and third-party embedded material need review before a permissive release.'
 author='TD-OHD contributors; individual ownership not independently established'; origin='TD-OHD added material; original-author candidate, not an ownership finding'; component='TD-OHD original candidates'; evidence=['pinned Git baseline', 'path classification; no blanket original-code claim']
 if p.startswith('third_party/SharpAstrology.SwissEph/'):
  rel=p.split('third_party/SharpAstrology.SwissEph/',1)[1]; modified=rel in pchanged
  origin='CReizner C# Swiss port'+('; TD-OHD modifications' if modified else ''); author='Christian Reizner / Astrodienst source lineage / TD-OHD patch contributors'; version='0.5.1@342a57997c1b987e7949acc98897c8b73d05939a'; license='AGPL-3.0; Swiss dual-license notices';notice=True;component='TD-OHD modifications to AGPL port' if modified else 'SharpAstrology.SwissEph'; browser='compiled library; per-file trimming not established';build=True;concern='Combined-distribution copyleft and corresponding-source obligations; not MIT-relicensable by TD-OHD.';evidence=['third_party/SharpAstrology.SwissEph/LICENSE.AGPL-3.0.txt','third_party/SharpAstrology.SwissEph/LICENSE.SwissEph.txt','third_party/SharpAstrology.SwissEph/patch-manifest.json']
 elif p in {'src/lib/human-design/bodygraph-geometry.js','src/lib/bodygraph-integration.js'}:
  origin='jdempcy/hdkit geometry via NatalEngine; TD-OHD adaptation';author='Jonah Dempcy / Unforced Dev / TD-OHD';version='NatalEngine 1.6.0 provenance; hdkit geometry revision not pinned';license='MIT';modified=True;notice=True;component='hdkit MIT geometry';concern='Retain Jonah Dempcy and Unforced Dev notices; adaptation does not transfer upstream copyright.';evidence=['THIRD_PARTY_NOTICES.md', 'source attribution headers']
 elif p in adapted:
  origin='Unforced Dev NatalEngine data/mechanics adaptation';author='Unforced Dev / TD-OHD';version='NatalEngine 1.6.0';license='MIT';modified=True;notice=True;component='TD-OHD modifications to upstream MIT code';concern='Retain upstream MIT notice; any new embedded reference text/data needs separate provenance.';evidence=['THIRD_PARTY_NOTICES.md', 'source attribution headers']
 elif p in upaths:
  modified=oid!=upaths[p];origin='Unforced-Dev/open-human-design inherited path'+('; TD-OHD changes / upstream drift' if modified else '; byte-identical to inspected upstream');author='Unforced Dev / TD-OHD contributors';version='upstream comparison '+upstream['commit'];license='MIT (upstream README declaration; complete project copyright notice needs confirmation)';notice=True;component='TD-OHD modifications to upstream MIT code' if modified else 'OpenHumanDesign inherited MIT';concern='Path match establishes inherited lineage candidate; current upstream drift means hash differences alone do not assign authorship.';evidence=['evidence/open-human-design-paths.json','upstream pinned README License section']
 if p.startswith('docs/') or p.startswith('tests/') or p.startswith('public/transit-data/'):
  component='generated / test / research evidence';origin='TD-OHD reports, tests, generated data or embedded external evidence';concern='Reports/test logic may be original; copied fixtures, reference images, prose and numerical inputs have separate rights. Public access is not a redistribution grant.';evidence+=['file-level copyright/SPDX scan; dataset provenance remains case-specific']
 if p.startswith('worker/fonts/'):
  component='Inter font';origin='Inter font embedded in inherited worker';author='Inter Project Authors';version='exact binary version not extracted';license='OFL-1.1 (upstream; confirm exact font metadata)';modified='unknown';notice=True;browser=False;build='worker build only; not static browser deployment';concern='Retain OFL notice; font cannot be blanket-relicensed MIT.';evidence=['https://raw.githubusercontent.com/rsms/inter/master/LICENSE.txt']
 if p.startswith('jovian-engine/'):
  component='TD-OHD Jovian wrapper / tooling';origin='TD-OHD locally authored bridge/tooling candidate';modified='not upstream Swiss replacement';version='Jovian prototype V1';browser=False;build='local prototype only';concern='Wrapper authorship does not relicense linked Swiss C, compressed data or combined prototype.';evidence=['jovian-engine/native-assets.json','docs/jovian-compatible-engine/license-audit.md']
 if p in {'src/features/transit-timeline/line-fixing-data.js'}:
  component='SharpAstrology.HumanDesign derived display data';origin='generated from HumanDesign MIT mapping';author='Christian Reizner / TD-OHD';version='HumanDesign 1.2.0';license='MIT';modified='generated';notice=True;concern='Retain HumanDesign MIT attribution';evidence=['file header','engine-wasm/licenses/SharpAstrology.HumanDesign-MIT.txt']
 if p.startswith(('local/','worker/')) and not p.startswith('worker/fonts/'):
  browser=False;build='local service or worker only; excluded from static browser runtime'
 if p.startswith(('scripts/','engine-tools/','jovian-engine/')) and not p.startswith('jovian-engine/mechanics/'):
  browser=False;build='tooling / validation only'
 if ext in {'.png','.jpg','.jpeg','.pdf','.ttf','.svg'} and license=='NOASSERTION':
  origin='asset or copied evidence; provenance unverified';author='not established';concern='Do not label original or MIT until source and redistribution grant are identified.'
 declarations=re.findall(r'(?im)^.{0,8}(?:SPDX-License-Identifier:|Copyright|MIT [Ll]icense|Licensed under).{0,180}',text)
 item(p,component,origin,author,version,license,modified,True,browser,build,True,notice,concern,evidence,git_blob=oid,sha256=sha(b),bytes=len(b),license_header_candidates=declarations[:5])
lock=readj(ROOT/'package-lock.json')
for p,v in lock['packages'].items():
 if not p: continue
 installed=ROOT/p/'package.json';m=readj(installed) if installed.exists() else {};name=v.get('name') or p.split('node_modules/')[-1]; browser=any(s.startswith(p+'/') for s in bpaths)
 lic=v.get('license') or m.get('license') or 'NOASSERTION';repo=m.get('repository');author=m.get('author') or repo or 'upstream package authors; see package source'
 r=item(p,name,v.get('resolved') or 'npm lock record',author,v.get('version'),lic,False,'browser static bundle' if browser else 'dependency source distributed only through installation; worker/tooling conditional',browser,'installed build dependency' if installed.exists() else 'optional platform dependency; not installed here',m.get('repository') or 'package tarball/source not individually verified',True,'Preserve applicable notices; LGPL/MPL/Apache packages need component-specific handling if redistributed.' if any(x in str(lic) for x in ['LGPL','MPL','Apache']) else 'MIT-style notice retention; final distribution boundary still applies.',['package-lock.json', p+'/package.json' if m else 'lockfile declaration only'],dev=v.get('dev',False),optional=v.get('optional',False),integrity=v.get('integrity'),scope='npm dependency')
 if 'license' not in v:r['evidence'].append('license missing from lock; installed package metadata used' if m.get('license') else 'missing license unresolved')
assets=readj(ROOT/'engine-wasm/obj/project.assets.json')
for key,v in assets['libraries'].items():
 name,version=key.rsplit('/',1)
 if v['type']=='project':continue
 pkg=pathlib.Path.home()/'.nuget/packages'/name.lower()/version;nuspec=pkg/(name.lower()+'.nuspec');lic='NOASSERTION';author='Microsoft / .NET Foundation' if name.startswith(('Microsoft','System')) else 'Christian Reizner';repo=None
 if nuspec.exists():
  root=ET.fromstring(nuspec.read_text(encoding='utf-8-sig'));ns={'n':'http://schemas.microsoft.com/packaging/2013/05/nuspec.xsd'}
  for e in root.iter():
   if e.tag.split('}')[-1]=='license':lic=e.text
   if e.tag.split('}')[-1]=='repository':repo=e.attrib
 browser=name in {'SharpAstrology.Base','SharpAstrology.HumanDesign','System.Numerics.Tensors'}
 item('NuGet/'+key,name,repo or 'NuGet exact restored package',author,version,lic,False,'browser object code' if browser else 'build tool only',browser,True,'repository available; exact source correspondence needs archive review',True,'Base MIT notice currently absent from distributed engine notice folder' if name=='SharpAstrology.Base' else 'Retain license and any runtime third-party notices.', ['engine-wasm/obj/project.assets.json','exact .nuspec license metadata'],scope='NuGet dependency')
manifest=readj(ROOT/'engine-wasm/ephemeris-manifest.json')
for name,h in manifest['files'].items():
 item('public/engine/ephe/'+name,'Swiss modern compressed DE441','aloistr/swisseph@'+manifest['commit'],'Astrodienst AG', 'DE441, 1800–2399','Swiss dual AGPL / Professional data terms; not plain JPL public data',False,True,True,True,'compressed data available; underlying generation source not fully audited',True,'Data redistribution must be covered by applicable Swiss license; not TD-OHD original or MIT.', ['engine-wasm/ephemeris-manifest.json','engine-wasm/licenses/Swiss-Ephemeris-LICENSE.txt'],sha256=h,scope='generated build asset')
for a in readj(ROOT/'jovian-engine/native-assets.json')['assets']:
 source=a['kind']=='source-archive';item('external-cache/'+a['name'],'Swiss 1.76 C' if source else 'DE406 compressed Swiss data',a['url'],'Astrodienst AG / Alois Treindl / Dieter Koch','1.76.00' if source else 'DE406 compressed','GPL-2.0-or-later OR Swiss Professional (actual C header)' if source else 'Astrodienst compressed data; historical redistribution terms require confirmation',False,False,False,'local native prototype only',True if source else 'data bytes available; no independent permissive data grant established',True,'External cache / IPC is not a license exemption. Resolve exact historical licensing before public distribution.', ['jovian-engine/native-assets.json','external sweph.c actual header' if source else 'exact file copyright header'],sha256=a['sha256'],scope='external prototype input')
item('external-cache/jovian-swiss176.dylib','Swiss 1.76 native combined binary','compiled original Swiss C + TD-OHD native_state.c','Astrodienst / TD-OHD','1.76.00 local build','GPL-2.0-or-later OR applicable Professional; wrapper has no declared license','original Swiss C plus own instrumentation',False,False,'local tooling/prototype',True,True,'Compiled Swiss code retains license; future browser WASM needs separate release gate.',['jovian-engine/prepare_native.py','external native-build.json'],scope='external prototype output')
item('browser _framework runtime','Microsoft .NET WASM and ICU runtime','Microsoft.NET 10.0.12 runtime pack','.NET Foundation / runtime third-party contributors','10.0.12','MIT plus runtime third-party notices and ICU/Unicode terms','unmodified runtime',True,True,True,'runtime repo available',True,'Audit runtime THIRD-PARTY-NOTICES and ICU license before complete release.',['evidence/live-config.json','https://github.com/dotnet/runtime/blob/main/THIRD-PARTY-NOTICES.TXT'],scope='framework component')
result={'schemaVersion':1,'auditDate':'2026-10-04','baseline':BASE,'rootLicense':{'LICENSE':False,'LICENSE.md':False,'packageLicense':lock['packages'][''].get('license'),'decisionMade':False},'scope':'All 959 tracked baseline files plus complete npm lock graph, restored WASM NuGet graph, generated Modern assets and external Jovian inputs; audit outputs intentionally excluded to avoid recursive inventory.','semantics':{'distributed':'Tracked source is publicly accessible; object-code/public-deployment facts stated separately.','unknown':'Unknown is deliberate; a path added in this fork does not establish copyright ownership.','included_in_browser':'Per-file source-map inclusion, copied static asset, or compiled component; trimmed third-party types cannot be inferred individually.','modified':'Upstream current-tree differences do not by themselves assign differences to TD-OHD.'},'counts':dict(collections.Counter(x.get('scope','tracked file') for x in items)),'componentCounts':dict(collections.Counter(x['component'] for x in items)),'items':items}
(OUT/'license-inventory.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n'); print(result['counts']);print(result['componentCounts'])
