# Team UI repair · 2026-10-10

## Scope

The rejected 301d826 preview is superseded on the development branch only. No main merge, PR publication, or production deployment is authorized by this work.

- `fix/team-selection-flow`: 81a56a9, compact selection, person create/edit, automatic analysis, save and management dialogs.
- `fix/team-layout-dialogs`: integrates that branch, replaces embedded readers with flat structural analysis and ordinary detail sheets, and completes viewport/integration polish.
- Preview delivery target: `dev/windows-development`, port 9961.

The SVG retains `viewBox="0 0 320 410"`. Desktop columns remain approximately 42/58, with one independent right scroll owner. Narrow screens use natural single-column scrolling. Empty selection is a catalog-only structural placeholder; three through five members calculate automatically.

Graph clicks locate the corresponding analysis row. Row titles and “查看详情” open the shared full dialog. Member focus only changes highlighting. All six channels and twelve gates remain present; activation records are grouped by member.

Team can be opened without a current personal birth chart. Changes to that global chart do not hide an independent Team/library workspace. Person, member and group identifiers and TeamRepository v2 are preserved.

Specialist gate/channel prose is shown only when `interpretationStatus === 'verified'`. Missing specialist prose is omitted; ordinary four-lens gate content remains unchanged. No Penta/Wa algorithms or invented role interpretations were added.

## Focused verification

Passed against the integrated worktree on 127.0.0.1:19960:

1. Actual browser selection/save flow: 0/1/2/3/5 members, five-person guard, search, editor create/edit, unknown time, ID/createdAt preservation, new/existing Team saves, move cancel/accept, deletion invalidation, revision conflict, Escape and mobile controls.
2. Actual browser layout/detail capture: independent entry without a global chart; six channels and twelve gates; gate order 31,8,33,7,1,13,15,2,46,5,14,29; independent scrolling; graph/row linkage; gate/channel dialogs; meridian lens; Escape and scroll restoration; member focus leaves totals unchanged.
3. Screenshots: 1440×960, 1280×720, 1024×768, 430×932, 390×844, 320×800, three languages and all eleven skins. No page errors or horizontal overflow were recorded. Screenshots were inspected separately from assertions.
4. `vite build` and `git diff --check`: passed. Existing large-chunk warning remains. This is a frontend build using existing WASM artifacts, not a fresh .NET engine rebuild.

A visual review caught an undersized diagram on short desktop windows. After removing empty status space and compacting short-window controls, its 1280×720 bounds changed from about 230×294 to 294×377. At 1440×960 with five members the diagram is about 444×569. Small-phone chips wrap into two columns while keeping 44px touch controls.

These are targeted checks, not a claim that the historical whole-site suite is green. Known platform/source-audit and ephemeris tolerance failures remain recorded in the prior handoff; their assertions were not weakened.

## Reproduce

Start the normal 9961 development server after the documented environment/build setup. Both scripts use isolated fictional browser profiles, not the user's saved browser library.

```powershell
$env:E2E_URL = 'http://127.0.0.1:9961'
node tests/team-selection-flow-e2e.mjs
$env:CHROME_CHANNEL = 'chromium' # use 'chrome' for an installed Chrome channel
node tests/team-layout-dialogs-e2e.mjs
```

The visual script accepts `PREVIEW_URL`, `E2E_URL`, `CHROME_CHANNEL`, and `SCREENSHOT_DIR`. Its default screenshot output is the ignored `artifacts/visual-review/final/` directory. Local review includes `observations.json` plus desktop/mobile/dialog images and a skin contact sheet. Research originals, extracted materials and private handoff indexes remain outside public Git history.
