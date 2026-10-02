# Historical DeltaT table sensitivity

## Source and method

- Historical source: PyPI `pyswisseph2.08.00-1` source distribution, vendored `libswe/sweph.h` declares `SE_VERSION "2.08"`; archive hash matches PyPI metadata. This source has `TABEND2027` and the complete38410byte exported header.
- Source archive SHA256: `6b4818c0224d309c0b01f3c52df2432900dddcde345364408d99eafc9cdd1e71`. Download URL and all provenance metadata: `historical-deltat/source-manifest.json`; raw source preserved beside it.
- The incomplete official Git tag `4e75b5bafbc9ff97ec1e7122249221c6bf000d14` with `TABEND1999` is excluded.
- For audited modern epochs, historical and currentBessel table interpolation code is identical ignoring comments/whitespace. Python reconstruction of current table matches actualC `deltat_ex` across47 birth and design epochs within7.11e-15seconds.
- **Scope: historical DeltaT table alone is substituted into currentC2.10.03 with DE431 and standardflags258. This does not run a completeC2.08 kernel and does not establish Jovian internal configuration.** Exact88degree design roots and all26 Gate.Line values were independently recomputed for all47 records. No fitted parameter, installation change, or production change.

## Four remaining UTCs

| Case | Birth DeltaT current (s) | Birth DeltaT old table (s) | Difference (s) | Difference at original design UTC (s) | P/D Sun under sensitivity | Profile | All26 differences |
| --- | ---: | ---: | ---: | ---: | --- | --- | ---: |
| G2015-tight | 67.672612631910 | 67.672612631910 | 0.000000000000 | 0.000000000000 | 41.4 / 44.1 | 4/1 | 2 |
| G2015-feb | 67.683215756680 | 67.683215756680 | 0.000000000000 | 0.000000000000 | 13.2 / 1.5 | 2/5 | 2 |
| G2025-tight | 68.994786401851 | 72.025885875480 | 3.031099473628 | 2.888832206489 | 60.5 / 28.1 | 5/1 | 0 |
| G2025-mar | 68.980201915030 | 72.098379410753 | 3.118177495723 | 2.979510537768 | 36.4 / 11.6 | 4/6 | 0 |

## Result

- Historical2015 table neighborhoods are unchanged, so this specificDeltaT source supplies exactly0seconds shift at both2015 birth/design epochs and leaves both mismatches (Personality Sun/Earth only). It cannot account for their required approximately0.10second advance.
- Historical2025 forecast supplies about3seconds additionalDeltaT. In this sensitivity both2025 cases match all26 captured Gate.Line activations, including their Design activations. Numeric agreement alone does not identify the official engine.
- Across47 records this sensitivity matches42 full26arrays. Remaining5records represent two distinct2015 UTCs plus three repeated captures. Therefore this historicalDeltaT-table-only hypothesis fails as a shared explanation of all official results.
- Finer Color/Tone/Base, fullfoundation, and Variable equivalence were not asserted by this Gate.Line comparison.

## Files

- `historical_deltat_check.py` reproducible numerical diagnostic.
- `historical-deltat-208-vs-21003.json` all47 inputs, DeltaT values at birth/design epochs, recomputed exact88degree design dates,26activation arrays, and discrepancies.
- `historical-deltat/` preserved historical source distribution, source files, PyPI metadata, and manifest.
