# Independent review of root-cause-v2

Reviewed 2026-10-03. This review changes only this evidence note. All three final C groups and the strengthened Sharp runtime proof have been reviewed. MMI access evidence has been read. No production source, installation, or mapping value is changed.

## Frozen mapping and distances

`scripts/frozen_mapping.py` reproduces the existing `tools/compare-ephemerides.py` mapping: offset `O = 3.875`, gate width `GW = 5.625`, line width `W = 0.9375`, and the same 64-entry gate order. For `x = (longitude - O) mod 360`, the gate index is `floor(x / GW)` and the line is `floor((x mod GW) / W) + 1`. There is no added epsilon, tolerance, or rounding.

The boundary helper is correct for the audited domain:

- Global line index `i = 6 * gateIndex + line - 1`.
- Unwrapped start `S = O + i * W`; next boundary `N = S + W`; unwrapped longitude `L = O + x`.
- Positive distance to the current line's next boundary is `N - L`. Display coordinates alone are reduced modulo 360.
- `arcsec = degrees * 3600`; `mas = degrees * 3600000`.
- With Sun speed in degrees/day, equivalent seconds is `degrees / speed * 86400`. This is a local linear estimate, not an independently solved transition time.
- Signed longitude minus the frozen Jovian expected-line start is a separate quantity. Negative means still before that expected start; positive means past it. Once a model crosses the expected start, its current next boundary advances by an entire line, so these fields must not be conflated.

An independent inline check of all 384 exactly representable line starts returned the new line and a next-boundary distance of exactly `W`. Wrap checks also passed: longitude `359.99` belongs to `25.2`, next boundary displays `0.125`, while the unwrapped next boundary is `360.125` and the distance is `0.135` degrees. Longitude `0.125` starts `25.3`; its next boundary is `1.0625`.

### Existing normalization caveat

The exact Sharp Base 0.14 `AstrologyUtility.NormalizeDegrees` contains a pre-existing `abs(y) < 1e-13` zero clamp before negative-angle normalization. The frozen Python mapping has no such clamp. There is also a binary64 modulo edge immediately below the mandala offset: `math.nextafter(3.875, -inf) == 3.8749999999999996`, but Python `(longitude - O) % 360` rounds to `360.0`, outside the gate array. This reproduces a limitation of the existing Python formula; it is not introduced by the shared helper. None of the nine case Sun longitudes is near this offset. Retain the frozen formula for this audit and do not claim equivalence at every representable double or introduce a new epsilon to conceal this edge.

## Baseline and hypothesis wording

- The prior frame-bias finding is a demonstrated local difference between Sharp Swiss 0.5.1's ordinary Sun/planet correction path and original C 2.10.03 default semantics for the installed DE441 data. It is not a demonstrated explanation of every Jovian difference. Previous standard C DE441 aligned 2/7 mismatch cases; standard C DE431 aligned 3/7.
- The historical DeltaT experiment substituted the verified 2.08 table into current C 2.10.03 with DE431. It did not execute a complete C 2.08 kernel. Both 2015 cases received zero DeltaT change; the old 2025 forecast supplied about three seconds and aligned those two cases. It does not identify Jovian's internal model or explain all cases.
- The diagnostic bias patch is correctly placed after aberration and before precession. Its scope is the actual verified JPL/Swiss source, DE number at least 403, non-ICRS requests, existing frame-bias model, and velocity rotation when Speed is requested. Moshier and unknown metadata are skipped in this narrow diagnostic. This is not yet a general production patch.
- Comparing `.se1` with raw JPL isolates the representation/source route only when the DE version, JD UT, DeltaT/JD TT, requested corrections, and actual selected source are separately recorded. A raw DE431 versus `.se1` DE441 comparison changes both the dataset and representation.
- Sharp router-resolved flags and runtime `BodyState.Source` must be described as those actual observations. They are not a C-style returned flag integer. Original C requested/returned flags can be asserted directly: 258 for Swiss+Speed; 257 for JPL+Speed, with fallback forbidden.

## Result 1–7 classification

Classify each distinct case first and then summarize counts by configuration. A single global label is insufficient when only some cases match. State whether `=` means Personality Sun/Earth Gate.Line, four solar activations/Profile, or all 26 Gate.Line values. Numeric longitude equality is a different and stricter claim.

