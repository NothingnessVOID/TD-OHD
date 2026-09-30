/**
 * Chart computation — single funnel from birth data to engine output.
 */

import { chartEngine } from './chart-engine/index.js';
export { toDecimalHour } from './chart-engine/index.js';

const remember = (cache, key, value) => {
  cache.delete(key); cache.set(key, value);
  if (cache.size > 8) cache.delete(cache.keys().next().value);
  return value;
};

/**
 * The provider is injected so cache behavior can be tested without starting
 * the browser-only WASM runtime.
 */
export function createChartDataService(engine) {
  const chartCache = new Map();
  const sensitivityCache = new Map();
  async function computeChart(birth) {
    const key = engine.cacheKey(birth);
    let data = chartCache.get(key);
    if (!data) {
      data = remember(chartCache, key, engine.calculateBirth(birth));
    }
    try { return { birth, ...await data }; }
    catch (error) { chartCache.delete(key); throw error; }
  }

  /**
   * Birth-time sensitivity check: recompute the chart at ±windowMinutes and
   * report which foundational elements would change. Honest accuracy framing —
   * the dominant real-world error source is birth-time uncertainty, and users
   * deserve to know how stable their chart is.
   *
   * @returns {{ stable: string[], shifts: string[] }}
   */
  async function sensitivityCheck(birth, chart, windowMinutes = 15) {
    const cacheKey = `${engine.cacheKey(birth)}:${windowMinutes}`;
    if (sensitivityCache.has(cacheKey)) return sensitivityCache.get(cacheKey);
    const result = (async () => {
      const base = {
        type: chart.type.name,
        authority: chart.authority.name,
        profile: chart.profile.numbers,
        definition: chart.definition,
        cross: chart.incarnationCross?.gates?.join(','),
        variable: chart.variable?.notation,
        moon: `${chart.gates.personality.moon?.gate}.${chart.gates.personality.moon?.line}`
      };

      const labels = {
        type: 'Type', authority: 'Authority', profile: 'Profile',
        definition: 'Definition', cross: 'Incarnation Cross',
        variable: 'Variable', moon: 'Moon'
      };

      const shifted = new Set();
      for (const offsetMinutes of [-windowMinutes, windowMinutes]) {
        const c = await engine.calculateBirthAtOffset(birth, offsetMinutes);
        const probe = {
          type: c.type.name,
          authority: c.authority.name,
          profile: c.profile.numbers,
          definition: c.definition,
          cross: c.incarnationCross?.gates?.join(','),
          variable: c.variable?.notation,
          moon: `${c.gates.personality.moon?.gate}.${c.gates.personality.moon?.line}`
        };
        for (const key of Object.keys(base)) {
          if (probe[key] !== base[key]) shifted.add(key);
        }
      }

      return {
        stable: Object.keys(base).filter(k => !shifted.has(k)).map(k => labels[k]),
        shifts: [...shifted].map(k => labels[k])
      };
    })();
    remember(sensitivityCache, cacheKey, result);
    try { return await result; }
    catch (error) { sensitivityCache.delete(cacheKey); throw error; }
  }
  return { computeChart, sensitivityCheck };
}

export const { computeChart, sensitivityCheck } = createChartDataService(chartEngine);
