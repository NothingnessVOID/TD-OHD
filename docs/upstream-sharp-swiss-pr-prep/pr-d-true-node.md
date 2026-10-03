# True Node apparent lunar light-time

Suggested PR title: `fix: preserve true node apparent lunar light time`

The osculating lunar-elements path keeps reception Moon samples where Swiss C refetches them at emission time. Refetch position and velocity for apparent Swiss/JPL requests while preserving reception coordinate rotations. The public adapter must also stop forcing TRUEPOS for True Node.

Correctness reference: unmodified Swiss Ephemeris C 2.10.03, commit `175e1fcb3108bcd5c0d146c803f51dcf23508012`, `lunar_osc_elem (sweph.c)`. No product mapping is part of the patch or oracle.

## Numerical evidence

25 comparisons, 5 controls. Maximum active longitude/time residual: before **10.5966545107 mas**, after **7.16227077646e-07 mas**. All assertions passed. Full values, speed residuals and source hashes are in [test-evidence.json](test-evidence.json).

Five TRUEPOS controls are exact vector matches. 24 synthetic source/speed/nutation/TRUEPOS combinations verify refetch epoch, raw velocity and no-speed zero output. Two adapter flag checks ensure TRUEPOS stays clear. Existing SPEED3 semantics are outside this pack.

## Scope and sequence

2 astronomy source files; 2 test files; 4 total files. Local commit `5cfcd43b3f246759e476fc7b607763a6038aabd8`. Patch: [0004-true-node.patch](0004-true-node.patch).

This exported patch is tested against parent `480a8474818c84fcd8b002112a0e53c665f2f739`. Submit as a stacked series in A, B, C, D order, or rebase the isolated fix with its validator and rerun numerical comparisons before proposing a different order. The fixes stay in separate commits; no combined product implementation is included.

## Validation command

```sh
python3 validation/compare.py --patch d --before 480a8474818c84fcd8b002112a0e53c665f2f739 --after 5cfcd43b3f246759e476fc7b607763a6038aabd8 --library "$SWISS_C_LIBRARY" --ephe "$SWISS_EPHE_PATH" --output evidence-d.json
```
