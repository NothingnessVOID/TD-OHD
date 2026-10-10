# Team / Penta regression — 2026-10-10

Baseline: `8475a4a`, branch `release/team-regression`. Reused existing PID 24136 Vite at loopback `127.0.0.1:19964`, Node 24.19.0, existing Chromium/dependencies/WASM; no build. All owned E2E entry points now support E2E_URL and default to 19964. PREVIEW_URL remains a secondary compatibility override where previously supported.

Result: **13/14 E2E scripts pass; 1 product blocker; 31/31 related unit tests pass; zero skips added or used.** Release is not green. No product source or frozen scope/hash manifest changed. No push/main/PR/deploy/card update.

## Browser results

Counts are executed Node assert calls (loops included), measured by `artifacts/team-regression/count-assertions.mjs`. They are not scenario counts. Polish aggregates all size/overlap failures at the end so later scenarios still execute; its one failed assertion contains 16 failing measurements. Logs: `artifacts/team-regression/final-<script>.log`; earlier failure logs retained in the same directory.

| Script (tests/) | Result | count | pass | fail | skip |
|---|---|---:|---:|---:|---:|
| team-direct-e2e.mjs | PASS | 16 | 16 | 0 | 0 |
| team-layout-dialogs-e2e.mjs | PASS | 36 | 36 | 0 | 0 |
| team-phase1b-e2e.mjs | PASS | 34 | 34 | 0 | 0 |
| team-phase1b-grouping-e2e.mjs | PASS | 43 | 43 | 0 | 0 |
| team-phase1c-e2e.mjs | PASS | 168 | 168 | 0 | 0 |
| team-phase1c-polish-e2e.mjs | **FAIL** | 81 | 80 | 1 | 0 |
| team-phase1e-knowledge-e2e.mjs | PASS | 36 | 36 | 0 | 0 |
| team-selection-flow-e2e.mjs | PASS | 82 | 82 | 0 | 0 |
| team-ui-unification-e2e.mjs | PASS | 48 | 48 | 0 | 0 |
| penta-card-hover-e2e.mjs | PASS | 42 | 42 | 0 | 0 |
| penta-direct-details-e2e.mjs | PASS | 85 | 85 | 0 | 0 |
| penta-natural-scroll-e2e.mjs | PASS | 30 | 30 | 0 | 0 |
| penta-phase1c-matrix-e2e.mjs | PASS | 33 | 33 | 0 | 0 |
| shared-object-details-e2e.mjs | PASS | 42 | 42 | 0 | 0 |

## Product blocker for coordinator

Original >=44px hit-area standard retained. At 1280px, current-team and save buttons are ~40.375px high; manage is ~36.61x40.375; member focus is 36px high; remove is 28x36; add-person is 38px high. At 320/390px, manage remains ~36.61px wide (44px high). Evidence: `polish-all-checks.log` and final polish log. All remaining polish flows execute, including 11 actual skins, three locales, fresh mobile pages, add/remove/reload, keyboard detail/focus and three captures. Product CSS repair is outside this agent's ownership and was reported rather than weakening the assertion.

## Unit results

| Script (tests/) | Result | count | pass | fail | skip |
|---|---|---:|---:|---:|---:|
| team-activation.test.js | PASS | 3 | 3 | 0 | 0 |
| team-direct.test.js | PASS | 2 | 2 | 0 | 0 |
| team-members-phase1b.test.js | PASS | 7 | 7 | 0 | 0 |
| team-repository-v2.test.js | PASS | 4 | 4 | 0 | 0 |
| penta-catalog.test.js | PASS | 2 | 2 | 0 | 0 |
| penta-knowledge.test.js | PASS | 3 | 3 | 0 | 0 |
| penta-structure.test.js | PASS | 6 | 6 | 0 | 0 |
| shared-object-details.test.js | PASS | 4 | 4 | 0 | 0 |

`penta-matrix.test.js` does not exist. Frozen scope suites and full unit suite belong to coordinator, not omitted from the release plan; results above cover related behavioral units only.

## Coverage migration matrix

| Previous coverage / control | Current coverage / test |
|---|---|
| Advanced pool, individual add/assign, manual calculate; 2/3-member threshold | Explicit multi-select confirmation, 2-member placeholder, automatic 3-member 6-channel/12-gate result; phase1b |
| Duplicate identities, escaped team name, reference-only persistence/reload | Confirm existing selection without duplication, `<Team & friends>` text, schema/kind/no birth or chart blobs, stable member IDs after reload; phase1b |
| Unsaved quick-row validation and save-person boundary | Shared editor keeps invalid date/time drafts unsaved, profile count unchanged, saved person enters Penta only after selection confirmation; phase1b and grouping |
| Estimated noon; invalid timezone/date/missing-time/bad-time/out-of-range-zone before engine | Same five invalid inputs selected through current picker, zero engine requests, no result; noon notice/uncertainty retained; grouping |
| Eight-member team; 3+3, 3+4, 4+4, 3+5; cross-group duplicate blocking | Two current switcher groups with all four distributions, explicit move acceptance and cancellation, 8 identities/reference-only persistence, custom label/reload/locales; grouping |
| SVG topology/order, 3/5 groups, member highlight/all, A/B invalidation, edited birth invalidation | Same 12/6 topology and stable channel IDs, chip focus toggle, latest-group identities after rapid B/A, automatic recomputation after birth edit; phase1c |
| Keyboard persistent detail panel and scroll-to-card | Body-level independent sheet, gate/channel Enter, Escape returns trigger and exact scroll, no persistent active reading-card class; phase1c; direct-details/card-hover/natural-scroll retain full card/keyboard/touch/sticky coverage |
| Synthetic four states, partial gate, duplicate names, provenance and highlights | Five fixtures/four states asserted by state symbol plus class membership (hover class is orthogonal), source identities and Personality/Design lines, explicit matrix member-focus API; matrix |
| Penta knowledge nav/source/missing messages shown in old panel | Three verified background sheets with exact registry text in all three locales; 70/91 inventory; structural B2 and power-column J1/P1/P2 evidence verified in registry; gate/channel shared sheet omits missing specialist modules; phase1e |
| Six structural channel summaries always displayed | All six remain hidden while interpretation is missing. All six display in correct state → specialist → canonical order when verified; reject unreviewed record, unverified evidence, missing interpretation, unreviewed slot, unverified slot, blank slot; shared-object-details unit |
| Ordinary reference inventory/source regex | Same 64 gate/36 channel/64 knowledge categories, 70 ordinary/91 total identities and no Penta contamination; updated actual query(id)/qualifiedSummary/adapter boundary regex; penta-knowledge unit |
| Shared chart/library cleanup and same-source readings | Same context isolation/lenses/Back/Escape/disposal/cleanup assertions. Resolve live Vite timestamped chart/reference modules to avoid creating uninitialized duplicate singleton modules; shared-details E2E |
| Collapsible pool mobile/desktop, 11 skins/3 locales, 44px/non-overlap | Closed picker on entry/reload, explicit add/remove and expanded picker capture, actual skin settings, translated labels/state legend, same 44px/non-overlap standard across desktop/320/390; polish remains FAIL for actual sizes |

Tracked screenshot outputs produced by the baseline run were restored; selection-flow future captures go under ignored artifacts. No test file was deleted or skipped. Existing natural-scroll, card-hover, direct-details, layout and unification assertions stayed intact apart from URL support. `git diff --check` passes.
