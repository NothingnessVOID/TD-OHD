# Wa / OC16 redesign — preview iteration

## Baseline and acceptance boundary

Start: `5f7bf7326a21149e6f9b2079c022895a85f56443`, clean worktree and equal remote `feature/penta-wa-integration-v1`. The user rejected the previous product direction despite passing tests. This iteration prioritizes a usable interactive coverage tool, not a consultation/management workspace.

First delivery: direct Alpha selection, multi-select Penta participants, one-time import of saved Penta groups, automatic analysis, six-core-channel SVG, four pillars, six department statistics and contributor details. Update Windows 9961 and provide real-calculation desktop/mobile screenshots. Stop for interaction/visual acceptance before comprehensive regression or additional features.

## Preserve / hide / add

- Preserve: Team/Penta page, stable team/wa routes, PeopleStore and common person editor, Sharp calculation, existing activation extraction and Penta algorithm, Wa refs-only v1/v2, DB2, CAS and immutable revision history. No destructive migration.
- Hide from the main analysis page: member pool with assignment dropdowns, manual consultation/Gap/ally/edge/Powerbase forms, change comparison, primary revision/backup controls. Retain stored data and keep explicitly guarded historical restore/export in a secondary saved-organization interface.
- Add: isolated OC16 mapping and runtime coverage service; direct configuration editor/import; six actual core pairs with interactive gate nodes; four pillar markers; counts and complete pair provenance. No professional scores or formal Powerbase inference.

## Existing interfaces reviewed

`team-repository.js:listTeams()` returns teams with refs-only members and named groups. Imports use group member IDs only to resolve personId references, then establish Wa-local stable member IDs. Imports copy configuration once and never link repositories. Existing teams belong to the current website origin; Pages, Netlify and 9961 are independent.

`validateWaSnapshot()` already accepts incomplete drafts; `validateWaLayout()` distinguishes standard and observation readiness. New preview analysis may use a runtime-only observation projection after strict snapshot validation, without changing the saved layoutMode or established analysis API. Only assigned Alpha/group participants contribute; retained legacy pool references stay excluded and remain discoverable in the editor.

`prepareWaMembers()` validates real PeopleStore births and the full chart contract. Failure identifies members and produces no fabricated zero/partial success. All inputs are captured and generation-checked. `extractTeamActivations()` retains member, side, planet, gate and line provenance. Groups outside 3–5 people must not yield formal Penta calculations.

## OC16 reference contract

