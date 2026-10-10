import {execFileSync} from 'node:child_process';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
const baseline='cb29ace095f86f1215ded44a6945a8a4b0c66935';
/** Build the unchanged production engine independently on the same platform.
 * Linux keeps the original recorded Sharp baseline. Windows libm finite differences
 * are compared to this pinned production source, never to the candidate's output.
 */
export function windowsSwissBaseline(requests, ephemeris) {
 const dir=mkdtempSync(path.join(tmpdir(),'ohd-swiss-baseline-'));
 try {
  const archive=execFileSync('git',['archive',baseline,'engine-core','third_party/SharpAstrology.SwissEph','docs/sharp-swiss-parity-fix/scripts/parity-harness'],{cwd:path.resolve(import.meta.dirname,'../..'),maxBuffer:32*1024*1024});
  execFileSync('tar',['-xf','-','-C',dir],{input:archive});
  const project=path.join(dir,'docs/sharp-swiss-parity-fix/scripts/parity-harness');
  execFileSync(process.env.DOTNET||'dotnet',['build',path.join(project,'ParityHarness.csproj'),'-c','Release','-v','quiet','-m:1'],{stdio:'pipe'});
  return execFileSync(process.env.DOTNET||'dotnet',[path.join(project,'bin/Release/net10.0/SharpAstrology.SwissEphemerides.IntegrationTests.dll'),ephemeris],{input:requests,encoding:'utf8'}).trim().split('\n').map(JSON.parse);
 } finally { rmSync(dir,{recursive:true,force:true}); }
}
