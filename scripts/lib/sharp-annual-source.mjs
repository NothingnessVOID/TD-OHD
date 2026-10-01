import { SharpNativeClient } from './sharp-native-client.mjs';

/** Bounded minute prefetch; refined boundaries use the same native Sharp context. */
export function createAnnualSource(start, end, batchSize = 4096) {
  const client = new SharpNativeClient();
  let block = new Map();
  const refinements = new Map();
  return {
    client,
    async snapshot(time) {
      if (block.has(time)) return block.get(time);
      if (refinements.has(time)) return refinements.get(time);
      if ((time - start) % 60000 === 0) {
        const times = Array.from({ length: Math.min(batchSize, Math.floor((end - time) / 60000) + 1) }, (_, index) => time + index * 60000);
        const values = await client.batch(times);
        block = new Map(times.map((instant, index) => [instant, values[index].activations]));
        refinements.clear();
        return block.get(time);
      }
      const value = (await client.snapshot(time)).activations;
      refinements.set(time, value);
      return value;
    }
  };
}
