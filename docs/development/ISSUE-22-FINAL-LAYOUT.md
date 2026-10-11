# Issue 22: final three-row paired channel cards

Baseline: `7ff318ad5e68c353c64d8cb8226fac48a3244cc3`. Source commit: `3ce6f9d`. Worktree branch: `fix/issue22-final-layout`. Isolated preview: `127.0.0.1:19976`; dependencies and generated WASM reused through junctions. Parent owns 9961, build and independent source audit. No push, deployment, main merge or issue closure.

## Scope and implementation

Only paired gate channel cards change. Row one retains the channel button; row two adds a conditional `gate-detail-channel-meta` flex wrapper containing the original circuit badge group and the original status as siblings; row three retains the complete harmonic gate link. Center rendering produces identical HTML, including whitespace. Status calculation, localized text, full classes and navigation handlers are unchanged.

Existing styles and skin tokens are reused: 6px vertical card padding, 4px row gaps, metadata wrap with 8px horizontal gap, 1px solid `var(--border-subtle)` on the paired button. Desktop target is 30px; viewport <=600px OR coarse pointer independently requires 44px. Existing transparent background, zero padding, no shadow, secondary label, accent complete link and focus/hover styles remain. No new shared component or business mechanism is introduced.

## Before / after measurements

Gate 20, channels 10-20 / 20-34 / 20-57; fixed date 2026-10-01, fictional birth query 2000-05-10 12:30 UTC+8; Edge headless, 900px viewport height. All three cards had the same heights in each row below. Values are CSS pixels. Simplified/traditional Chinese match; light/dark Chinese match.

| Width | Locale | Before | After | Reduction | Metadata |
| --- | --- | ---: | ---: | ---: | --- |
| 1280 | zh-CN / zh-Hant | 125.5 | 89.5 | 36 | One row |
| 390 | zh-CN / zh-Hant | 125.5 | 103.5 | 22 | One row |
| 320 | zh-CN / zh-Hant | 125.5 | 103.5 | 22 | One row |
| 1280 | en | 125.5 | 89.5 | 36 | One row |
| 390 | en | 125.5 | 125.5 | 0 | Natural wrap |
| 320 | en | 149.5 | 149.5 | 0 | Natural wrap, circuit group also wraps |

Long English labels are allowed to increase line count; no forced cropping, overlap or negative gaps. Nonwrapping cases assert at least 20px reduction. Chinese desktop/mobile upper bounds are 92/106px. Status-to-hit gap is 6px for same-row Chinese; actual status glyph-to-paired-glyph distance can be 19.75px on touch layouts because the 44px target centers the text. The 4px structural row gap is asserted separately; there is no extra separator DOM or spacer row.

## Verification and evidence

Evidence stays in ignored local `artifacts/issue22-final-layout/` rather than committing screenshots/generated results.

- `before/results.json`: 43 baseline width/locale/skin cases, center HTML/layout and card metrics; light/dark sheet and three-card screenshots.
- `after/results.json`: 14 explicit quick combinations passed with 98 exact associated/full-channel status comparisons. Three widths, three locales, light/dark Chinese and desktop English high-contrast/midnight-contrast. Tests assert same-row when the measured widths fit, otherwise natural wrap; subtle border computed color equals a probe using the token; no overflow; original badge sizes; exact center HTML/layout; Enter/Space, focus-visible, hover, click/tap at target edge and Back.
- `visual/after/results.json`: 14 matching visual combinations passed. Accessible full paired labels, number/name accent equality, secondary label, 1px solid token border with other three borders zero, transparent background, no shadow/padding, focus and navigation preserved.
- `status/results.json`: 408 strict text/class/computed-style comparisons passed. Real birth, transits and timeline gate 20/37/57 entry points, birth-defined gate 24, plus production-model deterministic natal/completed/transit/inactive fixtures. Widths 1280/390/320 and all three languages; light/dark Chinese and light English/traditional Chinese in this run. Center legacy status assertions retained.
- `navigation/results.json`: existing issue22-23 script passed all 43 combinations, including inactive routing, keyboard/touch/Back/Escape/close and library lenses. Only the inactive status selector required equivalent relocation.
- `pointer/after/results.json`: two extra checks passed: 1280px with coarse pointer and 390px with fine pointer both produce three targets >=44px.
- Parent independently reported 9961 Chinese measurements matching 89.5/103.5px, reviewed 320px screenshots, build/localization/layout/Penta checks and the source scope audit passing. Those are parent results, not duplicate executions in this worktree.

The default compact and visual matrices remain 43 combinations. `ISSUE22_QUICK=1` explicitly selects the 14-case matrix used here. Status defaults retain both skins at all locales and extend prior coverage with 390px and gate 37; its quick mode selects the 408-comparison matrix used here. No assertion of full current 43-case visual/compact completion is made. Separate all-skin baseline and unchanged default matrices preserve later full runs.

## Reproduction

Start the isolated Vite server fresh after source editing. Set `E2E_URL=http://127.0.0.1:19976` and `CHROME_CHANNEL=msedge` in PowerShell. Capture baseline at the baseline revision using `ISSUE22_COMPACT_PHASE=before` and `ISSUE22_COMPACT_EVIDENCE_DIR=artifacts/issue22-final-layout`. Run the updated `tests/issue22-compact-e2e.mjs` with phase `after`, using the same evidence root. Set `ISSUE22_QUICK=1` for the explicit subset, or omit for default full coverage. Run `tests/issue22-channel-status-e2e.mjs`, `tests/issue22-paired-visual-e2e.mjs`, and `tests/issue22-23-details-e2e.mjs` with their corresponding evidence-dir environment variables. `ISSUE22_POINTER_ONLY=1` runs only the two pointer cases; use a separate evidence directory to preserve layout results.

## Observed failures and resolution

Initial post-edit module-based tests could not open details, while real gate clicks worked. Restarting this worktree's verified Vite process resolved the stale module-instance behavior without any source change. Failure screenshots/JSON remain local. The legacy Chrome default in issue22-23 failed because Chrome is absent; rerunning with installed Edge passed. Compact's former all-cards-shrink requirement was replaced by the requested nonwrapping-case requirement, with explicit natural-wrap geometry assertions. The centered glyph gap bound was corrected to include the metadata's 2px badge/status height difference and 1px separator; measured 19.75px is bounded by 20px. All failures are retained, not erased.
