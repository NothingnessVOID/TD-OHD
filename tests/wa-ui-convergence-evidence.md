# Wa UI convergence acceptance — frozen b2b3019

**Result: 19/19 targeted browser groups PASS.** Actual Chromium, parent root `http://127.0.0.1:9961`, frozen product `b2b3019ad4071738ae4e73c8be08cdf56d198225`. Final acceptance run: `2026-10-13T12-37-33-452Z-b2b3019a`. No product changes, old-test changes, push, server replacement, full suite or product build by this task.

## Ownership and reproducibility

Acceptance branch `feature/wa-ui-convergence-acceptance`, worktree `../TD-OHD-worktrees/wa-ui-convergence-acceptance`, originally created from `b905028`. Only owned files are this document and `tests/wa-ui-convergence-e2e.mjs`. Existing parent node_modules is reused through a junction. Parent product was consumed read-only from root 9961; no stale worktree product imports. AGENTS and engineering standards were read first.

Parent explicitly authorized D freeze and 9961 readiness before execution. Script validates the full root commit, root branch `feature/penta-wa-integration-v1`, clean tracked `src/public`, served raw bytes against root source, and served hashes at completion. Author JSON bytes equal baseline `df45d2e`. Parent's untracked convergence documentation remains untouched.

```powershell
$env:WA_D_FROZEN = '1'
$env:WA_9961_READY = '1'
$env:WA_SOURCE_COMMIT = 'b2b3019ad4071738ae4e73c8be08cdf56d198225'
$env:WA_ROOT_SOURCE = 'C:/Users/Administrator/OH-WorkSpace/hanako-2/TD-OHD'
$env:WA_EVIDENCE_DIR = 'artifacts/visual-review/ui-convergence/final-b2b3019'
$env:WA_VISUAL_ONLY = '0'
node tests/wa-ui-convergence-e2e.mjs
```

`WA_VISUAL_ONLY=1` performs a separately labeled supplementary framing run with a new real-WASM seed and selected detail assertions. It reports `PASS_VISUAL`, never 19/19. Final changes after the complete acceptance run only added/refined this supplementary screenshot path. Final script passed syntax checking and supplementary execution.

## Independent oracle and adapted contracts

Twelve clearly fictional varied birth inputs are transcribed from `wa-oc16-details-e2e.mjs`; ten initially assigned, two retained references. Actual WASM `computeChart` produces 26 raw records per person, thirteen distinct planets on each P/D side. Gate and line ranges are validated. Expected holders, channel states, original activation rows and unique people counts are derived directly from raw records, never `analyzeOC16`, `collectPair`, product analysis or renderer results.

Number/color expectations derive from the full twelve-member snapshot array: index + 1 and index % 5 + 1. Actual repeated planetary activation at a core gate is required as a witness. Every marker gate/member/number and color class matches the independently derived current scope. Legend IDs, names and numbers match. Moving/unassigning/replacing Alpha retains pool numbering.

C is checked through `.wa-channel-card[data-pair-row][data-participant-count]`, `.wa-channel-people-count` visible count and `[data-channel-participants] [data-wa-member]` pure names. Marker `data-wa-marker-member` is never counted as a second person. Exact left/right endpoint holder IDs/names remain independently asserted. Six core cards stay visible collapsed; all 32 appear expanded. No activation source rows or long readings occur in the right column.

D uses `.gate-detail-card.wa-reading-sheet`, `.wa-channel-number`, public back with compatibility attribute, original activation attributes and pure h4 names. All 32 channel / 64 gate details use their department's Wa source. Each article retains original source ID/title/refs, `wa-reading-ui-v1`, exact paragraph indices and selected object identity. The test independently encodes reviewed paragraph choices and precise wording substitutions against baseline author JSON; it does not get expected excerpts from the DOM or the product presentation function. All fourteen source articles across three locales are additionally opened through the actual reading library and compared exactly.

## Completed acceptance groups

