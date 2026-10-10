import { sha256Hex } from '../../lib/sha256.js';
import { ANNUAL_SIGNATURE } from './annual-signature.js';
import { verifyAnnualStructure } from './annual-events.js';

export function yearSegments(start, end) {
  const segments = [];
  let cursor = start;
  while (cursor < end) {
    const year = new Date(cursor).getUTCFullYear();
    const next = Math.min(end, Date.UTC(year + 1, 0, 1));
    segments.push({ year, start: cursor, end: next });
    cursor = next;
  }
  return segments;
}

/** Validated public data, shared across requests and independent of person. */
export function createAnnualLoader({ fetcher = fetch, base = import.meta.env?.BASE_URL || './',
  capacity = 3, capacityBytes = 1_000_000 } = {}) {
  const cache = new Map();
  const pending = new Map();
  let cachedBytes = 0;
  let manifestPromise;
  const asset = path => new URL(`${base}transit-data/${path}`, globalThis.location?.href || 'http://localhost/').href;
  async function manifest() {
    manifestPromise ||= fetcher(asset('manifest.json'), { cache: 'no-cache' }).then(async response => {
      if (!response.ok) throw new Error(`Manifest HTTP ${response.status}`);
      const value = await response.json();
      if (value.format !== 1 || value.signature !== ANNUAL_SIGNATURE) throw new Error('Calculation signature mismatch');
      return value;
    }).catch(error => { manifestPromise = null; throw error; });
    return manifestPromise;
  }
  async function load(year) {
    if (cache.has(year)) {
      const value = cache.get(year);
      cache.delete(year); cache.set(year, value);
      return value.data;
    }
    if (pending.has(year)) return pending.get(year);
    const promise = (async () => {
      const entry = (await manifest()).years[year];
      if (!entry) throw new Error(`No annual file for ${year}`);
      const response = await fetcher(asset(entry.path), { cache: 'force-cache' });
      if (!response.ok) throw new Error(`Annual HTTP ${response.status}`);
      const bytes = await response.arrayBuffer();
      if (bytes.byteLength !== entry.bytes) throw new Error('Annual byte count mismatch');
      const actual = await sha256Hex(bytes);
      if (actual !== entry.sha256) throw new Error('Annual hash mismatch');
      const data = JSON.parse(new TextDecoder().decode(bytes));
      if (data.signature !== ANNUAL_SIGNATURE || data.year !== year) throw new Error('Annual signature/year mismatch');
      verifyAnnualStructure(data);
      cache.set(year, { data, bytes: bytes.byteLength });
      cachedBytes += bytes.byteLength;
      while (cache.size > capacity || cachedBytes > capacityBytes) {
        const oldest = cache.keys().next().value;
        cachedBytes -= cache.get(oldest).bytes;
        cache.delete(oldest);
      }
      return data;
    })().finally(() => pending.delete(year));
    pending.set(year, promise);
    return promise;
  }
  return {
    load,
    async loadRange(start, end) {
      const segments = yearSegments(start, end);
      const data = await Promise.all(segments.map(async segment => {
        try { return await load(segment.year); }
        catch (error) { return { unavailable: error.message }; }
      }));
      return segments.map((segment, index) => ({ ...segment, data: data[index] }));
    },
    clear() { cache.clear(); cachedBytes = 0; pending.clear(); manifestPromise = null; },
    cachedYears() { return [...cache.keys()]; },
    cachedBytes() { return cachedBytes; }
  };
}
