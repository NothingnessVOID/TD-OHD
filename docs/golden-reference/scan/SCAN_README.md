> Historical scan record. Original temporary paths below describe the audit run, not portable prerequisites. For current runnable commands see [REPRODUCING.md](../REPRODUCING.md). Full pinned source snapshots and engine packages remain local; published manifests preserve their commits and hashes.

# Native Sharp Sun boundary diagnostics

All tooling and outputs are under `/tmp/td-ohd-golden-audit`. Production repository and the fixed 8787 app were read only. Repository HEAD was and remains `a2314f74e84293f88c6df232d643618556496c26`.

The scanner uses NuGet SharpAstrology.HumanDesign 1.2.0 and SharpAstrology.SwissEph 0.5.1, which resolves SharpAstrology.Base 0.14.0. It compiles the production `engine-core/TransitCore.cs` by a read-only Compile link and reads the production `public/engine/ephe/sepl_18.se1` and `semo_18.se1` directly. It does not reference a production csproj, so build outputs remain in this temporary project.

Engine provenance teammate verified the fixed 8787 HD/Base/Swiss binary assets and ephemeris hashes against this repository; its report is `/tmp/td-ohd-golden-provenance/provenance.json`. The linked TransitCore differs from 8787 only by one connectedComponents output field and a comment, with no activation calculation change.

## Source evidence

`pinned-sources` preserves exact files obtained by git show at the NuGet commit. `source-manifest.json` records original path, commit and SHA256.

* HumanDesign 1.2.0 commit `8b78031ce9a4244b8eb0a4ce37e612b8d6782570`: Utility/HumanDesignUtility.cs lines 13-18 uses offset 3.875 degrees, Gate 5.625 degrees, Line 0.9375 degrees; lines 57-71 subtract offset, normalize, then floor Gate/Line/Color/Tone/Base.
* Gates.cs lines 7-70 defines all 64 wheel indices: 17,21,51,42,3,27,24,2,23,8,20,16,35,45,12,15,52,39,53,62,56,31,33,7,4,29,59,40,64,47,6,46,18,48,57,32,50,28,44,1,43,14,34,9,5,26,11,10,58,38,54,61,60,41,19,13,49,30,55,37,63,22,36,25.
* HumanDesignChart.cs lines 338-341 forms Profile from the integer Personality Sun Line and Design Sun Line. Enums/Lines.cs lines 18-33 uses an integer pair switch for the 12 allowed profiles and throws for an illegal pair. No fractional Line is used to form Profile.
* HumanDesignPlanetPositionProviderExtensionMethods.cs lines 10,19-33 solves the previous solar position 88 degrees behind birth Sun, with a bracket 110 to 70 days before birth.
* Base 0.14.0 commit `b029ea0a57fabf84b0d0209aa8d6871b6e64a41c`: AstrologyUtility.NormalizeDegrees uses degree modulo 360, clamps abs(modulo)<1e-13 to zero, and adds 360 for negatives.
* SwissEph 0.5.1 commit `342a57997c1b987e7949acc98897c8b73d05939a`: Domain/Time/JulianDay.cs lines 36-42 converts UTC using only Second and Millisecond. **Root timestamps are meaningful to one millisecond.** More digits in diagnostic JSON are the binary search bracket upper bound, not astronomical accuracy below one millisecond.

## Files

