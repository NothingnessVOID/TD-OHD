# UTC / UT1 conversion

Suggested PR title: `fix: convert UTC DateTime through UT1 time-scale pair`

UtcToJulianDay(DateTime) constructs a calendar UTC clock JD and exposes it as UT1. Its inverse likewise bypasses leap-second and UT1 conversion. Route both methods through the existing Swiss time-scale conversion, retaining all DateTime ticks and explicitly rejecting an unrepresentable leap-second label.

Correctness reference: unmodified Swiss Ephemeris C 2.10.03, commit `175e1fcb3108bcd5c0d146c803f51dcf23508012`, `swe_utc_to_jd / swe_jdut1_to_utc (swephlib.c)`. No product mapping is part of the patch or oracle.

## Numerical evidence

6 comparisons, 1 controls. Maximum active longitude/time residual: before **0.514179468155 seconds**, after **0 seconds**. All assertions passed. Full values, speed residuals and source hashes are in [test-evidence.json](test-evidence.json).

The pre-1972 control is exactly unchanged. Five modern cases cover positive and negative DUT1. UTC round trips preserve UTC Kind and differ by less than 0.1 ms. DateTime cannot express second 60; the lower-level calendar API remains available.

## Scope and sequence

1 astronomy source files; 3 test files; 4 total files. Local commit `16aba0ebb5f64d64a6af8bd97f70184079ffb1f2`. Patch: [0001-utc-ut1.patch](0001-utc-ut1.patch).

This exported patch is tested against parent `342a57997c1b987e7949acc98897c8b73d05939a`. Submit as a stacked series in A, B, C, D order, or rebase the isolated fix with its validator and rerun numerical comparisons before proposing a different order. The fixes stay in separate commits; no combined product implementation is included.

## Validation command

```sh
python3 validation/compare.py --patch a --before 342a57997c1b987e7949acc98897c8b73d05939a --after 16aba0ebb5f64d64a6af8bd97f70184079ffb1f2 --library "$SWISS_C_LIBRARY" --ephe "$SWISS_EPHE_PATH" --output evidence-a.json
```
