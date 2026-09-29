/**
 * Chart computation — single funnel from birth data to engine output.
 */

import { calculateHumanDesign, calculateGeneKeys } from 'natalengine';

const chartCache = new Map();
const sensitivityCache = new Map();
// This cache lives only for the current app runtime. Bump this token when the
// pinned natal engine, hour adapter, or birth calculation rules change.
const CHART_CACHE_RULE = 'natalengine-1.6.0:minute-hour-v2:unknown-noon-v1';
const remember = (cache, key, value) => {
  cache.delete(key); cache.set(key, value);
  if (cache.size > 8) cache.delete(cache.keys().next().value);
  return value;
};
const effectiveBirthTime = birth => birth.timeUnknown ? '12:00' : birth.birthTime;
const calculationKey = birth => JSON.stringify([
  CHART_CACHE_RULE, birth.birthDate, effectiveBirthTime(birth), birth.timezone, Boolean(birth.timeUnknown)
]);

export function toDecimalHour(birthTime) {
  if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(birthTime || '')) {
    throw new RangeError('Birth time must use HH:MM; seconds are not supported');
  }
  const [hours, minutes] = birthTime.split(':').map(Number);
  return hours + minutes / 60;
}

/**
 * @param {object} birth - { birthDate, birthTime, timezone, name?, location? }
 * @returns {{ birth, chart, geneKeys }}
 */
export function computeChart(birth) {
  const decimalHour = toDecimalHour(effectiveBirthTime(birth));
  const key = calculationKey(birth);
  let data = chartCache.get(key);
  if (!data) {
    // The pinned engine's default Date constructor truncates fractional minutes.
    // Its patched precision path rounds the complete decimal hour to milliseconds.
    const chart = calculateHumanDesign(birth.birthDate, decimalHour, birth.timezone ?? 0, { preserveSeconds: true });
    data = remember(chartCache, key, { chart, geneKeys: calculateGeneKeys(chart) });
  }
  return { birth, ...data };
}

/**
 * Birth-time sensitivity check: recompute the chart at ±windowMinutes and
 * report which foundational elements would change. Honest accuracy framing —
 * the dominant real-world error source is birth-time uncertainty, and users
 * deserve to know how stable their chart is.
 *
 * @returns {{ stable: string[], shifts: string[] }}
 */
export function sensitivityCheck(birth, chart, windowMinutes = 15) {
  const cacheKey = `${calculationKey(birth)}:${windowMinutes}`;
  if (sensitivityCache.has(cacheKey)) return sensitivityCache.get(cacheKey);
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

  const decimal = toDecimalHour(effectiveBirthTime(birth));
  const shifted = new Set();
  for (const delta of [-windowMinutes / 60, windowMinutes / 60]) {
    const c = calculateHumanDesign(birth.birthDate, decimal + delta, birth.timezone ?? 0, { preserveSeconds: true });
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

  return remember(sensitivityCache, cacheKey, {
    stable: Object.keys(base).filter(k => !shifted.has(k)).map(k => labels[k]),
    shifts: [...shifted].map(k => labels[k])
  });
}