| # | Check | Result |
|---|---|---|
| 01 | Actual WASM twelve people, each 26 original records, ten assigned | PASS |
| 02 | Four on-page targets, one lightweight picker, no outer Apply/composer | PASS |
| 03 | Alpha replace/clear/restore; markers/cards/details after each | PASS |
| 04 | Each of three groups add/remove/import; stable IDs | PASS |
| 05 | Public person editor replaces picker, cancel restores search | PASS |
| 06 | Actual IDB save r2 and reload; refs-only members, unchanged People | PASS |
| 07 | Every core gate's exact distinct holders, stable colors/numbers, legend | PASS |
| 08 | Full organization, group A, group A + Alpha | PASS |
| 09 | Removal/move/replacement preserve pool numbers and current results | PASS |
| 10 | Six cores always visible, other 26 expandable, exact unique counts | PASS |
| 11 | All 32 channel/64 gate details: raw P/D/planet/line/name and Wa prose | PASS |
| 12 | Shared shell, Back once, Escape, original focus/document scroll | PASS |
| 13 | 1440×1000 natural scroll, middle sticky, bounded workspace exit | PASS |
| 14 | 1280×640 long-graph sticky and dynamic top | PASS |
| 15 | 390/320 stacked layout, no horizontal overflow, effective font metrics | PASS |
| 16 | Three-locale page/details copy; 14×3 library excerpts; original metadata | PASS |
| 17 | All eleven skins, actual P/D birth tokens/borders and contrast ≥4.5 | PASS |
| 18 | Actual birth replacement; missing-person natural copy, unknown, recovery | PASS |
| 19 | Frozen root/served source identity, no uncaught page errors | PASS |

The canonical `21-45` graph has gate 45 at x=180 and gate 21 at x=306, display order 45–21. Source records preserve P/D, planet and line without algorithm changes. For missing reference, `li[data-wa-issue="MISSING_PERSON_REFERENCE"]` includes the fictional name, visible copy excludes the code, gates/channels become unknown, old gate markers disappear, and restoring the person recovers consistent current data.

## Measured layout and color evidence

Sticky graph height in the tested expanded state: **1135.859375px**. The expected dynamic top is checked using `min(headerHeight + 16, innerHeight - graphHeight - 16)` within floor rounding tolerance.

| Viewport | Applied top | Middle graph bottom | Past-region behavior |
|---|---:|---:|---|
| 1440×1000 | -152px | 983.859375px | Graph bottom equals workspace bottom; top moves to about -331.92px |
| 1280×640 | -512px | 623.859375px | Graph bottom equals workspace bottom; top moves to about -691.92px |

Actual document scrolling is asserted at early/middle/past-bottom samples. Position must be sticky, ancestors cannot introduce a scroll container, and bottom cannot exceed workspace bottom. Only a temporary 2400px tail after the page provides scroll room; it is removed in finally. No workspace or product CSS is adjusted to manufacture a pass.

Minimum effective SVG marker fonts: desktop **11.91646px**, 390 phone **9.9px**, 320 phone **8.37215px**. Geometry and no-overflow assertions pass. **320 readability remains a parent visual-review item; automated PASS does not approve small typography.** Final unobstructed real-WASM graph crops are supplied for that review.

All eleven skins' actual personality/design badges match birth text tokens, birth border color and bg-elevated. Lowest measured ratio **4.503735875377304 (delve)**. Light **4.94114**, dark **5.25111**, high contrast **4.96356**. Full color records are in evidence.json. No custom-color/full skin suite rerun; the earlier eleven-skin tests remain separate evidence.

## Preserved runs and diagnostics

Evidence root, relative to acceptance worktree:

`artifacts/visual-review/ui-convergence/final-b2b3019/`

