# Issue 27 — temporary Penta highlighting

Base: `f436587116ab605eb1d9ff1b50c333bd7c23cdcc`.
Branch: `fix/issue27-penta-highlight`.
Worktree: `C:/Users/Administrator/OH-WorkSpace/hanako-2/TD-OHD-worktrees/issue27`.

## Behavior and implementation

Hover temporarily emphasizes gates or a channel and its two endpoints. Opening details keeps the current object selected while the sheet is open. Close button, Escape, backdrop, API close and disposal clear `selectedTarget`, cached hover and graph `aria-pressed`. Shared dialog focus restoration remains unchanged; keyboard `focus-visible` remains visible after dismissal.

Pointer events distinguish touch from mouse/pen. Hover requires `any-hover: hover`, preventing no-hover devices from acquiring graph emphasis through compatibility/boundary events after a redraw. Pointerout/leave/cancel clear temporary emphasis. Opening or navigating details clears old hover so the new detail target wins. Language refresh clears cached hover while preserving an open detail's current selection. Repeated opening does not add duplicate history. Recreated renderers no longer inherit an old detail selection. The real `refreshTeamLanguage` path now refreshes the existing matrix instead of disposing it, preserving the open sheet and navigation history. When language rendering replaces a graph/card/shortcut trigger DOM node, the renderer locally restores focus to the same object identity on close; the shared controller remains untouched.

The selected CSS rules remain. Channel emphasis rules now follow base coverage styles so absent channels also receive the intended 4.5px temporary stroke; dash patterns and coverage symbols are preserved. Original gate activation, channel state and member focus paint are restored when temporary object emphasis ends. Member focus is independent of detail selection and survives team rerendering.

A pointer left over the graph can naturally generate a new pointerover after the sheet disappears. That remains valid hover: stored selection is null and ARIA is false; leaving the target restores the base paint. Tests distinguish this behavior from persistent selection.

## Owned/protected paths

Only these six files are changed in commit A:

- `src/views/penta-matrix.js`
- `src/styles/penta-matrix.css`
- `src/views/team.js` (parent-authorized expansion: two `renderResult` lines remove old selection propagation, and `refreshTeamLanguage` reuses the matrix; member highlight preservation unchanged)
- `tests/penta-card-hover-e2e.mjs`
- `tests/issue27-penta-highlight-e2e.mjs`
- `docs/development/ISSUE-27.md`

No calculation, knowledge, store, shared dialog, inventory, or frozen source-audit file changed. No push, merge, deployment, or Issue closure is performed. Parent owns the frozen source audit and its acceptance.

## Red / green evidence

All paths below are worktree-relative. Artifacts are intentionally ignored by Git and delivered separately.

1. Original `penta-card-hover-e2e.mjs` passed against the base, explicitly preserving left graph selection: `artifacts/issue27/baseline-old-test.log`.
2. Replaced its old assertion with the inverse plus ARIA verification, preserving the rest of the test. Before changing production code it failed with `3 !== 0`: `artifacts/issue27/before-fix-hover-failure.log`.
3. New lifecycle regression failed before the fix with `{kind: 'gate', id: '7'}` instead of null on dismissal: `artifacts/issue27/before-fix-matrix-failure.log`, `artifacts/issue27/before/1280-failure.json`, and `artifacts/issue27/before/1280-failure.png`.
4. Final run passed all 27 combinations: 1280 desktop / 320 touch / 390 touch × en / zh-CN / zh-Hant × default-light / default-dark / high-contrast. Evidence: `artifacts/issue27/after-matrix.log`, `artifacts/issue27/after/results.json`.

The matrix asserts computed SVG fill, stroke, width, dash pattern, opacity and member badge paint, not only CSS classes. It covers active/inactive gates, all four channel statuses, graph/card hover, actual taps, close/ESC/backdrop, graph and card Enter/Space, focus return/rings, gate/channel internal navigation/back, duplicate opening, live locale refresh while open and closed, cancellation, member focus and dispose/recreation. Open channel details explicitly require three selected elements (channel plus two endpoints) and one pressed graph control.

