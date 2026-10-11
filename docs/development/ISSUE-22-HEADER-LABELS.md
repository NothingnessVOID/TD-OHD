# Issue 22: paired-channel header labels

## Scope and source handoff

Base: `aee63103dec82bb262c88dbbd8adee785f9de607`.
Source commit: `0f4dbf1` (parent cherry-pick: `fafec30`).
Branch: `fix/issue22-header-labels`; isolated Vite: `http://127.0.0.1:19977`.
Dependencies and `public/engine` reuse the root checkout through junctions. No engine rebuild or source-engine changes.

Only `src/views/chart.js` and `src/styles.css` changed in the source commit. `renderChannelJump` conditionally wraps title + existing circuit badges in `.gate-detail-channel-header` for paired cards. Status remains a separate second row. Header uses natural flex-start, wrapping and an 8px horizontal gap. Existing paired padding, navigation, label/link styling, hover/focus, 30px desktop / 44px mobile or coarse-pointer targets remain. Separator declares `1.5px solid var(--border)`.

Center renderer output remains byte-identical when no paired gate exists. Full-channel rendering (#23), Penta, state, source identity, event handlers, navigation and engine are outside this source delta. No new component, token or translation was needed.

## Existing tests adapted

- `issue22-compact-e2e.mjs`: reuse previous final three-row results through optional `ISSUE22_COMPACT_BASELINE`; verify Center HTML/layout exactly, title + badges same-row fit or natural wrap, independent status row, token color, responsive targets, compact bounds, original badge sizes and full status comparisons. Height delta is explained by the old/new row maxima rather than the obsolete >=20px reduction against an older layout.
- `issue22-paired-visual-e2e.mjs`: assert the literal CSS declaration and compare computed width to a same-document 1.5px border probe. Compare separator color to resolved `--border`; retain original typography, geometry, accessible name and navigation checks.
- `issue22-channel-status-e2e.mjs`: add header fit and independent status-row assertions to existing birth/transits/timeline and production-model fixture coverage. Exact list/full text, class and computed-style comparisons remain.
- `issue22-23-details-e2e.mjs`: add an explicit opt-in `ISSUE22_QUICK=1` skin subset; preserve default full matrix and all existing business assertions.

All four retain default full test scope. This increment explicitly runs the quick subset only, with all three languages and viewport widths retained. Details keeps its historical 1380px desktop case; compact/visual/status use 1280/390/320. Quick compact/visual/details cover light, dark, high-contrast and midnight-contrast across the selected matrix; status retains its light/dark matrix. This is not an exhaustive all-skins/all-entry Cartesian run.

`ISSUE22_SCREENSHOTS=0` suppresses routine screenshots, without disabling failure evidence. Parent owns the small 9961 screenshot set and frontend build/audit. No screenshot bundle is committed here.

## Verification

Headless Microsoft Edge, Node 24.19.0, `ISSUE22_QUICK=1`, `ISSUE22_SCREENSHOTS=0`, isolated origin 19977:

| Suite | Result | Terminal |
| --- | --- | --- |
| compact | PASS 14 cases, 98 exact status comparisons, 2 pointer cases | `term_mv3wby67_56f82ef0` |
| paired visual | PASS 14 cases | `term_mv3wa8ks_161a25a7` |
| details | PASS 14 cases | `term_mv3waquo_7d6a91f9` |
| channel status | PASS 408 list/full comparisons, birth/transits/timeline + four production-model status fixtures | `term_mv3wci31_bcf7e5c9` |

Four `node --check` checks and `git diff --check` passed. Parent reported 60 audit tests passing and root integration `2c514e6`, plus frontend build, 23 locale tests, adjacent timeline/Penta checks and nine 9961 screenshots. Those parent results are reported handoff evidence, not rerun in this branch. Historical source approval projections are owned by the parallel parent audit; this branch does not update them or claim a full Node test-suite pass.

Evidence remains under `artifacts/issue22-header-labels/{compact/after,visual/after,status,details}` in this worktree. Compact baseline used `../issue22-final-layout/artifacts/issue22-final-layout/after/results.json`, the previous final three-row layout, with exact Center geometry/HTML comparison. Baseline matching remains mandatory.

For zh-CN/light Gate 20 in this isolated run: 1280px cards = 88px; 390px = 102px; 320px = 125.5px when header badges wrap. Relative to the three-row baseline these are -1.5px, -1.5px and +22px. Narrow wrapping is legitimate and remains bounded with no overflow. Parent's 9961 capture reported 10-20 fitting at 320px and the other two wrapping; fit is measured from actual widths, not assumed from viewport alone.

At DPR 1, Chromium computed a declared 1.5px border as 1px. The test checks the declaration separately and requires equality with a 1.5px browser probe, so DPR quantization does not cause a false failure.

The first compact/status attempts retained failure JSON and screenshots: a +1px fit tolerance incorrectly classified 248.797px of content as fitting in 248px. Tests now use a 0.02px layout-rounding tolerance; no source change was needed. Only affected failed suites were rerun.

## Reproduction

Set `E2E_URL=http://127.0.0.1:19977`, `CHROME_CHANNEL=msedge`, `ISSUE22_QUICK=1`, `ISSUE22_SCREENSHOTS=0`. Set each existing suite's evidence directory to a dedicated directory. For compact, set `ISSUE22_COMPACT_BASELINE` to the previous final three-row `results.json`; then run the four existing scripts with Node. Unset `ISSUE22_QUICK` for the unchanged full matrix, with matching full baseline data for compact.

No push, main merge, issue closure or deployment was performed.
