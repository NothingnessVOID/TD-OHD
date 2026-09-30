import { calculateGeneKeys } from 'natalengine';
import { adaptSharpChart } from './sharp-contract.js';
import { toDecimalHour } from './birth-time.js';

const cacheRule = 'sharp-hd-1.2.0:sharp-swiss-0.5.1:swiss-files:adapter-v1';
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
    return { calculate: exports.SharpChartEngine.Bridge.CalculateBirthChart, assetBase };
  })().catch(error => { initialization = undefined; throw error; });
}

async function calculate(birth, offsetMinutes = 0) {
  const utc = utcInstant(birth, offsetMinutes);
  const { calculate: run, assetBase } = await initializeEngine();
  const raw = JSON.parse(await run(utc, assetBase));
  return adaptSharpChart(raw, birth);
}

export const sharpProvider = Object.freeze({
  id: 'sharpastrology-swiss', version: '1.2.0+0.5.1', cacheRule,
  cacheKey(birth) {
    utcInstant(birth);
    return JSON.stringify([cacheRule, birth.birthDate, effectiveTime(birth), birth.timezone, Boolean(birth.timeUnknown)]);
  },
  async calculateBirth(birth) {
    const chart = await calculate(birth);
    return { chart, geneKeys: calculateGeneKeys(chart) };
  },
  calculateBirthAtOffset: calculate
});