Source is the classification supplied in this redesign request (based on the user's OC16 Departments reference), not a claim of an official Powerbase algorithm. Core/display order:

| Department | Core | Supporting pairs | Gates / pairs |
| --- | --- | --- | --- |
| Management | 45–21 | 54–32, 44–26, 19–49, 37–40 | 10 / 5 |
| Competition | 51–25 | 10–34 | 4 / 2 |
| Direction | 14–2 | 61–24, 43–23, 8–1 | 8 / 4 |
| Interaction | 59–6 | 64–47, 11–56, 35–36, 30–41, 53–42, 29–46, 13–33 | 16 / 8 |
| Logic | 27–50 | 63–4, 17–62, 48–16, 18–58, 9–52, 5–15, 7–31 | 16 / 8 |
| Innovation | 3–60 | 38–28, 57–20, 39–55, 22–12 | 10 / 5 |

Exactly six departments, six core pairs, 26 supporting pairs, 32 canonical pairs, gates 1–64 each once. Four pillars are 60 Structure, 50 Safety, 6 Interaction, 45 Hierarchy. Personnel groups and functional departments are independent dimensions.

## Layout and interaction

Use shared panel/button/Skin vocabulary, public Operation/Detail Dialog lifecycle and native document scrolling. Desktop graph sticky; mobile stacked. Six independent core pair tracks use only actual endpoints and links, with pillar rings and the established Penta state-symbol vocabulary. No additional energy edges. Selected departments and gates reveal actual contributors; zero coverage remains visible when valid input produces it. Loading/errors are visually distinct from zero.

Every configuration commit updates results automatically. Person selection supports search, multi-select, cancel without commit, explicit duplicate conflicts and return from the shared person editor. Existing hidden annotations are copied intact; any edit that invalidates their references must be explicitly confirmed against the captured configuration. Old saved revisions remain immutable.

## Validation schedule

Before visual acceptance: mapping/coverage/configuration unit checks, build/startup, targeted browser interaction with varied fictional gates and actual WASM/IndexedDB, desktop/390/320 screenshots. No full legacy suite or broad audit re-pinning merely to approve an unaccepted UI. After acceptance: complete interaction matrix (three locales × 11 Skins), full regressions and immutable source-audit extension. Prior green UI evidence describes the old page, not this redesign.

## First preview delivered

Stage commits: `b6e0ffb` scope, `a9d642d` atomic configuration/import, `93d1760` OC16 data, `8291ea8` quick confirmation/Alpha replacement, `282c3f3` complete replacement presentation. Parent integrated source builds successfully; existing font-path and chunk-size warnings remain. The static bundle still excludes the private local account client.

The new workflow is: choose Alpha directly, select several people for a Penta or click a saved-group import, then inspect automatic results. Direct target edits confirm once; no member-pool staging, per-person assignment menus, layout-mode switch or Analyze button. The full editor remains available for editing several groups before one final commit. Mobile configuration folds to a concise name/leader/count summary.

Targeted data/configuration tests: 20/20 passed (14 OC16, 6 configuration). The isolated data task additionally passed the existing analysis/v2 compatibility checks (41 including its 14 new tests); no duplicate totals are claimed. Composer browser smoke covers default and quick workflows, origin notices, cancel, person-editor return, conflict rejection, stable IDs, hidden annotation cleanup and stale confirmations.

`wa-oc16-preview-e2e.mjs` passed against the real 9961 application with 12 explicitly fictional people of different dates/times. Real WASM outputs are independently reduced to gate sets in the test; each UI department count and every SVG endpoint is compared against that union for 1, 2, 3 and 10 participants, group-only/with-Alpha and Alpha replacement. For example, management coverage changes from 3/10 with one person to 5/10 with two; logic changes from 5/16 to 9/16. This is not a presence-only SVG/card test.

The same focused flow exercises one-time saved-Penta imports, duplicate conflict without mutation, keyboard pillar → pair → gate → Back/Escape, refs-only v1 save, annotated v2 reload, annotation retention on edits, immutable history restoration and an assigned missing-person error that turns stats into unknown rather than zero. Desktop editor/detail widths are checked against the generic narrow-dialog cap. Three focused samples cover zh-CN/default-light/390, zh-Hant/default-dark/320 and en/high-contrast/1280, plus 1440 desktop screenshots. Full 99-case matrix remains deferred.

Existing image export smoke `share-views-e2e.mjs` also passed: real PNG downloads for chart, transits, timeline, connection, Team/Penta and library, plus mobile timeline. No export implementation was changed or new export feature added.

Independent static review caught and verified fixes for group-only Alpha preference leaking into organization scope, startup autoload racing a new Save, and retaining pre-cleanup annotation snapshots. Temporary recovery copies are session-only and explicitly exportable; saved DB history is unchanged. The initial browser test failure was a harness call to `people.list` instead of exported `listPeople`; corrected without changing product assertions. Later visual inspection corrected generic `.modal` width inheritance.

Evidence is under `artifacts/visual-review/wa-oc16-preview/`: member-editor.png, configuration.png, six-core-channels.png, two-person-core-channels.png, six-departments.png, desktop-overview.png, 390/320/1280 samples, and coverage-evidence.json.

This is a user-acceptance candidate. No new professional formulas, no full regression/old UI guard re-pinning, no main merge, Issue closure or deployment. Source and tests from the old UI remain historical evidence; do not treat their old green results as approval of this redesign.
