# Jovian-Compatible Engine V1 architecture

This prototype adds an independently callable historical astronomy backend. Its compatibility basis is C2: Swiss Ephemeris 1.76.00, Astrodienst compressed DE406, historical defaults, and numeric UTC Julian Date supplied to the historical UT call. Compatibility evidence does not prove the implementation used internally by Jovian Archive.

## Baseline inspected

The production browser entry is `engine-wasm/Program.cs`, `Bridge.CalculateBirthChart`. It creates the patched Modern `SwissEphemeridesService` context, calculates the solar 88-degree Design root through `DesignJulianDay`, constructs `HumanDesignChart`, and serializes through `engine-core/TransitCore.SerializeBirth`. Transit uses the same shared core with `HumanDesignUtility.ActivationOf`.

The browser contract is adapted by `src/lib/chart-engine/sharp-provider.js` and `sharp-contract.js`. Shared mechanics and activation mapping come from SharpAstrology.HumanDesign 1.2.0. Modern astronomy is supplied by the existing patched SharpAstrology.SwissEph 0.5.1 dependency and its existing data assets. That chain is the default website path.

## Prototype boundary

The developer runner selects `modern`, `jovian-compatible`, or `both`. Each engine consumes a normalized absolute UTC instant. Civil date/time, timezone or explicit offset are normalized before astronomy; location may support civil timezone resolution, but does not alter geocentric longitudes at identical UTC.

The Jovian backend uses a pinned externally acquired 1.76 C library and compressed DE406 in a private local cache. A native adapter calls the exact historical calculation functions and reports numerical longitudes, runtime ephemeris status, and build identity. The wrapper must reject data absence or fallback rather than silently switch to Moshier or Modern. Nothing from this backend is loaded into production browser code during V1.

Longitudes then enter the shared SharpAstrology activation mapper and HumanDesignChart mechanics. The result uses the same birth chart serialization fields as Modern: Personality and Design activations, Type, Authority, Profile, Definition, Incarnation Cross, Channels, and Centers. Any additional fields such as Strategy must derive from the shared mechanics/contract rules and carry consistent semantics.

The intended data flow is:

```text
civil input / explicit UTC
          ↓
absolute UTC normalization
          ↓
engine selection in developer runner
          ├─ Modern astronomy and Design root
          └─ Swiss 1.76 C2 astronomy and Design root
          ↓
shared activation mapping and chart mechanics
          ↓
unified chart result + separate engine identity
```

## Historical time and Design semantics

The legacy backend intentionally passes the numeric UTC Julian Date to `swe_calc_ut`. Historical Swiss internally applies its own delta-T semantics. The identity describes this as `legacy utc-as-ut1 compatibility semantics`. This convention belongs only to the compatible engine; it does not change Modern's UTC/TT/UT1 calculations.

Design is a numerical root of the historical solar longitude at an earlier instant, separated from the Personality Sun by 88 degrees along the solar arc. The root must be calculated from the backend, with wrap-safe angular differences and a convergent bracket. No fixed day/second shift, case override, epsilon at an activation boundary, or stored official Design timestamp is allowed.

Earth and the opposite node use the shared engine's defined opposition rules. The selected node convention and planetary flags must match the original C2 runner. Record actual returned ephemeris flags and runtime DE number to make a hidden fallback detectable.

## Identity and reproducibility

`engine-identity.json` records the engine name, compatibility version, exact source archive and per-source hashes, compressed data hashes, build platform/compiler/options, native product hash, and engine signature. Rebuilding creates a new build identity when artifact bytes differ. The historical research library hash is a reference, not the hash of the new build.

Pinned download and build steps are separate from the production build. Downloaded source/data and binaries remain excluded from Git. See `license-audit.md` for the source/data notices and the future distribution gate. A future browser backend can implement the same conceptual engine interface after runtime packaging and licensing are settled; current local native execution alone does not establish browser readiness.

## Validation contract

Validation must compare prototype C2 against the independent research C2 runner numerically: all longitudes, Design root, activation subdivisions, and shared mechanics. It must deduplicate official evidence by absolute UTC and compare only officially recorded fields. Discriminator cases and narrow boundaries receive explicit ±1/±5 second probes.

Negative controls must run the real Modern backend at known divergent inputs; Modern must retain its existing results while the compatible backend returns C2. Compare identical activations through shared mechanics to detect accidental rules duplication. Existing Modern golden/unit/integration tests and production engine signature must remain unchanged.

Each report states its input corpus, comparator, count, residuals and any unrecorded/unverified fields. No report may equate fixture replay with a running calculator, activation matches with unrecorded mechanics matches, or native readiness with browser integration.

## Concrete prototype files

`jovian-engine/mechanics/JovianMechanics.csproj` references HumanDesign 1.2.0 and compiles the unchanged `engine-core/TransitCore.cs` by source link. It does not reference the Modern Swiss project or execute its astronomy. `Program.cs` supplies the already calculated longitudes to `HumanDesignChart`; the DateTime arguments select Personality/Design dictionaries only. `scripts/lib/birth-engine-prototype.mjs` provides the Node interface and shared input resolver. Historical numeric root and time semantics remain in `astronomy`, while `raw` and `chart` preserve existing consumer shapes.
