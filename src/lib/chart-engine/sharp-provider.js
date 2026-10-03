import { ENGINE_SIGNATURE } from './engine-identity.js';
import { calculateGeneKeys } from '../gene-keys.js';
import { adaptSharpTransit } from './sharp-transit-contract.js';
import { adaptSharpChart } from './sharp-contract.js';
import { toDecimalHour } from './birth-time.js';

const cacheRule = `sharp:${ENGINE_SIGNATURE}:adapter-v1`;
const effectiveTime = birth => birth.timeUnknown ? '12:00' : birth.birthTime;
let initialization;

function utcInstant(birth, offsetMinutes = 0) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birth.birthDate || '')) throw new RangeError('Invalid birth date');
  const time = effectiveTime(birth);
  toDecimalHour(time);
  const timestamp = Date.parse(`${birth.birthDate}T${time}:00Z`);
  if (!Number.isFinite(timestamp) || new Date(timestamp).toISOString().slice(0, 10) !== birth.birthDate)
    throw new RangeError('Invalid birth date');
  const utc = new Date(timestamp - (birth.timezone ?? 0) * 3_600_000 + offsetMinutes * 60_000);
  return utc.toISOString();
}

export function initializeEngine() {
  return initialization ??= (async () => {
    const assetBase = new URL('engine/', document.baseURI).href;
    const { dotnet } = await import(/* @vite-ignore */ `${assetBase}_framework/dotnet.js`);
    const runtime = await dotnet.create();
    const exports = await runtime.getAssemblyExports(runtime.getConfig().mainAssemblyName);
    await runtime.runMain();
    const bridge = exports.SharpChartEngine.Bridge;
    return { calculate: bridge.CalculateBirthChart, transit: bridge.CalculateTransit,
      transitBatch: bridge.CalculateTransitBatch, assetBase };
  })().catch(error => { initialization = undefined; throw error; });
}

async function calculate(birth, offsetMinutes = 0) {
  const utc = utcInstant(birth, offsetMinutes);
  const { calculate: run, assetBase } = await initializeEngine();
  const raw = JSON.parse(await run(utc, assetBase));
  return adaptSharpChart(raw, birth);
}

export const sharpProvider = Object.freeze({
  id: 'sharpastrology-swiss', version: '1.2.0+0.5.1+td-ohd-swiss-parity-v1', cacheRule,
  cacheKey(birth) {
    utcInstant(birth);
    return JSON.stringify([cacheRule, birth.birthDate, effectiveTime(birth), birth.timezone, Boolean(birth.timeUnknown)]);
  },
  async calculateBirth(birth) {
    const chart = await calculate(birth);
    return { chart, geneKeys: calculateGeneKeys(chart) };
  },
  calculateBirthAtOffset: calculate,
  async calculateTransitSnapshot(instant) {
    const utc = new Date(instant).toISOString();
    const { transit, assetBase } = await initializeEngine();
    return adaptSharpTransit(JSON.parse(await transit(utc, assetBase))).gates;
  },
  async calculateTransitSnapshots(instants) {
    const timestamps = instants.map(instant => new Date(instant).toISOString());
    const { transitBatch, assetBase } = await initializeEngine();
    return JSON.parse(await transitBatch(JSON.stringify(timestamps), assetBase)).map(value => adaptSharpTransit(value).gates);
  }
});
