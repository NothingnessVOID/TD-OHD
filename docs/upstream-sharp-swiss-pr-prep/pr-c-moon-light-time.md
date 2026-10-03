# Moon light-time Earth refetch

Suggested PR title: `fix: refetch emission Earth center for apparent Moon`

Geocentric Moon(t-delay) was lifted using Earth(t), introducing approximately 20 arcseconds in apparent longitude. Use Earth center(t-delay), subtract observer(t), use the Moon single range delay rather than planetary delay iteration, and retain raw velocities needed internally for no-speed requests.

Correctness reference: unmodified Swiss Ephemeris C 2.10.03, commit `175e1fcb3108bcd5c0d146c803f51dcf23508012`, `app_pos_etc_moon (sweph.c)`. No product mapping is part of the patch or oracle.

## Numerical evidence

25 comparisons, 5 controls. Maximum active longitude/time residual: before **20771.4502581 mas**, after **4.13365341956e-05 mas**. All assertions passed. Full values, speed residuals and source hashes are in [test-evidence.json](test-evidence.json).

Five TRUEPOS controls are exact vector matches. Synthetic guards distinguish Earth center from a topocentric observer and prohibit refetch under TRUEPOS. Numerical fixtures here use Swiss DE441 geocentric outputs; historical topocentric observer-velocity and SPEED3 differences are outside this pack.

## Scope and sequence

2 astronomy source files; 2 test files; 4 total files. Local commit `480a8474818c84fcd8b002112a0e53c665f2f739`. Patch: [0003-moon-light-time.patch](0003-moon-light-time.patch).

This exported patch is tested against parent `106a812386534fc4773a49ccff6a2a6309a613d3`. Submit as a stacked series in A, B, C, D order, or rebase the isolated fix with its validator and rerun numerical comparisons before proposing a different order. The fixes stay in separate commits; no combined product implementation is included.

## Validation command

```sh
python3 validation/compare.py --patch c --before 106a812386534fc4773a49ccff6a2a6309a613d3 --after 480a8474818c84fcd8b002112a0e53c665f2f739 --library "$SWISS_C_LIBRARY" --ephe "$SWISS_EPHE_PATH" --output evidence-c.json
```