* `sun-boundaries.json`: 168 native Personality Sun Gate/Line boundaries in January across 1985, 1995, 2005, 2015 and 2025; ±1 second activation probes and diagnostic 3.9375 degree offset roots.
* `sun-candidates.json`: 90 minute inputs, all London GMT; includes full production chart output, Sun double longitudes, Design UTC and 88 degree arc residual.
* `sun-candidates-shortlist.json`: 15 initial browser candidates, three per era.
* `design-sun-boundaries.json`: 169 January Design Sun boundaries with ±1 second probes. Design boundaries are bracketed through the birth Sun longitude target plus 88 degrees; actual native Design Sun values and activations are also recorded.
* `design-sun-candidates.json`: 150 Design boundary minute candidates across five eras.
* `personality-pure-line-boundaries.json` and `personality-pure-line-candidates.json`: within-Gate Line boundaries and 120 minute candidates across several gates.
* `near-minute-candidates.json`: 20 minute inputs immediately before and after the nearest January Personality/Design boundary per era.
* `full-year-personality-boundaries.json`: 1918 native Sun boundaries across all months of the five representative years.
* `full-year-personality-near-half-second-candidates.json`: 39 inputs at 13 boundaries whose root falls less than 0.5 second after a whole UTC minute; includes UTC, historical Europe/London wall time and numeric offset.
* `float32-boundary-diagnostics.json`: a diagnostic hypothetical narrowing of Sun longitude to float32, with its effective threshold and approximate advance formula. **This is a hypothesis, not a correction or claim about official calculations.** The root agent already has official controls that contradict a global float32 explanation.
* `window-*-minutes.jsonl`: 121 rows per center, from -60 through +60 minutes.
* `window-*-seconds.jsonl`: 601 rows per center, from -300 through +300 seconds.
* `scan-validation.json`: Sun/Chart contract, Profile pair and 88 degree arc consistency across all generated candidate/window rows.
* `scanner-runtime-manifest.json`: DLL, ephemeris and scanner source SHA256.

Window centers are 2015-01-26 01:20Z and 2025-01-19 22:57Z, which the root agent reports as official mismatches, and diagnostic candidates 1985-01-25 18:34Z, 1985-11-25 06:36Z, 2015-02-04 06:56Z, 2025-03-15 18:56Z, plus control 1995-04-11 02:30Z. A candidate must be compared through the official browser before labeling it a mismatch.

## Consistency and precision

Across 5473 generated candidate/window rows, the recorded Personality and Design Sun objects exactly match the Sun objects in the production native chart serialization, and Profile exactly matches their integer Line pair. January Design boundary actual Sun longitudes differ from their analytic target by at most approximately 1.85e-8 degrees, consistent with a few milliseconds and the provider's millisecond input quantization.

The wider April 1995 diagnostic window exposes a larger Design 88-degree residual: maximum absolute residual across all rows is 7.300834795e-6 degrees (about 0.62 second of Design Sun movement). The pinned RootFinder.FindRoot default accuracy is 1e-5; the solver can accept this angular residual. This concerns the Design solve and does not change the independently scanned Personality Sun boundaries. It prevents an assertion that every birth's Design solve has a 1e-8-degree residual.

## Reproduction

Run with `/tmp/td-ohd-sharp-audit/dotnet/dotnet`.

```
dotnet run --project /tmp/td-ohd-golden-audit/sun-boundary-scan/SunBoundaryScan.csproj -c Release
dotnet run --project /tmp/td-ohd-golden-audit/sun-boundary-scan/SunBoundaryScan.csproj -c Release -- --design-scan
dotnet run --project /tmp/td-ohd-golden-audit/sun-boundary-scan/SunBoundaryScan.csproj -c Release -- --year-scan
dotnet run --project /tmp/td-ohd-golden-audit/sun-boundary-scan/SunBoundaryScan.csproj -c Release -- --precision-boundaries
dotnet run --project /tmp/td-ohd-golden-audit/sun-boundary-scan/SunBoundaryScan.csproj -c Release -- --scan-windows 2015-01-26T01:20:00Z 2025-01-19T22:57:00Z
dotnet run --project /tmp/td-ohd-golden-audit/sun-boundary-scan/SunBoundaryScan.csproj -c Release -- --birth 2000-05-10T04:30:00Z
```

The 3.9375 degree offset is diagnostically 0.0625 degree later, about 88 minutes later in January. The root agent's official 1985 Gate boundary comparison supports the current 3.875 degree mapping at that point and does not support changing it to 3.9375.
