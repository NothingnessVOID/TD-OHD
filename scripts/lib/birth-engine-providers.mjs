/** Node providers only. Do not import this module from the browser application. */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { SharpNativeClient } from './sharp-native-client.mjs';
import { SharedMechanicsClient } from './shared-mechanics-client.mjs';
import { adaptSharpChart } from '../../src/lib/chart-engine/sharp-contract.js';
import { ENGINE_IDENTITY, ENGINE_SIGNATURE } from '../../src/lib/chart-engine/engine-identity.js';
const root = path.resolve(import.meta.dirname, '../..');
const sha = value => createHash('sha256').update(value).digest('hex');

export function historicalEngineIdentity(astronomyIdentity) {
  const sharedFiles = ['jovian-engine/mechanics/Program.cs', 'jovian-engine/mechanics/JovianMechanics.csproj',
    'engine-core/TransitCore.cs', 'src/lib/chart-engine/sharp-contract.js', 'scripts/lib/birth-engine-prototype.mjs',
    'scripts/lib/birth-engine-providers.mjs', 'scripts/lib/shared-mechanics-client.mjs',
    'src/lib/engine/contract.js', 'src/lib/engine/api.js'];
  const sharedSourceHashes = Object.fromEntries(sharedFiles.map(file => [file, sha(readFileSync(path.join(root, file)))]));
  const identity = { ...astronomyIdentity, id: 'jovian-compatible', humanDesignVersion: '1.2.0', baseVersion: '0.14.0', contractVersion: 'chart-engine-v1', sharedSourceHashes };
  return { ...identity, astronomySignature: astronomyIdentity.engineSignature, engineSignature: sha(JSON.stringify(identity)) };
}

export function createNativeEngineProviders({ runtime = process.env.JOVIAN_RUNTIME,
  dotnet = process.env.DOTNET ?? 'dotnet', python = process.env.PYTHON ?? 'python3', epheRoot } = {}) {
  let modernClient, mechanicsClient;
  async function mechanics(astronomy, birth) {
    mechanicsClient ??= new SharedMechanicsClient(dotnet);
    // Keep the prototype's historical numeric clock label; no longitude resampling.
    const designUtc = new Date((astronomy.designModelUt1Jd ?? astronomy.designUtcJd ?? astronomy.designTtJd - (astronomy.designDeltaTDays ?? 0)) * 86400000 - 2440587.5 * 86400000).toISOString();
    return mechanicsClient.request({ birthUtc: birth.utc, designUtc, personality: astronomy.personality, design: astronomy.design });
  }
  const providers = {
    modern: Object.freeze({
      id: 'modern', runtime: 'node-native-modern',
      async calculate(birth) {
        modernClient ??= new SharpNativeClient({ dotnet, ...(epheRoot ? { epheRoot } : {}) });
        const raw = await modernClient.birth(birth.utc);
        return { input: birth, raw, chart: adaptSharpChart(raw, birth),
          engineIdentity: { id: 'modern', ...ENGINE_IDENTITY, signature: ENGINE_SIGNATURE, engineSignature: ENGINE_SIGNATURE } };
      }
    }),
    'jovian-compatible': Object.freeze({
      id: 'jovian-compatible', runtime: 'local-python-native',
      async calculate(birth) {
        if (!runtime || !existsSync(runtime)) throw new Error('Set JOVIAN_RUNTIME to the prepared external historical runtime');
        const julianDay = Date.parse(birth.utc) / 86400000 + 2440587.5;
        const astronomy = JSON.parse(execFileSync(python, [path.join(root, 'jovian-engine/native_backend.py'), '--runtime', runtime, '--utc-jd', String(julianDay)], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 }));
        const raw = await mechanics(astronomy, birth);
        const engineIdentity = historicalEngineIdentity(astronomy.identity);
        const chart = adaptSharpChart(raw, birth);
        chart.meta = { ...chart.meta, ephemeris: 'Swiss Ephemeris 1.76.00 / compressed DE406', engine: 'jovian-compatible', engineSignature: engineIdentity.engineSignature, timeSemantics: engineIdentity.timeSemantics, designClockMeaning: astronomy.designClockMeaning };
        return { input: birth, raw, chart, astronomy, engineIdentity };
      }
    })
  };
  return { providers: Object.freeze(providers), mechanics,
    async close() { await modernClient?.close(); await mechanicsClient?.close(); } };
}