| Run directory | Status | Explanation |
|---|---|---|
| `2026-10-13T12-34-42-663Z-b2b3019a` | FAIL, zero cases | Harness source-identity import: JSON `?raw` served application/json. Diagnosed with HTTP headers/body; corrected to `?raw&import`. Failure viewport/DOM/JSON retained. No product failure concealed. |
| `2026-10-13T12-35-17-031Z-b2b3019a` | PASS 19/19 | First full targeted run, 30 screenshots. Retained before adding missing-person/library coverage. Also contains a labeled review crop derived from a real screenshot. |
| `2026-10-13T12-37-33-452Z-b2b3019a` | **PASS 19/19 final** | Includes missing-person/recovery, all 42 library readings and mobile gate45. 34 screenshots. |
| `2026-10-13T12-39-54-104Z-b2b3019a` | PASS_VISUAL | 28 supplemental images, selected real oracle checks. Tall element screenshots included fixed header crossing part of graph; retained, superseded for graph review below. |
| `2026-10-13T12-41-13-282Z-b2b3019a` | **PASS_VISUAL final framing** | 28 supplemental images. Graph/config are crops of unchanged full-page screenshot captured at document top, avoiding auto-scroll/fixed-header capture artifact. No CSS hiding or DOM edits. |

All runs remain intact. No force clicks, assertion weakening, discarded failure directories or product edits. Browser contexts are fresh nonpersistent contexts; actual user profiles and their IDB are untouched.

## Actual screenshots delivered

Final acceptance directory `2026-10-13T12-37-33-452Z-b2b3019a` contains these real files:

```text
1440-organization-edit.png
1440-lightweight-alpha-picker.png
1440-graph-markers-legend.png
1440-inline-channel-cards.png
1440-wa-45-21.png
1440-gate-45.png
1440-wa-54-32-department-source.png
1440x1000-sticky-early.png
1440x1000-sticky-middle.png
1440x1000-sticky-past-bottom.png
1280x640-sticky-early.png
1280x640-sticky-middle.png
1280x640-sticky-past-bottom.png
1280x640-short-desktop.png
390-mobile-organization-graph.png
390-mobile-wa-45-21.png
320-mobile-organization-graph.png
320-mobile-wa-45-21.png
1440-zh-CN-default-light-main.png
1440-zh-CN-default-light-gate-45.png
1440-zh-CN-default-light-21-45.png
1440-zh-CN-default-light-32-54.png
390-zh-Hant-default-dark-main.png
390-zh-Hant-default-dark-gate-45.png
390-zh-Hant-default-dark-21-45.png
390-zh-Hant-default-dark-32-54.png
320-en-high-contrast-main.png
320-en-high-contrast-gate-45.png
320-en-high-contrast-21-45.png
320-en-high-contrast-32-54.png
1280-default-light-source-badges.png
1280-default-dark-source-badges.png
1280-high-contrast-source-badges.png
missing-reference-unknown.png
```

Final framing directory `2026-10-13T12-41-13-282Z-b2b3019a` contains seven files for each exact prefix `1440x1000-zh-CN`, `1280x640-zh-CN`, `390x900-zh-Hant`, `320x900-en`:

```text
<prefix>-configuration-framed.png
<prefix>-graph-legend-framed.png
<prefix>-21-45-heading.png
<prefix>-21-45-Wa-prose.png
<prefix>-gate45-Wa-prose.png
<prefix>-32-54-heading.png
<prefix>-32-54-Wa-prose.png
```

Prefer these framed prose views when reviewing 45–21 and supporting 54–32: earlier viewport screenshots sometimes ended at the prose heading because activation lists consumed the viewport. Framed detail images scroll to the opened knowledge summary without modifying content. The 54–32 article visibly retains the original **45–21 Management** source title, as required.

## Remaining limits and checks

- No unresolved automated product failure in the final targeted run.
- Parent review remains required for 320 marker readability (~8.37px); no arbitrary new threshold was invented.
- Ten assigned real people exercised the browser. Sixteen-person overflow remains the parent's existing eight unit tests/synthetic visual fixture, not claimed as this task's real-WASM browser result.
- Old annotation stale/duplicate negative and positive suites were not rerun; retained parent composer tests cover them. Public person-editor cancellation/return is covered here; full editor mutation suite is not repeated.
- No full regression, product build or private-bundle build by this task. Parent-reported 39 unit/build results remain parent evidence.
- `node --check tests/wa-ui-convergence-e2e.mjs`: PASS; cached whitespace/diff-scope checks performed before final commit.
- Deliver source/evidence files plus the full evidence root, including the preserved initial harness failure. Only the two owned test files enter Git; screenshots and run artifacts remain outside the commit.
