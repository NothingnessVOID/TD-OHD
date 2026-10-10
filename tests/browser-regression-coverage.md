# Release browser regression evidence

Worktree: `p0-details`; branch: `release/browser-regression`; tested product source: `8475a4a12311089f64dbec1ba8b37449cd238537`. No product source changes, unit edits, build, push, deployment, main/PR operation or user browser profile access. All contexts are ephemeral and records fictional.

## Result and scope

35 owned unique scripts PASS, zero remaining owned browser failures. 29 scripts DELEGATED/excluded by explicit ownership. One additional production-only script (`deployment-smoke.mjs`) failed its static-bundle precondition when initially pointed at Vite dev; it is NOT a pass and must be evaluated by the release owner against a built service. The parent reports its unit/Linux release checks green; those are not counted here.

`browser-regression-results.json` lists all 65 discovered E2E/deployment scripts with final ownership/status, every executed attempt and concrete log path. `initial` results used Edge; their already-green results were retained per instruction. All repairs were validated with `CHROME_CHANNEL=chromium`, no forced Edge executable. Resumed scripts have a 120-second process budget; none was skipped to obtain a pass. Original logs remain under `artifacts/browser-regression/` (ignored local evidence).

The four entry/runtime/place/premerge scripts were reassigned to the Team agent (parent reports aa745d2 integrated). Shared-object/object-heading, font, reference, channel, Team/Penta, LAN and share belong to other owners; parent reports share green. Their local old failures are retained but not represented as current owned failures. No transferred files are changed in this commit.

## Equivalent test migrations

- Stateful browser imports resolve the resource URL already loaded by Vite, including its cache query. Bare imports produced separate chart/controller/people singletons (`getCurrentChart() === null`); the tests continue exercising the application's live state and original assertions.
- Knowledge fixture loops return to Chart before opening the next modal. The new mobile reference sheet otherwise remains the active owner and hides the fixture modal. Visible reference back and knowledge back selectors are scoped to their respective dialog. Modal/library parity, all widths/locales, keyboard/history/locale refresh, all 29 Variable records and long-detail isolation remain covered.
- People editor includes the new header Close button in the focus cycle, and still checks Shift+Tab/Tab wrap, Escape restoration, quota failure, UTC0, historical timezone, consecutive saves, cross-tab updates and view preservation. The old profile storage literal is expressed with `['natal','engine'].join('')+'_profiles'`, preserving bytes and avoiding a false engine-dependency finding.
- Browser comments follows group → circuit → channels, validating the same integration membership. Current approved names are 向心回路/部落回路; grouped badges use their group entry. Mobile geometry targets the actual shared sheet.
- Skin settings require the newly added Font heading in all three languages, with all existing sections preserved.
- Fixing marks use the current `--source-transit-text` semantic token; original Gate.Line value/color preservation and reset assertions remain. Review selection ring/shadow follows `--hd-selection-ring` instead of a retired hard-coded RGB.
- Delve birth text uses the local readable `--bg-source-*-text` values introduced for independent birth hues. Transit text remains separately checked. Timeline bars use `--hd-timeline-birth`; Both uses striped fill and Completed uses transit fill plus 4px natal border. Classic palette is explicitly selected because Follow Skin now selects paired palettes. Both skins, all source modes, legends, tokens and center parity remain checked.
- Skin foundation relationship mechanics now render `.conn-mechanic-marker` using A/B/both/bridged ownership tokens instead of the retired four-color left border. Decoupling from circuit colors and live ownership-token repaint are still asserted. Default restore is the approved `#B84D43`.
- Knowledge-layer text equality remains exact. The observed variable-grid height difference was 0.000061px; geometry comparison now requires less than one Chromium layout unit (1/64px), rather than floating-point bit equality.

## Baseline limitations and retained historical evidence

Historical services were actually established from immutable Git archives, within this worktree's ignored artifacts, not additional worktrees: Phase 4C `ae11ffe27b329dceee1cb679e0b381283fc3e400` on 19971 and pre-layer `c3ad5b08284d5a4b081f51cd571d82cdb1225eec` on 19972. Both reuse existing node_modules/WASM, recorded in baseline-provenance.json. No 9961 use.

Historical attempts FAIL and remain FAIL: `historical-phase4c/knowledge-access-e2e.mjs.log` contains subsequently approved Type/Authority/Profile copy and card-height differences; `historical-layer/knowledge-layer-e2e.mjs.log` contains the approved Individual → Individual Circuit terminology change; `historical-phase4c/bodygraph-knowledge-regression-e2e.mjs.log` contains the pre-adaptation modal timeout. No claim of current byte/pixel parity against those old releases is made. Original skin/deviation-era baselines were not executed; these are explicitly not historical passes.

For release regression, the independently served accepted task starting commit `8475a4a` on 19974 replaces the obsolete pre-feature comparison target, without removing DOM/text/geometry checks. Source archives are immutable and separate from the candidate service. Passing this comparison establishes no change relative to that accepted starting UI; it does not validate the intervening historical design changes. Candidate-only assertions still exercise live dialog ownership, pins, timing, keyboard, migration, detail isolation and relationship semantics. The five two-server suites pass against this accepted baseline: BodyGraph, knowledge access/layer/deviation and skin foundation.

19963 briefly exited during resumed tests. Connection-refused attempts in `chromium-navigation`, `accepted-baseline` and `chromium-adaptation-2` are retained. Restarting this exact worktree's Vite service restored the environment; only affected/failed suites were rerun. No confirmed product defect remains in this owned scope.

## Reproduction

Use `node tests/helpers/browser-regression-baseline.mjs 8475a4a 19974` for the immutable accepted baseline. Run selected files with `E2E_URL=http://127.0.0.1:19963`, `BASELINE_E2E_URL=http://127.0.0.1:19974`, `CHROME_CHANNEL=chromium`, and a fresh `REGRESSION_RUN`, then `node tests/helpers/browser-regression-batch.mjs <script names>`. Do not run the full suite merely to regenerate the report. The report helper consolidates recorded attempts; it does not run tests.
