# ICRS to J2000 frame bias

Suggested PR title: `fix: apply DE dependent ICRS to J2000 frame bias`

The body correction pipeline omits ICRS to J2000 bias before precession. Propagate the actual DE number from Swiss/JPL file headers and rotate both position and velocity unless ICRS is requested or the effective DE number predates 403. Moshier uses effective DE403 and unknown file metadata uses the C fallback DE431.

Correctness reference: unmodified Swiss Ephemeris C 2.10.03, commit `175e1fcb3108bcd5c0d146c803f51dcf23508012`, `app_pos_etc_plan and swi_get_denum (sweph.c)`. No product mapping is part of the patch or oracle.

## Numerical evidence

45 comparisons, 15 controls. Maximum active longitude/time residual: before **8.10898607142 mas**, after **0.0015208570403 mas**. All assertions passed. Full values, speed residuals and source hashes are in [test-evidence.json](test-evidence.json).

15 ICRS controls are byte-for-byte vector matches to the baseline. Synthetic tests cover DE402 skip, DE403 application, unknown metadata fallback, Moshier effective DE403 and position/speed rotation at J2000. A pre-existing Mercury residual remains below 0.01 mas; this patch does not repair unrelated planetary differences.

## Scope and sequence

5 astronomy source files; 2 test files; 7 total files. Local commit `106a812386534fc4773a49ccff6a2a6309a613d3`. Patch: [0002-frame-bias.patch](0002-frame-bias.patch).

This exported patch is tested against parent `16aba0ebb5f64d64a6af8bd97f70184079ffb1f2`. Submit as a stacked series in A, B, C, D order, or rebase the isolated fix with its validator and rerun numerical comparisons before proposing a different order. The fixes stay in separate commits; no combined product implementation is included.

## Validation command

```sh
python3 validation/compare.py --patch b --before 16aba0ebb5f64d64a6af8bd97f70184079ffb1f2 --after 106a812386534fc4773a49ccff6a2a6309a613d3 --library "$SWISS_C_LIBRARY" --ephe "$SWISS_EPHE_PATH" --output evidence-b.json
```
