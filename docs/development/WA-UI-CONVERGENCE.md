# Wa UI convergence

Baseline: `df45d2e763e0b5e297698cd1b703c27d257c8efc`, clean and equal to remote `feature/penta-wa-integration-v1` before work. Keep the current page skeleton, core calculation, Penta implementation, refs-only schema, DB2 and immutable histories. Implement sequentially: A on-page organization editing, B graph/member markers and bounded sticky, C quick channel/person cards, D Wa-specific reading in the shared detail shell.

## A — on-page editing

`15da6d0` replaces the outer organization composer with four visible page cards. Alpha can be changed/cleared; group members are separate removable chips; each group has direct add/import controls. Group names are editable on the page and Save sits next to organization name/status. The lightweight picker owns one target only. Switching selection/import replaces the same operation dialog, and the public person editor temporarily replaces the picker, then returns to its search/selection.

The pure `replaceWaSelection` contract remains unchanged. Direct removal only unassigns references and does not delete people. Invalidated annotations require a captured-snapshot confirmation and retain pre-change export copies; stored history is immutable. The rewritten composer E2E intentionally drops the obsolete outer-Apply workflow while preserving cancellation, conflict/duplicate rejection, identity, refs-only save, annotation history, stale confirmation, host rejection and person-editor-return assertions. Six existing configuration unit tests and that real-browser workflow passed.

## B — member-readable graph

`b905028` + `3c6c724` add one organization-wide marker map from the complete reference pool. Numbers stay stable across scope, group and Alpha changes; gate badges use actual `gateRecords.memberIds`, never the department aggregate. Existing Penta member-color tokens are reused. `75d9bba` enlarges narrow-screen badges to six columns and an adaptive viewBox, retaining both gate columns and all participants rather than a hidden +N. Final typography follow-ups `f1ad615` / `609271e` use 12.5px SVG text and a centered baseline, giving an actual 9.5138px label at 320px. Eight marker/layout tests passed, including 16 people, repeats, unknown data and bounds.

The graph stays a normal grid item with CSS sticky. Its top offset adapts to its actual height so a tall diagram first scrolls before sticking; the workspace containing block provides the natural end boundary. No fixed-position graph or nested analysis scroller.

## C — fast channel/person cards

`d5c91f1` makes each department's core channel immediately visible. Other channels expand in place. Each card shows channel number/name, left/right gates, exact member chips and a deduplicated participant total. No planetary source table or knowledge article is rendered in the right-hand cards. Interface copy uses active gates, complete channels and participating people; failure codes remain machine attributes rather than user-facing jargon.

## D — shared detail shell, Wa content

`b2b3019` switches the outer reader to the existing `gate-detail` / `gate-detail-card`, uses `renderDetailNavigation`, and keeps the public Detail Dialog lifecycle. Wa-specific scope, endpoint/member lists and P/D planetary sources remain first; reading follows in a disclosure. Source badges continue using birth-chart hue/readability tokens. Stage unit checks total 39 passing cases across configuration, markers, scopes, cards, sources and reading projection; this is targeted evidence, not a full regression.

The final-stage build and private-client bundle check passed. Existing font.css resolution and large-chunk warnings remain. The on-page editing browser flow was rerun on the final source and passed, including hidden-annotation history and stale/rejected confirmations.

## Content boundary

The six core channels each have an existing Wa article. The other 26 channels do not have independent Wa articles. Their details will cite their actual department's Wa theme with its original title/source identity, not relabel it as a unique article and not fall back to personal channel prose. Existing author records stay intact. UI reading excerpts may select original topic/example paragraphs and omit engineering/persistence notes; any display-only wording adjustment must be explicit, localized and tested against source identity, never reverse a limitation into a positive capability.

## Final targeted evidence

- Current selected unit tests: **39/39 pass**. Final static build and private-client exclusion check pass, retaining only the existing font.css and large-chunk warnings.
- The independent browser run on `b2b3019` passed **19/19 groups**: real WASM 12-person oracle, direct on-page editing and refs-only IDB, all 32 channels/64 gates, 42 localized Wa readings, stable actual gate markers, source details, natural copy, missing-person/unknown handling, responsive layout and bounded sticky.
- Actual sticky measurements covered 1440×1000 and 1280×640: the tall graph uses the measured negative top, then its bottom follows the workspace bottom at the end. No product CSS was changed to manufacture that test.
- Eleven registered Skin source badges matched actual birth tokens; minimum measured text contrast was 4.5037359. Source colors stay separate from member identity colors.
- Typography was improved after the functional pass. The e56b099 supplement initially failed an unchanged 0.5px bbox-position rule; a baseline-only correction then passed the final **72e2702 PASS_VISUAL** run. Four sizes, 164 real markers and all numbers 1–12 passed size/containment checks. The 320 effective font is 9.5138px; 390 has a maximum 0.350px rightward font-box extension within the existing tolerance. The final 32 screenshots were visually inspected. This is not presented as another full 19-group functional run.

Final screenshots: `artifacts/visual-review/ui-convergence/final-72e2702/2026-10-13T13-00-39-729Z-72e27025/`. Detailed run provenance, preserved failures and reproduction are in `tests/wa-ui-convergence-evidence.md`. Fresh browser contexts and explicitly fictional people were used; actual user profiles were not accessed.

There is no remaining failing product check in this targeted scope. Final full regression and historical frozen-UI audit adaptation are deferred until user acceptance; no full-regression claim is made. The original Wa analysis, OC16 catalog/analysis, model/schema/repository, author JSON, Penta/Team implementations, Sharp and shared Detail/Operation Dialog lifecycles remain byte-identical to the task baseline.

Only the existing feature branch is delivered. No automatic Alpha/Gap/Triggering/Powerbase calculation, new scoring, unrelated Penta fixes, main merge, Issue closure, Pages or Netlify deployment.