- Result 1 supports a Sharp port difference where C matches Jovian and Sharp differs; a negative control in which all three agree does not establish a defect.
- Result 2 can coexist with an independently demonstrated numeric Sharp/C difference: equal discrete Gate.Line values can hide a small longitude difference.
- Result 3 supports raw JPL as the changing variable only after controlling the DE version and time/correction pipeline. A DE431-only improvement must not be labelled proof that the raw file format is responsible.
- Result 4 is scoped to the tested cases and configurations. It does not identify Jovian's undocumented internal calculation.
- Result 5 requires reporting both raw JPL longitude differences and JD/DeltaT differences. If the clocks differ, numerical disagreement alone does not isolate the correction pipeline or JPL interpolation.
- Results 6 and 7 require actual MMI chart outputs. They remain unclassified when access is blocked. The seven categories may overlap by case and metric; partial agreement is reported explicitly.

## Official MMI/JPL evidence

The saved actual UI evidence records MMI 3.0 access as blocked by the absent Windows/MMI environment and unauthenticated portal. No chart values were observed. The null case fields in `mmi-results.json` correctly preserve this limitation.

The [official MMI 3.0 product page](https://jovianarchive.com/products/maia-mechanics-imaging-mmi) describes a Windows desktop product, Mac via virtualization, activation keys, and a seven-day Professional trial. It links to the [MMI desktop portal](https://mmi.jovianarchive.com/) and states use of a JPL planetary database, without publishing the DE version, kernel representation, flags, or timescale. The distinct [Maia browser product](https://www.maiamechanics.com/) links to [its web app](https://app.maiamechanics.com/) and advertises a fourteen-day trial; its output cannot be relabelled MMI 3.0 evidence.

The [primary JPL export documentation](https://ssd.jpl.nasa.gov/planets/eph_export.html) distinguishes SPICE `.bsp` kernels from the traditional binary ephemeris representation. The [official Linux binary directory](https://ssd.jpl.nasa.gov/ftp/eph/planets/Linux/) is the relevant source for the latter. These documents establish provenance and file format, not MMI or Jovian numerical output.

## Numerical review: Swiss / raw DE441

Read the actual `A-SWISS.json` and `A-JPL441.json` diagnostic outputs, the C build/coverage records, and `sharp-jpl-results.json` / `sharp-bias-results.json`. The C source is pinned to `175e1fcb3108bcd5c0d146c803f51dcf23508012`, declares 2.10.03, is unpatched, and was compiled with Apple clang 17 on macOS arm64. LLVM instrumentation records execution of the actual Sun bias call site and IAU2006 helper branch in both groups; flags alone were not used as proof of bias execution.

| Configuration | Jovian P Sun matches among seven mismatches | Both negative controls | Scope reviewed |
|---|---:|---|---|
| C `.se1` DE441 | 2/7 | Match | Independent 88-degree Design root and all 26 values |
| C raw JPL DE441 | 3/7 | Match | Independent 88-degree Design root and all 26 values |
| C raw JPL DE431 | 3/7 | Match | Independent 88-degree Design root and all 26 values |
| Sharp `.se1` current | 0/7 | Match | Personality 13 values only |
| Sharp raw JPL DE441 current | 0/7 | Match | Personality 13 values only |
| Sharp `.se1` + bias | 2/7 | Match | Personality 13 values only |
| Sharp raw JPL DE441 + bias | 3/7 | Match | Personality 13 values only |

The C groups match their requested flags on every calculation: `[258]` for Swiss and `[257]` for JPL, with no warnings or fallback. Swiss's actually loaded planetary and lunar files both report DE441. For JPL the effective DE number is independently returned by `swi_get_jpl_denum()` as 441; the zero metadata fields in the generic current-file API are not interpreted as the raw kernel's DE number.

For all nine births, Sharp raw DE441 + bias has exactly the same JD UT, DeltaT, and JD TT as C raw DE441. Sun longitude differs by at most `1.0231815394945443e-7 mas`, at floating-point last-bit scale. Sharp `.se1` + bias and C `.se1` Sun longitude were exactly equal as parsed binary64 values in all nine births. Sun speeds are not bitwise equal: the raw DE441 absolute difference ranges from about `2.56e-8` to `5.84e-7 degrees/day`. Keep this speed residual explicit rather than claiming the entire six-component state is identical.

All nine sets of Personality 13 Gate.Line values for each Sharp + bias group equal the corresponding C group. This is discrete-value agreement, not all-planet numerical equality: the sampled Moon longitudes still differ by up to about `20.7713 arcsec` (G2015-feb), without changing the captured Gate.Line. This review does not expand into diagnosing that separate residual.

G1995-feb demonstrates a local source-representation boundary effect with the DE version held fixed: C `.se1` Sun is `332.93749991340791894` degrees, while C raw DE441 is `332.93750003369257229`. The raw-minus-`.se1` difference is `+0.43302475205564406 mas`; the frozen `55.4` start is `332.9375`. The signed distances are approximately `-0.311731 mas` and `+0.121293 mas`, respectively. Thus raw JPL changes this one case's line after standard bias correction. It does not explain the four remaining 2015/2025 mismatch cases.

At the stated Personality solar metric, G1995-jun and G2005-jul20 exhibit Result 1; G1995-feb also exhibits the local Result 3 pattern; the remaining four mismatch cases exhibit Result 2 / Result 4. Unpatched Sharp raw JPL numerically differs from C raw JPL in all nine Sun observations, a Result 5 finding, even where their discrete line is the same. MMI remains blocked, so Results 6/7 are not established.

The Sharp guard booleans are all true in all reviewed biased cases: DE402 skips, ICRS skips, Moshier is unaffected, and DE441 non-ICRS applies. Source reading of `BodyService.Compute` confirms each call passes through the correction pipeline without caching corrected states, so AppContext toggles do exercise the guard. The published parity records compare the rebuilt frozen source with disabled diagnostic metadata against the NuGet baseline, with 117 longitude/speed pairs identical per source.

Sharp's new groups contain Personality only. They do not measure Design, Profile, or Incarnation Cross in the raw/bias configurations. Earlier GUI all-26 evidence remains a separate baseline and must not be presented as those new configurations' full-chart verification.

## Final runtime and DE431 review

The final Sharp proof now reads both Swiss and JPL headers from their actual registered source readers. All four Sharp groups contain nine rows and 13 point-level actual source observations per row, including the adapter's geometric true-node request and explicitly derived Earth/South Node antipodes. No point uses Moshier, and the source is exactly the requested Swiss/JPL route. Native HumanDesign 1.2 mapping and the shared Python helper agree for every point. The runner independently reads and hashes the two `.se1` files and raw DE441, and its published asset hashes equal the C input manifest. The first-review Swiss header wording limitation has therefore been resolved.

The final C raw DE431 group contains nine complete cases with requested/returned flags `[257]`, runtime DE431, no warnings, no fallback, and a source-level bias execution record. It matches the same three mismatch cases as raw DE441: G1995-feb, G1995-jun, G2005-jul20. Both negative controls and the independently calculated all-26 arrays also match in these five cases. The four remaining 2015/2025 cases still differ only in Personality Sun/Earth line.

The raw DE431 file was retrieved from the mirror explicitly listed by the official Swiss repository after the NASA transfer was interrupted. Its `2788676624` bytes, SHA-256 `fe3d0323d26ada11f8d8228fda9ca590c7eb00cee8b22dff1839f74f5be71149`, binary header DE431, and MD5 `fad0f432ae18c330f9e14915fbf8960a` are recorded. That MD5 matches Astrodienst's official JPL download listing. The exact retrieval route is retained; it is not described as a completed direct NASA download.

Raw DE441 has SHA-256 `476096486def4e41bfceb29aa27f50784da0bce318902bcf7b88caad058cd4da` and MD5 `4e3b924463d17b68ec9c4a18240300cd`, matching the dedicated official download listing. The different checksum in the Swiss GitHub README is explicitly retained as a provenance discrepancy rather than concealed or used to claim an identical unspecified kernel.

Independent checks against final JSON passed for all three C groups: unchanged frozen UTC, correct requested/returned flags, runtime DE, shared mapping for all 26 activations, JD TT = JD UT + DeltaT/86400, Profile derived from computed Sun lines, and distance unit conversion. The maximum absolute residual from the 88-degree Design arc is `4.638707196136238e-10 degrees` across the 27 independently solved Design epochs.

The remaining signed local linear seconds relative to the expected Personality line start are negative in both raw kernels:

| Case | Raw DE441 signed seconds | Raw DE431 signed seconds |
|---|---:|---:|
| G2015-tight | -0.109446476 | -0.104668119 |
| G2015-feb | -0.107256382 | -0.102448818 |
| G2025-tight | -0.096308100 | -0.089625682 |
| G2025-mar | -0.021970466 | -0.015091772 |

Birth DeltaT is unchanged between these two raw-kernel groups. These are local linear distance estimates, not solved boundary timestamps. Neither raw dataset supplies a complete shared explanation of Jovian results. MMI remains unmeasured. The evidence is ready to commit with these scope limits; no production fix or whole-engine equivalence has been established.
