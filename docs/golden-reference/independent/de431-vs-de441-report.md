# Independent DE431 / DE441 comparison

## Scope and source

- Existing official browser records: **47 records / 42 UTCs**. All 45 unified fixture inputs, expected activation arrays, and profiles agree with this input set.
- Independent engine: C Swiss Ephemeris 2.10.03 via pyswisseph, requested and returned flags258 (SWIEPH | SPEED), geocentric apparent tropical ecliptic longitude. Same engine/time-scale defaults and mapping for both file sets; only ephemeris files changed. Design date independently solved for exact 88-degree solar arc.
- Each path switch calls `swe.close()`; `get_current_file_data` verifies actual loaded path and DE number441 /431. Both planet and lunar files verified. No Moshier fallback (returned flags must equal requested flags).
- Historical DE431 pin: official aloistr/swisseph `b51a083390bf3cdc93a6ba466cbc83b846c4cfc4`, commit message "reverted to de431 version for now". Downloaded only to temporary storage. Source URLs/hash/header in `de431-source-manifest.json`.
- Installed DE441 files remain unchanged. This is independent C diagnostics; Jovian internal library, flags, ephemeris files, and time scale are still unknown.

## Comparison against all records

| Configuration | Sun pair matches | All26 Gate.Line matches |
| --- | ---: | ---: |
| DE441_C258 | 39/47 | 39/47 |
| DE441_C131330 | 37/47 | 37/47 |
| DE431_C258 | 40/47 | 40/47 |
| DE431_C131330 | 37/47 | 37/47 |

Repeated 2015 captures count separately. The seven mismatch UTCs are distinct; standard C258 with DE441 matches2/7, DE431 matches3/7. DE431 without the standard frame bias (C131330) matches0/7, as does the current Sharp baseline. Gate.Line agreement does not establish finer subdivisions or full Variable equivalence.

## Seven mismatch UTCs: standard C258

| ID | P Sun DE441 (degrees) | P Sun DE431 (degrees) | DE431 minus DE441 boundary time (ms) | Official Profile | DE441 Profile | DE431 Profile | DE431 all26 differences |
| --- | ---: | ---: | ---: | --- | --- | --- | --- |
| G1995-feb | 332.937499913408 | 332.937500002258 | -7.564 | 4/6 | 3/6 | 4/6 | none |
| G1995-jun | 90.125001166367 | 90.125001166532 | -0.080 | 3/5 | 3/5 | 3/5 | none |
| G2005-jul20 | 118.250000886840 | 118.250000957635 | -6.437 | 3/5 | 3/5 | 3/5 | none |
| G2015-tight | 305.749998702775 | 305.749998798612 | -8.127 | 5/1 | 4/1 | 4/1 | personality sun: 41.4 vs 41.5; personality earth: 31.4 vs 31.5 |
| G2015-feb | 315.124998644873 | 315.124998753260 | -9.254 | 3/5 | 2/5 | 2/5 | personality sun: 13.2 vs 13.3; personality earth: 7.2 vs 7.3 |
| G2025-tight | 300.124998880165 | 300.124998975665 | -8.127 | 5/1 | 4/1 | 4/1 | personality sun: 60.4 vs 60.5; personality earth: 56.4 vs 56.5 |
| G2025-mar | 355.437499881742 | 355.437499956170 | -6.437 | 4/6 | 3/6 | 3/6 | personality sun: 36.3 vs 36.4; personality earth: 6.3 vs 6.4 |

DE431 advances these boundaries by at most about9.3ms, leaving the four distinct2015/2025 cases mismatched. Their remaining time to the expected Personality Sun line boundary is:

| ID | Remaining advance needed vs DE431 C258 (seconds) |
| --- | ---: |
| G2015-tight | 0.102071464 |
| G2015-feb | 0.106255710 |
| G2025-tight | 0.086984038 |
| G2025-mar | 0.003822148 |

## Critical control and narrow boundary

- G2005-jul11 stays P53.4 / D42.1 / Profile4/1 under both standard C sets, with all26 activations matching official. All previously passing records remain passing under DE431.
- G1995-feb under DE431 is extremely close: P Sun332.937500002258degrees, only2.258e-9degrees beyond the55.4 boundary (about0.193ms using local solar speed). Fresh independent processes exactly reproduce both ephemeris outputs; timestamp JD equals Swiss `julday`; JD ULP is about40.23microseconds. It is valid for this fixed independentC calculation, and should not be described as a robust general engine equivalence result.
- Single global Mandala offset remains rejected for both file sets: DE431 C258 requires offset>3.874999463824494 and offset<=3.874998753259774, incompatible by7.1056472e-7degrees. Witnesses remain G2005-jul11 and G2015-feb.
- CurrentC default DeltaT values are identical between these DE441 /DE431 runs at the birth UTCs. Tidal acceleration defaults differ (DE441−25.936, DE431−25.8), but the audited modern epochs receive no DeltaT change.

## Artifacts

- `de431-vs-de441-comparison.json`: full47 records, 4 independent configurations, P/D exact longitudes, Profile, all26 Gate.Line, differences, source metadata, actual8787 capture comparisons where available.
- `de431-comparison-verification.json`: all45 unified input checks and fresh-process near-boundary verification.
- `de431-source-manifest.json`: historical official source URLs, hashes, and DE headers.
