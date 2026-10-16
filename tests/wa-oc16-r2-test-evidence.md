# Wa OC16 round 2 targeted acceptance

PASS against frozen product `4378db80af6a9795aec609370ae9412abdc1a7d2`, parent branch `feature/penta-wa-integration-v1`, Chromium at existing root `http://127.0.0.1:9961`, 2026-10-13. Only this note and `tests/wa-oc16-details-e2e.mjs` are owned changes. No product/old test edits, server creation, full suite, merge commit or push.

## Evidence

Output: `artifacts/visual-review/wa-oc16-details-r2/final-4378db8/`. `evidence.json` records frozen source, branch, raw oracle, scope IDs/counts, five-state witnesses, 22 Skin/custom color samples, actual computed RGB/contrast, graph geometry, lifecycle results and screenshot scope/viewport metadata. Screenshots cover 1440 organization; 1280 A, A+Alpha, management expansion, 45–21, gate45, multiple P/D; 390 simplified/light and 320 traditional/dark organization/A main+pair+gate; 1280 English/high contrast both scopes/details; 1280×640 page+viewport; missing-reference unknown. Fixed modal captures use viewport, not fullPage.

- 12 fictional varied births through actual WASM computeChart, each exactly 26 activation records. Ten assigned, two pool. Repository refs saved through actual API. Independent expected data reads raw chart gates, never product analysis/collectPair/extractor outputs.
- Seven scopes passed: whole organization, each of A/B/C alone and with Alpha. UI A=3, A+Alpha=4, global=10; every group change resets checkbox false. All 32 pairs/64 gates, department inline/detail rows, names, deduplicated counts, every planetary P/D source, self-complete and cross-member relationships checked. 45–21 display maps to canonical 21–45 sources exactly.
- Real witnesses: both organization 21–45; crossMemberOnly organization 32–54; hanging organization 6–59; absent A-alone 37–40; selfComplete A-alone 11–56. Repeated source: member5 gate54 has five records, personality earth/uranus/neptune plus design uranus/neptune.
- Eleven Skins × default/custom personality/design override passed. Labels equal actual computed source-birth text tokens; backgrounds equal bg-elevated; visible borders equal birth tokens; minimum observed contrast 4.5030725572. Four independent birth palettes remain unchanged under generic overrides.
- Actual keyboard Tab reaches final pair/gate knowledge summary; Enter expands/collapses and Tab cycles inside dialog. Nav computed static/horizontal and contained in sheet. Gate45 click succeeds. Back preserves open reading and scroll, Escape preserves original trigger DOM/focus and viewport scroll; selection footer names exact.
- 1280×640 graph width 390px, effective label font 15.17px and gate font 17.33px. Original viewBox 0 0 360 454 and node coordinates/radii unchanged. Mobile page/detail horizontal overflow assertions passed.
- People birth edit changes raw chart and all 32 pairs are revalidated. Missing referenced person yields MISSING_PERSON_REFERENCE, dash counts and unknown gate/pair state; restoring person returns ready. No uncaught page errors.

## Earlier failures retained

- `af14c04`: initial harness direct-child selector corrected for finalized left-member number-label wrapper, without weakening identity assertions. Seven scopes then passed; after a fullPage fixed-modal capture, gate45 click was intercepted. Switching detail screenshots to viewport removed reproduction. Original evidence remains in the parent output directory and `hanako-2/artifacts/wa-r2-af14-first-failure-evidence.json`.
- `f617416`: seven scopes passed; gate summary Tab escaped to BODY and nav inherited absolute positioning. Separate `final-f617416` contains failure screenshot and geometry. Parent fixed closed-fold hidden content and local nav CSS in 4378db8; public detail-dialog.js unchanged. Strict keyboard assertions subsequently passed.

## Reproduce

From acceptance worktree (root node_modules junction already available):

```powershell
$env:E2E_URL='http://127.0.0.1:9961'
$env:WA_SOURCE_COMMIT='4378db80af6a9795aec609370ae9412abdc1a7d2'
$env:WA_EVIDENCE_DIR='artifacts/visual-review/wa-oc16-details-r2/final-4378db8'
$env:CHROME_CHANNEL='chromium'
node tests/wa-oc16-details-e2e.mjs
```

`node --check` and `git diff --check` passed. Legacy v1/v2 preview/history tests, estimated-Alpha metadata tests and eventual full regression remain parent-owned; this targeted result does not claim full regression.