Intermediate diagnostics are under `artifacts/issue27/intermediate/`. An initial desktop screenshot-close assertion incorrectly treated legitimate new hover as stale selection. It was corrected to assert null selection/false ARIA immediately, then zero hover and restored paint after moving away. Touch still checks without moving the mouse. A separate mobile redraw case motivated the no-hover capability guard. The subsequent parent review found that real application locale refresh still recreated the matrix, and that renderer refresh detached the shared controller's original trigger. Both were fixed locally. The final 27-case matrix was rerun with a real application locale/history/focus case; the four existing browser passes and build below preceded this final localized refresh change.

## Final validation

- `node tests/issue27-penta-highlight-e2e.mjs`: 27/27 combinations plus real application `setLocale` passed. Desktop/mobile graph and analysis-card triggers preserve channel endpoints/history through three locales; Back and Escape restore the replacement trigger with focus-visible.
- `node tests/penta-card-hover-e2e.mjs`: passed desktop/mobile, inverse graph selection assertion, keyboard rings.
- `node tests/penta-direct-details-e2e.mjs`: passed graph/line/shortcut/card entry, scroll/focus return, three languages, four coverage symbols, mobile.
- `node tests/penta-phase1c-matrix-e2e.mjs`: passed synthetic coverage/provenance/member regression.
- `node tests/team-layout-dialogs-e2e.mjs`: passed, including both endpoints selected while channel details are open; real app 1440/1280/1024/430/390/320 layouts, three languages, all eleven skins. Logs at `artifacts/issue27/<test-filename>.log`; screenshots and observations at `artifacts/issue27/layout/`.
- `node --test tests/penta-structure.test.js tests/team-direct.test.js tests/team-activation.test.js`: 11/11 passed (`artifacts/issue27/unit.log`).
- `node node_modules/vite/bin/vite.js build`: passed (`artifacts/issue27/build.log`). Used existing WASM; did not run the engine build. Warnings remain for two preexisting runtime-resolved font CSS links and the large bundle chunk.
- `git diff --check`: passed.

Node v24.19.0, Chromium via Playwright. The 27-case test isolates the actual renderer/shared detail adapter with calculated fictional coverage; the four existing browser tests separately exercise application boot with the reused WASM. This is Chromium emulation, not physical mobile Safari/Android verification. No full-suite or frozen source-audit claim is made.

## Screenshot entry points

- Desktop restored graph: `artifacts/issue27/after/1280-en-default-light-closed.png`
- Desktop temporary hover: `artifacts/issue27/after/1280-en-default-light-hover.png`
- Desktop open details: `artifacts/issue27/after/1280-en-default-light-detail.png`
- 320px restored graph / touch details: `artifacts/issue27/after/320-en-default-light-closed.png`, `artifacts/issue27/after/320-en-default-light-detail.png`
- 390px restored graph / touch details: `artifacts/issue27/after/390-en-default-light-closed.png`, `artifacts/issue27/after/390-en-default-light-detail.png`
- Equivalent dark/high-contrast screenshots use the corresponding skin suffix.
- Actual app locale refresh keyboard return: `artifacts/issue27/after/app-1280-graph-locale-focus.png`, `artifacts/issue27/after/app-1280-card-locale-focus.png`, `artifacts/issue27/after/app-390-graph-locale-focus.png`, `artifacts/issue27/after/app-390-card-locale-focus.png`
- Actual app channel detail: `artifacts/issue27/layout/07-channel-dialog.png`
- Actual app 320px / 390px: `artifacts/issue27/layout/10-layout-320.png`, `artifacts/issue27/layout/10-layout-390.png`
- Actual app all-skin contact sheet: `artifacts/issue27/layout/14-skin-contact-sheet.png`

## Reproduction environment

Existing directories `TD-OHD/node_modules` and `TD-OHD/public/engine` were checked before creating local ignored junctions in the worktree. No install or engine regeneration was needed. Preview command:

```powershell
node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 19967 --strictPort
$env:E2E_URL='http://127.0.0.1:19967'
$env:CHROME_CHANNEL='chromium'
node tests/issue27-penta-highlight-e2e.mjs
```

Only loopback 19967 is used by this task. Parent-owned 9961 is untouched. Logs are UTF-8. The local server is left available for the parent's review.
