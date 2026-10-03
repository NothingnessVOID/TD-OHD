# Engine contract

Executable contract: `src/lib/engine/contract.js`; dispatch: `src/lib/engine/api.js`. Version: `chart-engine-v1`. Engine IDs: `modern` and `jovian-compatible`.

## Provider interface

```js
const api = createEngineAPI({
  modern: { id: 'modern', async calculate(normalizedInput) { /* runtime adapter */ } },
  'jovian-compatible': {
    id: 'jovian-compatible', async calculate(normalizedInput) { /* runtime adapter */ }
  }
});
const result = await api.calculate({ utc: '1994-07-12T04:56:37Z' });
const pair = await api.calculate({ utc: '1994-07-12T04:56:37Z' }, { engine: 'both' });
```

`calculate(input, { engine = 'modern' })` normalizes input, selects an explicitly registered provider and validates its result. Unknown IDs, unavailable providers, invalid input and malformed results reject. `both` yields two independent values under `modern` and `jovianCompatible`. The API does not create a calculation cache or own native-process cleanup. `createNativeEngineProviders(options)` returns `{ providers, mechanics, close }`; the compatibility facade owns this lifetime and closes both clients.

## ChartInput

| Input form | Fields | Behavior |
| --- | --- | --- |
| Absolute instant | `utc` or `birthUtc`, or ISO string shorthand | Requires `Z` or explicit numeric zone, normalizes to canonical UTC ISO. |
| Civil date/time | `date` / `birthDate`, `time` / `birthTime` | Requires valid calendar date and `HH:MM` or `HH:MM:SS`. |
| IANA resolution | `timeZone`, `location.timeZone`, or existing `location.iana` | Uses the existing `transitInstants` resolver, rejects DST gap, chooses fold `0` by default; explicit `fold: 1` selects the second valid instant. |
| Offset resolution | `timezone` or `offset` | Numeric hours, finite and within the contract's ±24 bound; used when no IANA zone is supplied. Existing UI's narrower validation remains unchanged. |
| Unknown time | `timeUnknown: true` | Civil input uses existing noon convention; precision defaults to `unknown`. An explicitly supplied absolute instant remains authoritative. |
| Precision | `minute`, `second`, `millisecond`, `unknown` | Explicit value or inferred from source input. Metadata only; never rounds/truncates or changes resolved UTC. |
| Location | Optional original `location` context | Carries resolved timezone and provenance. Coordinates or a city string alone cannot resolve UTC; application geocoding must first supply IANA zone or offset. |

Normalized input retains `utc`, `birthDate`, `birthTime`, numeric `timezone`, optional `timeZone`, `precision`, `timeUnknown`, and `location`. Absolute-only input retains fractional milliseconds in `utc`; its compatibility `birthTime` field is the UTC seconds label. Reusing a normalized input preserves its supplied civil display context after checking agreement with UTC at its seconds representation; disagreement of at least one second is rejected. This keeps normalization idempotent and preserves local labels in cache context. JavaScript `Date` limits canonical instants to millisecond representation. Civil fractional seconds and leap-second notation are not newly supported here. Precision does not claim greater measurement certainty or alter the backend root solver.

Place resolution stays in the existing location/entry flow. There is no longitude-based true-solar-time correction or new geocoding service in the engine. Resolved IANA timezone accounts for civil-clock rules through the existing timezone resolver.

## ChartResult

The common envelope is `{ input, raw, chart, engineIdentity, engineId, contractVersion }`. Jovian also retains `astronomy`; provider-specific diagnostic metadata is permitted. Existing `raw` / `chart` objects remain available to current consumers.

| Requirement | Canonical field |
| --- | --- |
| Personality 13 / Design 13 | `raw.personality`, `raw.design`, indexed by `BODY_ORDER`: Sun, Earth, Moon, North/South Node, Mercury, Venus, Mars, Jupiter, Saturn, Uranus, Neptune, Pluto using existing camel-case keys. |
| Gate, Line, Color, Tone, Base | Each raw activation's `gate` (1–64), `line`, `color`, `tone` (1–6), `base` (1–5), plus finite authoritative `longitude`. |
| Type | `raw.type`; existing presentation object `chart.type`. |
| Strategy | Existing `chart.type.strategy`, validated as string; no extra astronomy or independent strategy calculation. |
| Authority / Definition / Profile | `raw.authority`, `raw.definition`, `raw.profile`; existing app objects/labels remain in `chart`. |
| Cross | `raw.incarnationCross`; app object `chart.incarnationCross`. |
| Channels / Centers | `raw.channels` / `raw.centers`; app adaptation retained in `chart.channels` / `chart.centers`. |
| Identity | `engineIdentity.id` equals selected engine; `engineIdentity.engineSignature` must be nonempty. |

`createChartResult` checks each side has exactly 13 expected bodies, finite longitudes, integer activation fields within range, required mechanics strings, channels array, centers and strategy. It wraps/validates existing results; it does not recalculate HD mechanics. Authoritative raw longitudes are preserved. Existing presentation-derived positions remain display fields.

## Time semantics and identity

Modern keeps its current UTC→TT/UT1 semantics and production signature `59b90e629033cc7faf95`. The local Modern envelope also retains the former `signature` alias and adds common `engineSignature`.

Jovian retains legacy UTC-as-UT1 semantics, original Swiss 1.76.00 / DE406 astronomy identity, exact TT Design root and the explicitly qualified historical inverse numeric UT1 Design clock. Its identity includes shared-host/serializer/adapter/interface source hashes. Extracting those wrappers changes the full integration signature; the astronomical signature and numerical outputs must remain unchanged. This is expected identity invalidation, not a changed ephemeris result.

## Cache rule

`engineCacheKey(identity, input)` validates identity and returns a JSON key containing contract version, **engine id and engine signature**, normalized UTC, civil presentation context, timezone, precision, unknown-time flag and location. It creates no cache. Presentation context prevents reusing an envelope with the wrong local labels even when absolute UTC matches.

Any future cache must include both engine ID and signature. Results from Modern and Jovian cannot share an undifferentiated calculation key. The existing production cache remains bound solely to the existing Modern provider and its current signature; this round does not migrate it.
