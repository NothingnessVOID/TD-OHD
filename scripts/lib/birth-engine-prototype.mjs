/** Compatibility facade for existing CLI/validation consumers. Node runtime only. */
import { createEngineAPI } from '../../src/lib/engine/api.js';
import { createNativeEngineProviders } from './birth-engine-providers.mjs';
export { historicalEngineIdentity } from './birth-engine-providers.mjs';
export { normalizeChartInput as resolvePrototypeBirth } from '../../src/lib/engine/contract.js';

export class BirthEnginePrototype {
  constructor(options = {}) {
    this.native = createNativeEngineProviders(options);
    this.api = createEngineAPI(this.native.providers);
  }
  calculate(input, options) { return this.api.calculate(input, options); }
  // Read-only oracle tests share the identical mechanics host without astronomy duplication.
  mechanics(astronomy, birth) { return this.native.mechanics(astronomy, birth); }
  close() { return this.native.close(); }
}
