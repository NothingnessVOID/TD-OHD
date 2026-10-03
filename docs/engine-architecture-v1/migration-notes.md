# Migration notes

Base: `feature/jovian-compatible-engine-v1` at `1add60c36b469e0d5dc84bd7ca38b0984a446363`. Working branch: `refactor/engine-architecture-v1`.

The former Node prototype combined input resolution, dispatch, native transport, mechanics host and historical identity. This branch extracts those responsibilities into `src/lib/engine/contract.js`, `src/lib/engine/api.js`, `scripts/lib/birth-engine-providers.mjs` and `scripts/lib/shared-mechanics-client.mjs`. `BirthEnginePrototype` remains the compatible entry point for CLI and validation callers, including its `mechanics` oracle bridge and exported helper names. The CLI script keeps its existing flags and default.

The shared interface is used by both local providers. The website continues using its existing `sharpProvider`; the new API is not connected to a Settings screen, selector, browser Jovian module or new production cache. C#, historical Swiss C, Python backend, ephemeris assets, Design solvers and HD algorithm implementation remain the existing implementations. Files stay in their established locations to preserve reviewable history.

## Local usage

Run from the repository root with .NET 10 and Node available. The Jovian path additionally needs Python, a prepared external historical runtime and its pinned assets.

```sh
node scripts/birth-engine-prototype.mjs --engine modern --utc 1994-07-12T04:56:37Z
node scripts/birth-engine-prototype.mjs --engine jovian-compatible --utc 1994-07-12T04:56:37Z --runtime /absolute/external/jovian-runtime
node scripts/birth-engine-prototype.mjs --engine both --utc 1994-07-12T04:56:37Z --runtime /absolute/external/jovian-runtime
node scripts/birth-engine-prototype.mjs --input '{"date":"1994-07-12","time":"12:56:37","timeZone":"Asia/Shanghai","precision":"second"}'
```

Omitting `--engine` selects Modern. `both` returns separate results; failure of either provider rejects the request, rather than silently substituting the other engine. `JOVIAN_RUNTIME`, `DOTNET` and `PYTHON` remain supported runtime configuration, as does Modern `epheRoot` through the Node constructor options. Historical third-party source/library/data stay outside Git.

The result gains explicit `engineId`, `contractVersion`, normalized precision/location metadata and common identity fields. Existing `raw`, `chart`, Jovian `astronomy` and historical metadata remain. The historical full integration signature changes when wrapper sources change; the astronomy identity remains independently inspectable. Consumers doing complete-envelope comparisons should distinguish metadata changes from numerical chart regressions.

## Validation gate

[validation.json](validation.json) records fresh Modern existing tests, Jovian-compatible tests, C2 numerical parity, negative controls, boundary controls, production build and unchanged chart payload evidence. Regression evidence must compare activation longitudes and Gate/Line/Color/Tone/Base plus chart mechanics, not only match a few displayed Gate.Line examples. Updating metadata must not conceal a numerical difference.

## Next scoped work

Browser integration requires its own approved implementation and regression scope. Preserve original C for historical astronomy; design a C/WASM host without Python, preserve exact source/data/time semantics and shared HD mechanics, validate boundaries, then resolve licensing/distribution requirements before public release. Only after the provider works in that environment should a selector expose it to users.

This branch is intended to be committed and pushed for review without merging main or deploying. Knowledge branches and the formal local service on port 8787 are outside this change.

## Reproduce this branch validation

Prepare the original C2 reference checkout/runtime using the pinned instructions in `docs/jovian-compatible-engine/README.md`. Set `JOVIAN_VALIDATION_OUTPUT=docs/engine-architecture-v1/regression` when running `npm run test:jovian-compatible` to preserve the prior prototype reports. For before/after comparison, extract `git archive 1add60c36b469e0d5dc84bd7ca38b0984a446363` to a fresh external directory, set `ENGINE_BASELINE_ROOT` to it, then run `node scripts/engine-architecture-validation.mjs`. It compares 97 UTC for both engines, records allowed envelope changes separately, and checks real default/both dispatch. Baseline astronomy uses the same verified Modern ephemeris bytes through an explicit epheRoot. Temporary baseline build products stay outside the three task worktrees.
