# Wa UI convergence targeted acceptance

Status: **PREPARED / BROWSER NOT RUN**. This document is a preparation record, not product acceptance evidence.

## Ownership and source boundary

- Product baseline: `df45d2e`.
- Acceptance branch: `feature/wa-ui-convergence-acceptance`.
- Acceptance worktree starts at `b905028` in `../TD-OHD-worktrees/wa-ui-convergence-acceptance`.
- Owned additions: `tests/wa-ui-convergence-e2e.mjs` and this document only.
- Product truth: parent `TD-OHD`, branch `feature/penta-wa-integration-v1`, served at `http://127.0.0.1:9961`.
- `node_modules` is a junction to the parent's existing installation. No dependency installation or product modification.
- Parent uncommitted `src/views/wa.js`, `src/styles/wa.css`, `src/lib/wa/ui-messages.js` and convergence notes remain untouched.
- AGENTS.md and engineering standards were read before implementation. Explicit task instructions override the default push rule: **no push**.
- A/B/C/D sequencing remains parent-owned. Preparation observed B in progress; C/D were not assumed complete.

## Execution gate

The script refuses to import Playwright or contact HTTP unless all of these hold:

1. Parent explicitly confirms D frozen and root 9961 ready.
2. `WA_D_FROZEN=1` and `WA_9961_READY=1`.
3. The script's C/D `ADAPTER` is reconciled against frozen source and marked ready.
4. `WA_SOURCE_COMMIT` is the full frozen parent commit; parent branch and HEAD match, and `src` / `public` have no uncommitted changes.
5. Origin remains exactly `http://127.0.0.1:9961`.

No server is started, stopped or replaced. The isolated browser uses a new non-persistent context, so it does not seed a user's existing profile. Browser-side product imports always come from the parent origin. Vite `?raw` source is compared with the parent root bytes; served hashes and root HEAD are checked again at the end.

After parent authorization and adapter reconciliation, run from this worktree in PowerShell:

```powershell
$env:WA_D_FROZEN = '1'
$env:WA_9961_READY = '1'
$env:WA_SOURCE_COMMIT = '<full frozen parent SHA>'
$env:WA_ROOT_SOURCE = 'C:/Users/Administrator/OH-WorkSpace/hanako-2/TD-OHD'
$env:WA_EVIDENCE_DIR = 'artifacts/visual-review/wa-ui-convergence'
node tests/wa-ui-convergence-e2e.mjs
```

Setting environment flags alone does not authorize execution and does not bypass `ADAPTER.ready=false`.

## Independent oracle

The twelve fictional names, varied dates, birth times and Shanghai-location numeric inputs are transcribed from `wa-oc16-details-e2e.mjs`. People are labeled `虚构·…`. Each actual WASM `computeChart` result supplies exactly 26 original records: thirteen planets on each personality/design side. Validation checks planet uniqueness per side and gate/line ranges.

Expected gate holders, per-person duplicate suppression, original activation rows, channel status and unique participant totals are derived solely from these raw records. No `analyzeOC16`, `collectPair`, `extractTeamActivations`, product renderer or product computed result supplies expected data. Public vocabulary supplies only localized planet and source labels.

Twelve references are seeded; ten are initially assigned to Alpha plus three groups of three. The remaining two exercise replacement and adding. Marker numbers come from the complete saved twelve-reference array index + 1, and color slots cycle 1..5. Moving or unassigning a person never renumbers the expected map. Repeated real planet activations must have a fixture witness; the script will fail if none exists.

The parent's eight marker unit tests already cover the separate sixteen-person fixture. This task does not duplicate those tests or fabricate sixteen births for screenshots. Existing `wa-composer-e2e.mjs` retains stale/duplicate/annotation positive and negative cases; this script exercises the normal real configuration/save/reopen path without rerunning that whole suite.

## Nineteen acceptance groups

All rows below are **NOT RUN**, pending parent freeze, service readiness and adapter reconciliation.

| # | Check | Required evidence |
|---|---|---|
| 01 | Twelve real WASM seeds, 26 records each, ten initially assigned | Raw fixture and records in evidence JSON |
| 02 | Four on-page targets, one lightweight picker, no outer Apply/composer workspace | Organization and picker screenshots |
| 03 | Alpha replace, clear, restore | Marker/card/detail oracle after each change |
| 04 | All three groups add/remove/import, stable Wa identity | Oracle after each change, single-dialog checks |
| 05 | Shared person editor replaces picker and returns | Single operation dialog and restored search |
| 06 | Actual IDB save/reopen, refs-only data and unchanged People | Saved revision/schema and reopened exact data |
| 07 | Every core gate has exact people once; legend same number/name | SVG attributes, five slots, repeated-planet witness, geometry 45 at x180 / 21 at x306 / canonical 21-45 |
| 08 | Full organization, group A, group A + Alpha | Exact scope IDs, markers/cards/details |
| 09 | Membership removal, movement and replacement | Persistent pool numbers across assignments |
| 10 | Six cores always visible; other 26 expandable | Exact endpoint people and visible unique counts; no inline source rows/prose |
| 11 | All 32 channel and 64 gate details | Original P/D/planet/line/name records, Wa-only excerpt, original source ID/title |
| 12 | Shared detail shell and back/Escape/focus | Original trigger focus and document scroll preserved |
| 13 | 1440×1000 bounded sticky | Start, early natural scroll, middle sticky, past workspace bottom |
| 14 | 1280×640 short desktop sticky | Dynamic top formula, same bounded geometry, font measurements |
| 15 | 390/320 stacked phone layouts | No horizontal overflow; graph precedes results; measured SVG font sizes |
| 16 | Simplified/Traditional/English | Expanded visible-copy scan for all channels and gates; localized screenshots |
| 17 | Eleven skins, actual P/D badges | Birth tokens, border, bg-elevated, actual contrast ≥4.5; light/dark/high-contrast samples |
| 18 | Actual People birth replacement | Raw WASM changes, live detail freshness, graph/card/detail oracle updates |
| 19 | Frozen source and clean runtime | Root HEAD/source stability, served-source hashes, no page errors |

