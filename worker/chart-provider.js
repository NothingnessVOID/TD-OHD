/** Optional edge handlers receive an explicit host Sharp adapter.
 * The deployed static application calculates in browser WASM; this module does
 * not start a server engine, fetch an astronomy API, or provide a fallback.
 */
export async function calculateHumanDesign(date, hour, timezone, engine) {
  if (!engine?.calculateBirth) throw new Error('A host SharpAstrology + file Swiss adapter is required for edge chart computation. Open the static application to calculate locally.');
  return engine.calculateBirth(date, hour, timezone);
}

export async function calculateHDTransits(chart, date, engine) {
  if (!engine?.calculateTransit) throw new Error('A host SharpAstrology + file Swiss transit adapter is required.');
  const { analyzeTransitActivations } = await import('../src/lib/transit-analysis.js');
  return analyzeTransitActivations(chart, await engine.calculateTransit(`${date}T12:00:00Z`));
}

export async function calculateAstrology(date, hour, timezone, lat, lon, engine) {
  if (!engine?.calculateAstrology) throw new Error('The optional astrology edge tool requires an explicit host Sharp astrology adapter.');
  return engine.calculateAstrology(date, hour, timezone, lat, lon);
}
