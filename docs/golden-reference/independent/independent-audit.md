# Independent solar and UTC audit

Audit baseline: running http://127.0.0.1:8787 installation at `<LOCAL_INSTALL>`. Read-only production audit; diagnostics and generated outputs are under `/tmp/td-ohd-golden-independent`.

## Verified production identity

PID 77318 cwd is the installed app; `local/server.mjs` serves `dist`. HTTP-served HumanDesign/SwissEph WASM and both ephemeris files have identical hashes to installed public/dist and the isolated candidate repo. See `installed-8787-astronomy-baseline.json`. Wrapper Program.cs and historical timezone.js are equal. Candidate adapter v2 differs from installed v1 cache/serialization, so whole-app equality is not claimed.

## UTC pipeline

Entry: installed `src/views/entry.js:204` resolves historical offset from the selected IANA zone; `src/lib/location.js:49` aliases `resolveUtcOffset`; installed `src/lib/timezone.js:27` uses three Intl wall-time reconciliation iterations. `src/lib/chart-engine/sharp-provider.js:10` parses date + HH:MM + :00Z and subtracts numeric offset in hours before producing ISO UTC. Browser bridge `engine-wasm/Program.cs:27` parses UTC ISO with AssumeUniversal/AdjustToUniversal and requires UTC kind. There is no solar-time/location-longitude adjustment in this path.

HeadlessChrome154 at actual 8787 resolves Europe/London January offsets as 0 for the selected five 1985/1995/2005/2015/2025 samples; independent Python zoneinfo agrees for all 90 candidates. Exact selected dates and round-trip fields are in `installed-8787-browser-timezone.json`. Node test runtime is Node26, ICU78.3, tz2026a; this version statement does not describe Chrome internal timezone database.

## Solar/88 degree calculation

Wrapper explicitly selects Swiss files and `allowMoshierFallback:false`. Native package diagnostic using the installed dist ephemeris files confirms source SwissEph and declared request flags258 on Sun sides. An empty ephemeris directory throws missing sepl_18.se1; see `no-fallback-probe.json`.

Exact NuGet provenance: HumanDesign1.2.0 commit8b78031ce9a4244b8eb0a4ce37e612b8d6782570; SwissEph0.5.1 commit342a57997c1b987e7949acc98897c8b73d05939a; Base0.14.0 commitb029ea0a57fabf84b0d0209aa8d6871b6e64a41c. The installed package WASM hashes match the candidate package WASM hashes.

HD `DesignJulianDay` takes birth Sun minus88 degrees and solves in birthJD−110 through birthJD−70, Brent then bisection, maxIterations1000, default accuracy1e−5. Actual solar arc implementation is preceding88 degrees despite source doc header saying ahead. Base uses Unixepoch milliseconds for JD conversions; Swiss DateTime input considers whole milliseconds and drops finer ticks. Personality Sun is calculated directly at birth UTC and does not depend on design root solver.

Independent C library: pyswisseph / SwissEphemeris2.10.03; module SHA256 aaddfa0b58ff047c34ee45f0d45a9e2dbd165a645776b6f2f1756a8af872de63. Bisection uses continuous signed longitude error and double JD precision. Direct civil UTC tuples are mapped to Gregorian JD to reproduce the current Sharp time convention; no claim that this equals a separate leap-aware UTC-to-UT1 pipeline.

Over90 candidates /168 boundaries, C258 return flags are258 throughout; 90/90 UTC values agree; max Sharp design date vs independent C88root difference0.001167seconds; max C88arc residual at Sharp design1.3780e−8degrees. Standard C258 Sun differs from native Sharp by up to1.8964e−6degrees, with boundary roots up to0.16150seconds apart. All ±1second C boundary probes have expected signs. See `independent-swiss-checks.json`.

## Two tight external disagreements

| Sample | Native Sharp P Sun | C258 P Sun | Sharp boundary UTC | C258 boundary UTC |
| --- | ---: | ---: | --- | --- |
| G2015-tight | 305.7499968177302 | 305.7499987027751 | 2015-01-26T01:20:00.2710459Z | 2015-01-26T01:20:00.110194Z |
| G2025-tight | 300.1249969949901 | 300.1249988801649 | 2025-01-19T22:57:00.2560274Z | 2025-01-19T22:57:00.095095Z |

At each input exact minute, native Sharp and C258 double longitude are both below the following-line boundary. Actual Jovian saved UI evidence reports next line. This is a native numerical comparison; actual 8787 WASM result must be verified by the root agent before claiming browser reproduction.

Native Sharp Sun at both tight instants equals C258|ICRS(131330) exactly to printed double precision. Across90 candidate minute inputs, max native minus C131330 Sun difference2.2737e−13degrees; design after matching millisecond truncation differs at most4.65e−10degrees. Exact source inspection by engine-provenance agent finds missing ICRS-to-dynamical frame-bias transformation in the common Sun correction path. This local behavior explains Sharp−C258≈0.161second boundary shift. It does not fully explain observed Jovian line changes: C258 remains before the boundary by0.1102/0.0951seconds. See `tight-icrs-comparison.json` and `precision-frame-supplement.json`.

The global float32-longitude hypothesis is rejected by controls: it rounds both mismatch inputs to next-line boundaries but also rounds1985 and1995 control inputs to next-line boundaries, contrary to saved official previous-line outputs. HD ActivationOf longitude/constants/intermediate mapping all use double. Double longitude ULP is5.6843e−14degrees; double JD ULP is40.23microseconds. No native input minute quantization finer than the explicit00seconds is implicated.

Common flag alternatives tested: removingSPEED or NOGDEFL leaves C Sun unchanged; NONUT delays roots127.7/23.6seconds; TRUEPOS/NOABERR advances roughly491seconds; Moshier still places the exact-minute inputs before the next line. Leap-aware swe.utc_to_jd shifts UT1−0.4886seconds in2015 and+0.1892seconds in2025, crossing2025 only. None supplies a demonstrated common explanation of both external results. External library/version/configuration remains unknown from displayed gate.line alone. See `tight-c-swiss-diagnostics.json`.

Observed official four controls allow many very small perturbations: under a single constant additive-longitude model, shifts≥1.2972e−6degrees and<1.5157e−6degrees fit the two mismatches and two controls. This is an observational bound, not evidence of a backend parameter. See `tight-observation-bounds.json`.

Primary flag semantics: https://www.astro.com/swisseph/swephprg.htm section3.3 documents SWIEPH2,SPEED256, apparent geocentric ecliptic/default true equinox of date; ICRS131072 controls the bias convention.