Sticky assertions require `position: sticky`, `top = floor(min(header height + 16, viewport height - graph-column height - 16))` within rounding tolerance, normal document scrolling and no trapping ancestor overflow. The graph bottom must remain within workspace bottom and leave with the workspace after the sticky interval. A temporary, test-only 2400px tail after the page allows scrolling past the region; it is removed in `finally`. Neither workspace height nor product CSS is modified to manufacture a passing sticky interval. A region too short to exercise real middle sticking is a failure, not silently skipped.

Phone marker font sizes are measured with SVG screen transforms and retained for the parent's visual review. The script does not invent a readability threshold or assert human approval based on positive dimensions.

Visible-copy checks include `门对`, `門對`, `支持门对`, `覆盖`, `覆蓋`, `不同成员共同覆盖`, `不代表正式`, `仅供参考`, `僅供參考`, `尚未证实`, `仅实验性`, English coverage/pair/supporting pair/disclaimer terms and representative English disclaimer phrases. Internal attributes and unchanged source JSON are not treated as visible copy. All reading folds are opened before copy checks.

## C/D contract reconciliation still required

The initial adapter intentionally fails closed. Confirm these from the final parent code rather than loosening assertions after failures:

- C visible unique-person count selector. Proposed placeholder: `[data-wa-contributor-count]`.
- C endpoint container structure. Current adapter expects a direct `.wa-detail-endpoints` container with `[data-wa-endpoint]` children containing `[data-wa-member]` labels.
- C core rows stay present and visible under collapsed departments; 32 rows become visible when all expand.
- D `.gate-detail-card.wa-reading-sheet`, public `[data-shared-back]` or compat `[data-wa-back]`, `.gate-detail-close`.
- D source article `[data-wa-reading-id]`, heading selector, source refs, explicit display-map attribute, and exact approved summary/detail excerpts for all three locales.
- Proposed department source mapping, to confirm: management `wa.communication.45-21`, competition `wa.communication.51-25`, direction `wa.communication.2-14`, interaction `wa.communication.59-6`, logic `wa.communication.27-50`, innovation `wa.communication.3-60`. The 26 additional channels cite their department's original source/title. Gate details are provisionally checked against their department's Wa source; reconcile with the frozen D contract.
- D display-map expected text must be independently reviewed and pinned in the test adapter, not copied from the DOM under test during execution. Source JSON must remain unchanged.
- Any selector reconciliation must preserve exact holder/activation/source/copy checks. Do not add force clicks, skip missing content, accept old personal prose or weaken expected counts.

## Evidence preservation and delivery

Each actual run creates a fresh timestamp-plus-commit directory. Existing output is never cleared or overwritten. Failures retain the failing case/stack, viewport screenshot, DOM, geometry, preceding screenshots, raw data and source hashes. No forced clicks or retries hiding a product failure.

Planned screenshot names include `1440-organization-edit.png`, `1440-lightweight-alpha-picker.png`, `1440-graph-markers-legend.png`, `1440-inline-channel-cards.png`, `1440-wa-45-21.png`, `1440-gate-45.png`, `1440-wa-54-32-department-source.png`, desktop sticky early/middle/past-bottom images, `1280x640-short-desktop.png`, `390-mobile-organization-graph.png`, `320-mobile-organization-graph.png`, corresponding mobile reading images, locale samples and source-badge samples.

These are **planned names only**. Actual screenshot filenames: **none**. No 9961 access occurred during preparation. Stage only real generated evidence after execution and report its exact filenames and unresolved failures. Stage the two new test files for the current preparation handoff. Final parent cherry-pick must contain tests only; no push.

## Checks completed during preparation

- `node --check tests/wa-ui-convergence-e2e.mjs`: PASS.
- `git diff --cached --check`: PASS for exactly the two newly added test files.
- Real browser tests, full suites, marker tests, skin tests and product builds: **NOT RUN**.
- Product acceptance status: **PENDING**. No claim of 19/19, skin contrast success, sticky correctness or screenshot review.
