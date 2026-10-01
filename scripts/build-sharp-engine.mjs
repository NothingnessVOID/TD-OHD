import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(readFileSync(path.join(root, 'engine-wasm/ephemeris-manifest.json'), 'utf8'));
const target = path.join(root, 'public/engine');
const ephe = path.join(target, 'ephe');
const dotnet = process.env.DOTNET || 'dotnet';

// Prepare the shared native audit tool before concurrent Node test processes start.
execFileSync(dotnet, ['build', 'engine-tools/SharpTransitGenerator.csproj', '-c', 'Release', '-v', 'quiet'], {
  cwd: root, stdio: 'inherit', env: { ...process.env, DOTNET_CLI_TELEMETRY_OPTOUT: '1' }
});

execFileSync(dotnet, ['publish', 'engine-wasm/SharpChartEngine.csproj', '-c', 'Release', '-v', 'quiet'], {
  cwd: root, stdio: 'inherit', env: { ...process.env, DOTNET_CLI_TELEMETRY_OPTOUT: '1' }
});
rmSync(path.join(target, '_framework'), { recursive: true, force: true });
mkdirSync(target, { recursive: true });
cpSync(path.join(root, 'engine-wasm/bin/Release/net10.0/publish/wwwroot'), target, { recursive: true });
cpSync(path.join(root, 'engine-wasm/licenses'), path.join(target, 'licenses'), { recursive: true });
cpSync(path.join(root, 'THIRD_PARTY_NOTICES.md'), path.join(target, 'THIRD_PARTY_NOTICES.md'));
mkdirSync(ephe, { recursive: true });
for (const name of readdirSync(ephe)) {
  if (!(name in manifest.files)) rmSync(path.join(ephe, name), { force: true });
}

function isVerified(file, expected) {
  return existsSync(file) && createHash('sha256').update(readFileSync(file)).digest('hex') === expected;
}

for (const [name, sha256] of Object.entries(manifest.files)) {
  const file = path.join(ephe, name);
  if (isVerified(file, sha256)) continue;
  const url = `https://raw.githubusercontent.com/aloistr/swisseph/${manifest.commit}/ephe/${name}`;
  execFileSync('curl', ['--fail', '--location', '--silent', '--show-error', '--retry', '3', url, '--output', file], { stdio: 'inherit' });
  if (!isVerified(file, sha256)) {
    rmSync(file, { force: true });
    throw new Error(`Swiss ephemeris checksum failed: ${name}`);
  }
}
console.log(`SharpAstrology WASM and ${Object.keys(manifest.files).length} verified Swiss ephemeris files are ready.`);
