# Issue 22 — compact paired gate text

Base: `e8d07bbedf1b4cb96cfbb6b609e04151f26a45cb`.
Branch: `fix/issue22-paired-visual`.

## Change and scope

The paired gate button inside `renderChannelJump` now renders a lightweight text row without the `reference-link` border, background or padding. Its existing native button, `data-paired-gate`, translations (`Harmonic gate:`, `Gate {gate}`) and escaped `gateName()` remain intact. English, Simplified Chinese and Traditional Chinese terminology is unchanged. There is no arrow or additional accessible-name string.

Only `.gate-detail-paired-gate` and its descendant/state selectors change in CSS. The label is 12px secondary text, the gate number uses the existing accent at weight 500, and the name uses the normal text color at weight 600. The button inherits its font, keeps a real 44px minimum height, has zero padding/border and a transparent background, and reduces the top margin from 8px to 2px. Inline text can wrap naturally, including within a long name at 320px. Existing channel/circuit/status badge rules are untouched.

Hover on pointer devices underlines the gate number; keyboard focus adds the existing `--focus` token outline and the same underline. Both clear when the corresponding interaction ends. No persistent selected state is introduced.

Source scope is one button template in `src/views/chart.js` and the paired-gate CSS block in `src/styles.css`. Issue 23 channel cards, Penta, shared controllers, source/activation mechanics, navigation/history handlers, vocabularies and message catalogs are untouched. The parent owns component inventory, integration preview on 9961, build and scope audit.

## Validation and reproduction

Environment: Node 24.19.0, installed Edge through Playwright, isolated `http://127.0.0.1:19969`. The listener was checked to be loopback only. `node_modules` and `public/engine` are junctions to the main repository; no dependency install or engine build.

Start a fresh Vite process for each source revision when using direct module helpers in these tests. A warm server after editing `chart.js` caused the first after runs to time out opening a detail; restarting the isolated server resolved this without a product change. The initial visual focus check also needed a real Tab keyboard input before testing `:focus-visible`; programmatic focus following a click does not establish keyboard modality.

```powershell
node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 19969 --strictPort
# Before changing product source:
$env:ISSUE22_VISUAL_PHASE='before'
node tests/issue22-paired-visual-e2e.mjs
# After changing product source, restart the isolated Vite process:
$env:ISSUE22_VISUAL_PHASE='after'
node tests/issue22-paired-visual-e2e.mjs
$env:E2E_URL='http://127.0.0.1:19969'
$env:CHROME_CHANNEL='msedge'
node tests/issue22-23-details-e2e.mjs
node --check src/views/chart.js
git diff --check
```

The visual matrix covers 1280, 390 and 320 CSS px in all three languages. Desktop English covers all 11 registered skins; other width/language combinations cover default light, default dark, high contrast and midnight contrast (43 cases). Light/dark combinations save both full sheets and crops of all three gate-57 channel rows. Before images were recorded before product source edits.

The added test checks the complete native button accessible name, typography/theme-token hierarchy, transparent zero-border/zero-padding surface, actual 44px hit box (including click/tap near its bottom), wrapping and viewport bounds, original status badge dimensions against the before metrics, focus-visible outline, hover underline and clearing after mouse departure/blur. It exercises counterpart navigation and return as part of each after case.

The existing 43-case behavior suite remains intact. Only the paired-gate text assertion is adapted to spans and supplemented with per-span label checks. It still covers real birth/transit callbacks, inactive transit, 37→40 and 57→10/20/34, source/context/history preservation, locale redraw, selected birth activation, Issue 23 cards, keyboard/touch, Tab trap, Escape/close cleanup, center entry and library lenses.

Final results: before visual **43/43**, after visual **43/43**, existing behavior **43/43** passed. All 43 after cases compared original status badge dimensions successfully. Syntax checks and `git diff --check` passed. Manual screenshot review covered desktop light/dark and 390/320 mobile crops/sheets, including English wrapping and Traditional Chinese dark mode. The 44px button height remains intact while the top gap shrinks by 6px per channel row; no badge dimensions change.

Evidence stays in ignored artifacts rather than the commit:

- `artifacts/issue22-visual/before/results.json` and `after/results.json`: visual matrices and measured hit targets/badges.
- `artifacts/issue22-visual/{before,after}/{width}-{locale}-{skin}-{rows,sheet}.png`: light/dark screenshots, e.g. `320-en-default-light-rows.png`, `390-zh-CN-default-dark-rows.png`, `1280-zh-CN-default-light-rows.png`.
- `artifacts/issue22-visual/after/1280-en-default-{light,dark}-focus.png`: focused text crops (the crop excludes the outer outline).
- `artifacts/issue22-23/results.json`: preserved behavior matrix.

## Windows 9961 integration

Integrated visual source commit: `dc5fc87a2d2449b9a66923b63b842818fdeb810c` on `dev/windows-development`. The identified project Vite listener was restarted after source integration to avoid stale HMR module instances; preview remains `http://127.0.0.1:9961/` and `http://192.168.10.99:9961/`.

The same real-SVG capture script recorded Chinese gate 57 at 1280/390/320 before and after integration: `artifacts/issue22-visual/{before,after}/{width}-gate57.png`. Screenshots were staged for user comparison. Integrated Chromium Penta hover/card/graph selection cleanup, keyboard focus return and mobile tap regression passed, preserving Issue 27.

Local static frontend build, Pages bundle exclusion check and 23 localization tests passed. Existing font CSS runtime-resolution and large-chunk build warnings remain. The build is local only. Source changes outside the paired button template and CSS block remain guarded by the exact fixed visual audit layer; Issue 23 card markup and styling are unchanged.

Development branch delivery is authorized; main merge, issue closure and all deployment remain excluded. No terminology change was made: this entry uses the existing UI catalog rather than introducing a new Knowledge Term. Physical-device and non-Chromium verification, and a complete local all-feature suite, remain outside this visual pass.
