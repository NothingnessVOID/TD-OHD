# Issue 22: compact associated channel cards

Source baseline: `cc6e58df080918a32979f40efa3a792047f0aca4`.
Source fix: `cd1fd4f47319a4b0a8bcbe170c5951d61b95f231`.
Isolated branch/worktree: `fix/issue22-compact`, `../TD-OHD-worktrees/issue22-compact`.
Test origin: `http://127.0.0.1:19975`; Node 24.19.0, headless Edge, 900px viewport height, reduced motion, frozen time `2026-10-01T06:31:21Z`, fictional birth query `?d=2000-05-10&t=12%3A30&tz=8`. External Google fonts blocked consistently; bundled fonts awaited. The isolated Vite server was restarted after source edits to retain a single warmed module identity.

## Minimal product change

Only cards containing `.gate-detail-paired-gate` become a one-column grid. This removes the anonymous title line box, uses 8px vertical padding, and keeps the existing 4px circuit-group margins and 10px card separation. Paired buttons retain a real 44px minimum target and zero padding, with their inline text centered by one flex child. No negative margins or overlapping targets.

The translated harmonic label stays secondary and smaller. Gate number, separator and vocabulary gate name share `.gate-detail-paired-gate-link`, `--accent`, weight 500 and a single hover/focus underline. Existing semantic button, accessible text, focus ring, event listeners, history, state and status markup are unchanged. The number/name spans remain available to existing tests. No arrow, button background or border was added.

Center callers do not contain paired controls and do not match the scoped grid rule. Full channel heading, timing, gate cards and Penta source are untouched. The existing badge renderer, semantic Skin tokens, translations, vocabulary and dialog navigation are reused; no component, token or status implementation was introduced. Parent integration owns the component inventory and 9961 build.

## Measured change

Gate 20, simplified Chinese, default light and dark: each table entry is an independently measured card; widths are viewport widths. The same geometry holds for traditional Chinese. English narrow-screen circuit badges retain their existing wrapping.

| Viewport | Channel | Before height | After height | Reduction |
| --- | --- | ---: | ---: | ---: |
| 1280 | 10-20 | 132.796875 | 125.5 | 7.296875 |
| 1280 | 20-34 | 132.796875 | 125.5 | 7.296875 |
| 1280 | 20-57 | 132.796875 | 125.5 | 7.296875 |
| 390 | 10-20 | 132.796875 | 125.5 | 7.296875 |
| 390 | 20-34 | 132.796875 | 125.5 | 7.296875 |
| 390 | 20-57 | 132.796875 | 125.5 | 7.296875 |
| 320 | 10-20 | 132.796875 | 125.5 | 7.296875 |
| 320 | 20-34 | 132.796875 | 125.5 | 7.296875 |
| 320 | 20-57 | 132.796875 | 125.5 | 7.296875 |

Each card is approximately 5.5% shorter; three cards save 21.890625px while retaining their 10px separation. This is a deliberately modest reduction that preserves the 44px target.

| Actual spacing (Chinese) | Before | After |
| --- | ---: | ---: |
| Title box → circuit badges | 5.796875 | 4 |
| Circuit badges → status box | 4 | 4 |
| Status box → paired hit box | 2 | 0 |
| Status box → first rendered text rect | 15.25 | 13.25 |
| Paired target height | 44 | 44 |
| Top / bottom card padding | 10 / 10 | 8 / 8 |
| Adjacent card gap | 10 | 10 |

The centered paired line box has 12.25px above and below it; rendered glyph rectangles differ by font metrics (13.25px above the first glyph rectangle). Forcing a 6–8px glyph gap would conflict with the preserved 44px target and centered one-line text. The implementation therefore removes the external 2px gap without overlapping status or shrinking the target. At 320px English, 10-20's paired label changes from two lines to one under the uniform 500 weight: its top text gap grows naturally while its card still shrinks from 156.796875px to 149.5px. The test distinguishes that line-count change from a spacing regression.

## Evidence and checks

Local evidence lives under `artifacts/issue22-compact/{before,after}`: matching `WIDTH-LOCALE-SKIN-sheet.png`, `*-rows.png` for light/dark, and aggregate `results.json` for all cases. After also records per-case `*-metrics.json`. Failed attempts remain as timestamped failure JSON/screenshots; they exposed a missing keyboard modality preparation and an overbroad assumption that centering a newly single-line label must reduce its top glyph distance. Those measurement assumptions were corrected without changing the fixed source.

The new compact test requires a matching baseline, records every gate-20 card height and internal gap, checks that every card shrinks, preserves exact circuit badge dimensions and center markup/layout, and checks no overflow, 44px targets, centered text, distinct cards, full-status text/classes/computed styles, keyboard Enter/Space, click/tap near the target bottom, Back, focus/hover underline and reset. Gates 20/37/57 cover all seven associated channels per visual case.

The old paired visual test keeps all 43 cases and full accessible names, 44px targets, transparent zero-padding buttons and overflow checks. Its intentional visual expectation changes are uniform accent/weight across number and name, complete link text and an underline asserted on the shared link container (CSS text decoration propagates visually to descendants without changing each child's computed decoration). The original `issue22-23-details-e2e.mjs` remains unchanged, including all 43 business cases.

Validation completed successfully:

- New compact test: 43 before cases, 43 after cases, 301 exact list/full status comparisons (gates 20/37/57, all their channels).
- Updated paired visual test: all 43 cases passed.
- Unchanged issue22-23 business suite: all 43 cases passed, including birth/transit/inactive navigation, full channel cards, keyboard/touch/Back/Escape/close and library lenses.
- Every one of the 129 measured gate-20 cards shrank, retained badge dimensions and stayed within the viewport. Center markup/layout matched baseline exactly in every case.

The long 372-comparison status suite was not repeated; the new compact test performs exact full-detail status comparisons, while the existing business suite retains active/inactive transit, real transit and selected activation navigation coverage. Parent owns full-title/timing and Penta regression and reports those checks passed, along with integration build and 23 localization tests. No push, main update, deployment or issue closure.

Reproduce after capturing baseline on the source baseline:

```powershell
$env:E2E_URL='http://127.0.0.1:19975'
$env:ISSUE22_COMPACT_PHASE='before'
node tests/issue22-compact-e2e.mjs
# Apply the source fix and restart Vite on the same loopback port.
$env:ISSUE22_COMPACT_PHASE='after'
node tests/issue22-compact-e2e.mjs
node tests/issue22-paired-visual-e2e.mjs
$env:CHROME_CHANNEL='msedge'
node tests/issue22-23-details-e2e.mjs
```
