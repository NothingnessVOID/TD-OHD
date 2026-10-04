# Installed 8787 baseline provenance and adapter audit

Audit baseline: fixed formal installation at `http://127.0.0.1:8787`, read only. Installation source commit `7734b942160497c1c28d46002de0edd91df53230`, matches current origin/main. Source path `<LOCAL_INSTALL>`. 18 core/adapter/input/rendering/storage source files byte-match the recorded main commit. Raw hash evidence and HTTP status/cache headers are in `provenance.json`; exact active assembly names are from `installed8787-dotnet-config.json`, not inferred by listing potentially stale files.

## Packages and runtime

SharpAstrology.HumanDesign 1.2.0: NuGet source commit `8b78031ce9a4244b8eb0a4ce37e612b8d6782570`.
SharpAstrology.SwissEph 0.5.1: NuGet source commit `342a57997c1b987e7949acc98897c8b73d05939a`.
Resolved SharpAstrology.Base 0.14.0: NuGet source commit `b029ea0a57fabf84b0d0209aa8d6871b6e64a41c`.
.NET target net10.0, browser WASM. Actual loaded HD, SwissEph and Base WASM files match 5196 byte for byte; wrapper/core binaries differ because the newer repository serializes connectedComponents and rebuilt assemblies. Current Program.cs matches installed Program.cs; raw activation serialization is unchanged.

Swiss files from aloistr/swisseph commit `3186eed405bd2b4ff520c91d0b27bb25e9d75106`:
sepl_18.se1 length 484061, SHA256 `ca1393ceab3a44fbc895887cf789c68819ae6a1cbc9b22225872dbe4ccd99a66`.
semo_18.se1 length 1304771, SHA256 `1ca07bd67c24374d77226180c20a4f9996cba013697894810518e7eb582ca4f7`.
Both active HTTP files match the installation disk, repo public files, and manifest. The C# wrapper selects EphType.Swiss and disables Moshier fallback. HTTP responses from 8787 are Cache-Control:no-store.

## Input and calculation path

Installed src/views/entry.js 185 accepts exact HH:MM (unknown time chooses noon); place mode resolves historical IANA offset, manual mode accepts a quarter-hour multiple. Installed src/lib/chart-engine/sharp-provider.js 10-18 validates HH:MM, builds local wall time with seconds 00, subtracts numeric UTC offset in milliseconds and emits ISO UTC. Bridge CalculateBirthChart (engine-wasm/Program.cs 25-43) parses that ISO UTC directly. There is no conversion through rounded decimal hours and no minute rounding between browser and C#.

Official Base ToJulianDate uses Unix TotalMilliseconds divided by 86400000 plus 2440587.5. DateTimeFromJulianDate uses UnixEpoch.AddMilliseconds with the double JD difference. Swiss JulianDay.FromUtc consumes hours, minutes, seconds, milliseconds, dropping finer DateTime ticks (under 1ms). Design date calls Base DateTimeFromJulianDate, not the Swiss JulianDay.ToUtc helper that rounds to milliseconds.

At exact HD package commit 8b78031, DesignJulianDay targets birth apparent Sun longitude minus 88 degrees; its bracket is birthJD-110 to birthJD-70, RootFinder maxIterations1000, default accuracy1e-5. Convergence includes JD-width or angular residual criteria; this is a sub-second scale tolerance, not an 88-day approximation or minute rounding. Actual independent numerical accuracy must be checked in the ephemeris audit.

## Profile and Sun line display

Installed sharp-contract.js 65-73 preserves raw data.line. Local GATES metadata does not contain a line field that could overwrite it. Installed sharp-contract.js 110 removes spaces from raw.profile, and line128 assigns profile.numbers. Local PROFILES metadata contains name/theme only, so cannot overwrite numbers. The browser chart, planet grid, bodygraph columns and SVG exports render these fields directly. TransitCore.SerializeBirth emits chart.Profile.ToText and raw personality/design Activation fields, not a locally re-derived profile.

The only rounding in sharp-contract.js is display of longitude as degree/minute/second text; raw longitude and Gate/Line fields remain unchanged. Local design dateTime text drops seconds for presentation, without recalculating design or activations.

## Cache and stale-result considerations

Installed chartdata.js keeps an in-memory Map of at most 8 birth computations. The key includes package/cacheRule, date, effective HH:MM, numeric timezone and unknown-time flag. Different minutes or offsets therefore cannot collide. The per-page WASM instance caches only initialization and ephemeris file tasks, not a cached birth chart. Stored people persist birth input including numeric offset; they do not persist computed chart objects. Reopening a saved record reuses the stored numeric offset rather than recalculating its IANA offset, so the audit should record the effective UTC input explicitly.

Source-only observation: installed main.js loadBirth 312-327 uses shared currentData and lacks a request sequence/cancellation guard. If users submit different charts concurrently, completion order can select an older result, and delayed sensitivity computation can attach to the newer global object. This scenario has not been reproduced here and does not explain a repeatable fresh-page same-input discrepancy by itself. Root's fixed-case browser audit should load sequentially and compare displayed birth/UTC/result.

Official Swiss primary programmer source: https://www.astro.com/swisseph/swephprg.htm (3.3.1). SWIEPH=2, SPEED=256, combined258; defaults are apparent geocentric ecliptic longitude at true equinox of date. NONUT=64 would select mean equinox; TRUEPOS=16 would select true positions; SIDEREAL=65536 would select sidereal. No Human Design prose was used to change or infer computational truth.

No repo source edits, git mutation, install changes, commits, pushes or deployments occurred. Only temporary audit artifacts were written.
