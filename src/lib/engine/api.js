/** Unified provider dispatch. Transport and platform dependencies stay in providers. */
import { ENGINE_IDS, normalizeChartInput, createChartResult } from './contract.js';

export function createEngineAPI(providers) {
  const calculate = async (input, { engine = 'modern' } = {}) => {
    if (engine === 'both') return {
      modern: await calculate(input, { engine: 'modern' }),
      jovianCompatible: await calculate(input, { engine: 'jovian-compatible' })
    };
    if (!ENGINE_IDS.includes(engine)) throw new RangeError(`Unknown engine: ${engine}`);
    const provider = providers[engine];
    if (!provider || provider.id !== engine) throw new Error(`Engine unavailable in this runtime: ${engine}`);
    const birth = normalizeChartInput(input);
    return createChartResult(await provider.calculate(birth), birth, engine);
  };
  return Object.freeze({ calculate });
}
